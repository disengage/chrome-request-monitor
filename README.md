# Chrome Request Monitor

Chrome extension (Manifest V3) that captures completed network requests for the active tab and shows them in a popup for quick filtering, copying, and domain breakdown.

## Features

- Capture completed requests per tab via `chrome.webRequest.onCompleted`
- Popup list of requests, newest first, with a method badge and the URL
- Click a request to copy its URL (toast: `Copies!!!`)
- Live URL filter
- Recent search chips (apply / delete)
- Last search is restored on open only if it still matches requests; otherwise the popup starts unfiltered
- **API Requests**, **Web Assets**, and **Error (5xx,4xx)** use the same swipe and **Back** control as a domain, and they respect the current URL filter
  - **API Requests** — XHR, WebSocket, and non-asset URLs under `/api`, `/graphql`, `/gql`, or `/vN`
  - **Web Assets** — scripts, styles, images, fonts, media, and those file types
  - **Error (5xx,4xx)** — completed requests with status 400–599
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
3. Use the URL filter, recent chips, or **API Requests** / **Web Assets** / **Error (5xx,4xx)** to narrow the list
4. Scroll to **By Domain**, click a domain to drill in, then **← Back** (the same Back control leaves a quick filter)
5. Use **Clear Logs** to wipe data for the current tab

## Project structure

```
├── manifest.json
├── background.js          # webRequest listener + storage
├── docs/
│   └── index.html         # privacy policy page
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
- `<all_urls>` (host permission) — required by `webRequest` to observe requests on any site

The extension does not inject content scripts into web pages.

## Privacy

All captured data stays in `chrome.storage.local` on your device; nothing is sent to the developer or any analytics service. See the [privacy policy](docs/index.html), which can be published with GitHub Pages from the `docs/` folder.

## Notes

- Data is scoped by `tabId` and cleared when the tab is closed
- Each request stores the URL, method, frame ID, status code, and resource type
- `chrome-extension://` URLs are ignored
- Favicons use Google’s favicon service for the request hostname
