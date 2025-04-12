const requests = [];

// Monitor all network requests
chrome.webRequest.onCompleted.addListener(
  (details) => {
    /*
    {
      "documentId": "8E9F1D2717DCB54934E877AA048579EC",
      "documentLifecycle": "active",
      "frameId": 0,
      "frameType": "outermost_frame",
      "fromCache": true,
      "initiator": "https://supjav.com",
      "ip": "104.22.1.244",
      "method": "GET",
      "parentFrameId": -1,
      "requestId": "2216",
      "statusCode": 200,
      "statusLine": "HTTP/1.1 200",
      "tabId": 1687690797,
      "timeStamp": 1744451634149.308,
      "type": "script",
      "url": "https://supjav.com/wp-includes/js/jquery/jquery-migrate.min.js?ver=1.4.1"
    }
    */
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
