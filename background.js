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
  { urls: ["<all_urls>"] }
);

// Clear logs on demand
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  let tabId = `${msg.tabId}`;
  if (msg.action === "clear" && tabId >= 0) {
    requests[tabId] = [];
    chrome.storage.local.remove(tabId);
  }
});

// Remove tab data when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabId = `${tabId}`;
  if (requests[tabId]) {
    delete requests[tabId];
    chrome.storage.local.remove(tabId);
    console.log(`Removed data for tabId: ${tabId}`);
  }
});

async function getAllStorageKeys() {
  const items = await chrome.storage.local.get(null);
  return Object.keys(items);
}

async function removeKeys(keys) {
  await chrome.storage.local.remove(keys);
  console.log(`Removed keys: ${keys}`);
}

function removeUnactiveTabs() {
  chrome.windows.getAll({ populate: true }, async (windows) => {
    let allTabIds = [];
    windows.forEach((window) => {
      // console.log(`Window ID: ${window.id} (Type: ${window.type})`);
      let tabIds = window.tabs?.map((tab) => `${tab.id}`);
      tabIds = Array.from(new Set(tabIds ?? []));
      allTabIds = [...allTabIds, ...tabIds];
    });
    allTabIds = Array.from(new Set(allTabIds));
    // console.log(`All Tab IDs: ${allTabIds}`);
    const keys = await getAllStorageKeys();
    // console.log(`Keys: ${keys}`);
    let diffKeys = keys.filter((key) => !allTabIds.includes(key));
    if (diffKeys.length > 0) {
      // console.log(`Diff Keys: ${diffKeys}`);
      await removeKeys(diffKeys);
      diffKeys.forEach((tabId) => {
        delete requests[tabId];
      });
    }
  });
}

// คอยดักฟังเหตุการณ์เมื่อมีหน้าต่างใหม่ถูกสร้างขึ้น
chrome.windows.onCreated.addListener((_) => removeUnactiveTabs());