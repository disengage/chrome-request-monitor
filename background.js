const requests = {};
const pendingWrites = new Map();
const WRITE_DELAY_MS = 250;
const HEADER_VALUE_LIMIT = 300;
const USEFUL_HEADERS = new Set([
  "content-type",
  "content-length",
  "content-encoding",
  "cache-control",
  "etag",
  "age",
  "expires",
  "last-modified",
  "date",
  "server",
  "location",
  "vary",
  "access-control-allow-origin",
  "x-cache",
  "x-request-id",
  "cf-cache-status",
]);

function pickHeaders(headers) {
  if (!Array.isArray(headers)) {
    return [];
  }
  const picked = [];
  headers.forEach((header) => {
    const name = String(header?.name || "").toLowerCase();
    const value = header?.value;
    if (!USEFUL_HEADERS.has(name) || typeof value !== "string" || value === "") {
      return;
    }
    picked.push({
      name,
      value: value.slice(0, HEADER_VALUE_LIMIT),
    });
  });
  return picked;
}

function scheduleWrite(tabId) {
  if (pendingWrites.has(tabId)) {
    return;
  }
  pendingWrites.set(
    tabId,
    setTimeout(() => {
      pendingWrites.delete(tabId);
      if (requests[tabId]) {
        chrome.storage.local.set({ [tabId]: requests[tabId] });
      }
    }, WRITE_DELAY_MS),
  );
}

// Monitor all network requests
chrome.webRequest.onCompleted.addListener(
  (details) => {
    console.log(`${details.method} - ${details.url} (${details.frameId})`);
    if (details.url.startsWith("chrome-extension:")) {
      return;
    }

    // Ensure the tabId is valid
    if (details.tabId >= 0) {
      let tabId = `${details.tabId}`;
      if (!requests[tabId]) {
        requests[tabId] = [];
      }
      requests[tabId].push({
        requestId: details.requestId,
        url: details.url,
        method: details.method,
        frameId: details.frameId,
        statusCode: details.statusCode,
        type: details.type,
        fromCache: details.fromCache,
        headers: pickHeaders(details.responseHeaders),
      });
      scheduleWrite(tabId);
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"],
);

// Clear logs on demand
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg.action === "clear") {
    clearRequests(`${msg.tabId}`);
  }
});

// Remove tab data when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabId = `${tabId}`;
  if (requests[tabId]) {
    clearRequests(tabId);
  }
});

function clearRequests(tabId) {
  clearTimeout(pendingWrites.get(tabId));
  pendingWrites.delete(tabId);
  delete requests[tabId];
  chrome.storage.local.remove(tabId);
  console.log(`Removed data for tabId: ${tabId}`);
}

async function getAllStorageKeys() {
  const items = await chrome.storage.local.get(null);
  return Object.keys(items);
}

function removeUnactiveTabs() {
  chrome.windows.getAll({ populate: true }, async (windows) => {
    let allTabIds = [];
    windows.forEach((window) => {
      let tabIds = window.tabs?.map((tab) => `${tab.id}`);
      tabIds = Array.from(new Set(tabIds ?? []));
      allTabIds = [...allTabIds, ...tabIds];
    });
    allTabIds = Array.from(new Set(allTabIds));
    const keys = await getAllStorageKeys();
    let diffKeys = keys.filter(
      (key) => /^\d+$/.test(key) && !allTabIds.includes(key),
    );
    if (diffKeys.length > 0) {
      diffKeys.forEach((tabId) => clearRequests(tabId));
    }
  });
}

// observe when a new window is created
chrome.windows.onCreated.addListener(removeUnactiveTabs);
