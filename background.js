const requests = [];

// Monitor all network requests
chrome.webRequest.onCompleted.addListener(
  (details) => {
    console.log(`${details.method} - ${details.url} (${details.frameId})`);
    if (details.url.startsWith("chrome-extension:")) {
      return;
    }
    requests.push(details);
    // chrome.storage.local.set({ requests: requests.slice(-100) }); // Keep last 100
    chrome.storage.local.set({ requests: requests }); // Keep last 100
  },
  { urls: ["<all_urls>"] }
);

// Clear logs on demand
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg.action === "clear") requests.length = 0;
});
