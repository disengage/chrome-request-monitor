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
      if (!requests[details.tabId]) {
        requests[details.tabId] = [];
      }
      requests[details.tabId].push(details);
      chrome.storage.local.set({ [details.tabId]: requests[details.tabId] });
    }
  },
  { urls: ["<all_urls>"] }
);

// Clear logs on demand
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg.action === "clear" && msg.tabId >= 0) {
    requests[msg.tabId] = [];
    chrome.storage.local.remove(msg.tabId.toString());
  }
});

// Remove tab data when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (requests[tabId]) {
    delete requests[tabId];
    chrome.storage.local.remove(tabId.toString());
    console.log(`Removed data for tabId: ${tabId}`);
  }
});
