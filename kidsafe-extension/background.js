const DEFAULT_SETTINGS = {
  apiBaseUrl: "http://localhost:4000",
  deviceToken: "",
  syncIntervalMinutes: 2
};

let cachedConfig = null;
let screenTimeBlocked = false;
let lastHeartbeat = 0;

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
    cachedConfig = data;

    const rules = Array.isArray(data.rules) ? data.rules : [];
    const dynamicRules = rules.map((rule) => buildRule(rule));

    // Add safe search redirect rules
    if (data.safeSearch) {
      let ruleId = 90000;
      if (data.safeSearch.google) {
        dynamicRules.push({
          id: ruleId++,
          priority: 2,
          action: { type: "redirect", redirect: { transform: { queryTransform: { addOrReplaceParams: [{ key: "safe", value: "active" }] } } } },
          condition: { urlFilter: "||google.com/search", resourceTypes: ["main_frame"] }
        });
      }
      if (data.safeSearch.bing) {
        dynamicRules.push({
          id: ruleId++,
          priority: 2,
          action: { type: "redirect", redirect: { transform: { queryTransform: { addOrReplaceParams: [{ key: "adlt", value: "strict" }] } } } },
          condition: { urlFilter: "||bing.com/search", resourceTypes: ["main_frame"] }
        });
      }
      if (data.safeSearch.youtube) {
        dynamicRules.push({
          id: ruleId++,
          priority: 2,
          action: { type: "modifyHeaders", responseHeaders: [{ header: "Set-Cookie", operation: "append", value: "PREF=f2=8000000; path=/; domain=.youtube.com" }] },
          condition: { urlFilter: "||youtube.com", resourceTypes: ["main_frame"] }
        });
      }
    }

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
  const condition = { resourceTypes: ["main_frame"] };
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
    action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
    condition
  };
}

async function sendHeartbeat() {
  const settings = await getSettings();
  if (!settings.apiBaseUrl || !settings.deviceToken) {
    return;
  }

  // Get active tab hostname
  let activeHostname = null;
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs && tabs[0] && tabs[0].url && !tabs[0].url.startsWith("chrome")) {
      activeHostname = new URL(tabs[0].url).hostname;
    }
  } catch (err) { }

  try {
    const response = await fetch(`${settings.apiBaseUrl}/api/extension/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-device-token": settings.deviceToken },
      body: JSON.stringify({ timestamp: Date.now(), hostname: activeHostname })
    });
    if (response.ok) {
      const data = await response.json();
      // Check screen time status
      if (data.screenTime && !data.screenTime.allowed) {
        screenTimeBlocked = true;
        blockAllPages(data.screenTime.reason);
      } else {
        screenTimeBlocked = false;
        unblockScreenTime();
        if (data.blockedSites && Array.isArray(data.blockedSites)) {
          blockSpecificSites(data.blockedSites);
        } else {
          unblockSpecificSites();
        }
      }
    }
    lastHeartbeat = Date.now();
  } catch (error) {
    console.warn("Heartbeat failed", error);
  }
}

async function blockSpecificSites(sites) {
  try {
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const siteRuleIds = existing.filter(r => r.id >= 100000 && r.id < 200000).map(r => r.id);

    if (sites.length === 0) {
      if (siteRuleIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: siteRuleIds });
      }
      return;
    }

    const newRules = sites.map((site, index) => {
      const blockedUrl = chrome.runtime.getURL(`/blocked.html?reason=${encodeURIComponent("Site time limit reached for " + site)}`);
      return {
        id: 100000 + index,
        priority: 9,
        action: { type: "redirect", redirect: { url: blockedUrl } },
        condition: { urlFilter: `||${site}`, resourceTypes: ["main_frame"] }
      };
    });

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: siteRuleIds,
      addRules: newRules
    });

    // Redirect any currently open tabs that match the blocked sites
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) continue;
        try {
          const tabHostname = new URL(tab.url).hostname;
          for (const site of sites) {
            // Match exactly or as a subdomain (e.g. www.instagram.com matches instagram.com)
            if (tabHostname === site || tabHostname.endsWith("." + site)) {
              const blockedUrl = chrome.runtime.getURL(`/blocked.html?reason=${encodeURIComponent("Site time limit reached for " + site)}`);
              chrome.tabs.update(tab.id, { url: blockedUrl });
              break;
            }
          }
        } catch (e) { }
      }
    });
  } catch (error) {
    console.warn("Specific site block failed", error);
  }
}

async function unblockSpecificSites() {
  try {
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const siteRuleIds = existing.filter(r => r.id >= 100000 && r.id < 200000).map(r => r.id);
    if (siteRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: siteRuleIds });
    }
  } catch (error) { }
}

async function blockAllPages(reason) {
  const blockedUrl = chrome.runtime.getURL(`/blocked.html?reason=${encodeURIComponent(reason)}`);
  // Add a dynamic rule to block all pages
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [{
        id: 99999,
        priority: 10,
        action: { type: "redirect", redirect: { url: blockedUrl } },
        condition: { urlFilter: "*", resourceTypes: ["main_frame"], excludedInitiatorDomains: [] }
      }]
    });

    // Redirect all currently open tabs (except extension and chrome pages)
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) continue;
        chrome.tabs.update(tab.id, { url: blockedUrl });
      }
    });
  } catch (error) {
    console.warn("Block all failed", error);
  }
}

async function unblockScreenTime() {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [99999]
    });
  } catch (error) {
    // ignore
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
    const response = await fetch(`${settings.apiBaseUrl}/api/extension/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-device-token": settings.deviceToken },
      body: JSON.stringify({ url, timestamp: Date.now() })
    });
    if (response.ok) {
      const data = await response.json();
      if (data.verdict === "blocked" && data.reason) {
        // Screen time or other block
      }
      if (data.redirectUrl) {
        // Safe search redirect
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.update(tabs[0].id, { url: data.redirectUrl });
          }
        });
      }
    }
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
  // More frequent heartbeat for screen time tracking
  chrome.alarms.create("kidsafe-heartbeat", { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "kidsafe-sync") {
    updateRules();
    sendHeartbeat();
  }
  if (alarm.name === "kidsafe-heartbeat") {
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
