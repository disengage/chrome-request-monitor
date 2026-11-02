# Chrome Request Monitor

Chrome extension (Manifest V3) that captures completed network requests for the active tab and shows them in a popup for quick filtering, copying, and domain breakdown.

## Features

- Capture completed requests per tab via `chrome.webRequest.onCompleted`
- Popup list of requests (`METHOD - URL`), newest first
- Click a request to copy its URL (toast: `Copies!!!`)
- Live URL filter
- Recent search chips (apply / delete; newest keyword auto-applied on open)
- Clear logs for the current tab
- Live title count of visible requests
- **By Domain** summary with request counts and favicons
- Click a domain to swipe into a filtered request list; Back returns to the main view
- Realtime updates while the popup stays open (`chrome.storage.onChanged`)

## Install (Load unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this project folder
5. Open any page, then click the extension icon to open the popup

## Usage

1. Browse normally — requests for that tab are recorded in the background
2. Open the popup to inspect the current tab’s requests
3. Use **Filter** or recent chips to narrow the list
4. Scroll to **By Domain**, click a domain to drill in, then **← Back**
5. Use **Clear Logs** to wipe data for the current tab

## Project structure

```
├── manifest.json
├── background.js          # webRequest listener + storage
├── content-script.js      # fetch logging helper
├── icons/
└── popup/
    ├── popup.html
    ├── popup.css
    └── popup.js
```

## Permissions

- `webRequest` — observe completed network requests
- `storage` — persist per-tab request logs and recent searches
- `activeTab` — resolve the current tab
- `<all_urls>` — monitor requests / load favicons across sites

## Notes

- Data is scoped by `tabId` and cleared when the tab is closed
- `chrome-extension://` URLs are ignored
- Favicons use Google’s favicon service for the request hostname
