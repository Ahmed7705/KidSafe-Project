const DEFAULT_SETTINGS = {
  apiBaseUrl: "http://localhost:4000",
  deviceToken: "",
  syncIntervalMinutes: 15
};

const form = document.getElementById("settings-form");
const status = document.getElementById("status");
const apiBaseUrlInput = document.getElementById("apiBaseUrl");
const deviceTokenInput = document.getElementById("deviceToken");
const syncIntervalInput = document.getElementById("syncInterval");

async function loadSettings() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  apiBaseUrlInput.value = settings.apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl;
  deviceTokenInput.value = settings.deviceToken || "";
  syncIntervalInput.value = settings.syncIntervalMinutes || DEFAULT_SETTINGS.syncIntervalMinutes;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const rawInterval = Number(syncIntervalInput.value);
  const interval = Number.isNaN(rawInterval)
    ? DEFAULT_SETTINGS.syncIntervalMinutes
    : Math.min(Math.max(rawInterval, 1), 60);
  const payload = {
    apiBaseUrl: apiBaseUrlInput.value.trim(),
    deviceToken: deviceTokenInput.value.trim(),
    syncIntervalMinutes: interval
  };
  await chrome.storage.sync.set(payload);
  try {
    await chrome.runtime.sendMessage({ type: "sync-now" });
  } catch (error) {
    // Ignore if the background worker is not ready.
  }
  status.textContent = "Saved and synced";
  setTimeout(() => {
    status.textContent = "";
  }, 2000);
});

loadSettings();
