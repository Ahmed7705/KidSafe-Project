const DEFAULT_SETTINGS = {
  apiBaseUrl: "http://localhost:4000",
  deviceToken: "",
  syncIntervalMinutes: 15
};

function normalizeInterval(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return DEFAULT_SETTINGS.syncIntervalMinutes;
  }
  return Math.min(Math.max(parsed, 1), 60);
}

async function getSettings() {
  const data = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...data };
}

async function updateRules() {
  const settings = await getSettings();
  if (!settings.apiBaseUrl || !settings.deviceToken) {
    return;
  }
  try {
    const response = await fetch(`${settings.apiBaseUrl}/api/extension/blocklist`, {
      headers: { "x-device-token": settings.deviceToken }
    });
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    const rules = Array.isArray(data.rules) ? data.rules : [];
    const dynamicRules = rules.map((rule) => buildRule(rule));
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const existingIds = existing.map((rule) => rule.id);
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingIds,
      addRules: dynamicRules
    });
  } catch (error) {
    console.warn("Failed to update rules", error);
  }
}

function buildRule(rule) {
  const condition = {
    resourceTypes: ["main_frame"]
  };
  if (rule.ruleType === "domain") {
    condition.urlFilter = `||${rule.pattern}^`;
  } else if (rule.ruleType === "keyword") {
    condition.urlFilter = rule.pattern;
  } else if (rule.ruleType === "regex") {
    condition.regexFilter = rule.pattern;
  } else {
    condition.urlFilter = rule.pattern;
  }
  return {
    id: Number(rule.id),
    priority: 1,
    action: {
      type: "redirect",
      redirect: { extensionPath: "/blocked.html" }
    },
    condition
  };
}

async function sendHeartbeat() {
  const settings = await getSettings();
  if (!settings.apiBaseUrl || !settings.deviceToken) {
    return;
  }
  try {
    await fetch(`${settings.apiBaseUrl}/api/extension/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-token": settings.deviceToken
      },
      body: JSON.stringify({ timestamp: Date.now() })
    });
  } catch (error) {
    console.warn("Heartbeat failed", error);
  }
}

async function logUrl(url) {
  if (!url || url.startsWith("chrome://") || url.startsWith("chrome-extension://")) {
    return;
  }
  const settings = await getSettings();
  if (!settings.apiBaseUrl || !settings.deviceToken) {
    return;
  }
  try {
    await fetch(`${settings.apiBaseUrl}/api/extension/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-token": settings.deviceToken
      },
      body: JSON.stringify({ url, timestamp: Date.now() })
    });
  } catch (error) {
    console.warn("Log failed", error);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  await chrome.storage.sync.set({ ...DEFAULT_SETTINGS, ...current });
  await updateRules();
  chrome.alarms.create("kidsafe-sync", {
    periodInMinutes: normalizeInterval(current.syncIntervalMinutes)
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "kidsafe-sync") {
    updateRules();
    sendHeartbeat();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && (changes.apiBaseUrl || changes.deviceToken || changes.syncIntervalMinutes)) {
    updateRules();
    const interval = normalizeInterval(
      changes.syncIntervalMinutes?.newValue || DEFAULT_SETTINGS.syncIntervalMinutes
    );
    chrome.alarms.create("kidsafe-sync", { periodInMinutes: interval });
  }
});

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.type === "main_frame") {
      logUrl(details.url);
    }
  },
  { urls: ["<all_urls>"] }
);

chrome.runtime.onStartup.addListener(() => {
  updateRules();
  sendHeartbeat();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "sync-now") {
    updateRules();
    sendHeartbeat();
    sendResponse({ status: "ok" });
  }
});
