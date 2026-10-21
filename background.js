const requests = {};

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
      requests[tabId].push(details);
      chrome.storage.local.set({ [tabId]: requests[tabId] });
    }
  },
  { urls: ["<all_urls>"] },
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
    let diffKeys = keys.filter((key) => !allTabIds.includes(key));
    if (diffKeys.length > 0) {
      diffKeys.forEach((tabId) => clearRequests(tabId));
    }
  });
}

// observe when a new window is created
chrome.windows.onCreated.addListener(removeUnactiveTabs);
