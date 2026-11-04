const list = document.getElementById("requests");
const domainList = document.getElementById("domain_requests");
const domainsEl = document.getElementById("domains");
const domainsSection = document.getElementById("domains_section");
const domainsToggle = document.getElementById("domains_toggle");
const input = document.getElementById("search_input");
const title = document.getElementById("title");
const statusText = document.getElementById("status");
const recent = document.getElementById("recent");
const pagerTrack = document.getElementById("pager_track");
const domainTitle = document.getElementById("domain_title");
const domainFavicon = document.getElementById("domain_favicon");
const titleText = `Network Requests`;
const LAST_SEARCH_KEY = "last_search";
const FIRST_CHUNK = 150;
const CHUNK_SIZE = 400;

var requests = [];
var currentTabId = null;
var activeDomain = null;
var domainsOpen = false;
var domainsDirty = true;
var renderTokens = new WeakMap();
var pendingRaw = null;
var refreshScheduled = false;

const copyToClipBoard = (text, callback) => {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      console.log(`Copies: ${text}`);
      callback && callback(true);
    })
    .catch((err) => {
      alert("Failed to copy text: ", err);
      callback && callback(false);
    });
};

function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function faviconUrl(hostname) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    hostname
  )}&sz=32`;
}

function normalizeRequests(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return [...raw].reverse();
}

function filterByKeyword(text) {
  if (text === "") {
    return requests;
  }
  return requests.filter((request) => request.url.includes(text));
}

function refreshMainViews() {
  updateDisplayByKeyword(input.value.trim());
  if (domainsOpen) {
    displayDomains();
  } else {
    domainsDirty = true;
  }
}

function applyRequestsFromStorage(raw) {
  requests = normalizeRequests(raw);
  refreshMainViews();
  if (activeDomain) {
    renderDomainRequests(activeDomain);
  }
}

function scheduleRequestsRefresh(raw) {
  pendingRaw = raw;
  if (refreshScheduled) {
    return;
  }
  refreshScheduled = true;
  requestAnimationFrame(() => {
    refreshScheduled = false;
    applyRequestsFromStorage(pendingRaw);
    pendingRaw = null;
  });
}

function saveSearch(text, matchCount) {
  if (text !== "" && matchCount > 0) {
    chrome.storage.local.set({ [LAST_SEARCH_KEY]: text });
  } else {
    chrome.storage.local.remove(LAST_SEARCH_KEY);
  }
}

function applySearch(text) {
  const count = updateDisplayByKeyword(text);
  saveSearch(text, count);
}

document.getElementById("clear").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      const tabId = tabs[0].id;
      requests = [];
      clearDisplay(list);
      updateTitle(0);
      displayDomains();
      showMainPage();
      chrome.runtime.sendMessage({ action: "clear", tabId: tabId });
    }
  });
});

document.getElementById("domain_back").addEventListener("click", () => {
  showMainPage();
});

function setDomainsOpen(open) {
  domainsOpen = open;
  domainsSection.classList.toggle("is-open", open);
  domainsToggle.setAttribute("aria-expanded", open ? "true" : "false");
  list.classList.toggle("is-hidden", open);
  if (open && domainsDirty) {
    displayDomains();
  }
}

domainsToggle.addEventListener("click", () => {
  setDomainsOpen(!domainsOpen);
});

setDomainsOpen(false);

function onRequestClick(event) {
  const item = event.target.closest(".request-item");
  if (!item) {
    return;
  }
  copyToClipBoard(item.getAttribute("data-url"));
  displayStatus("Copies!!!");
  addKeywordToRecent(input.value);
}

list.addEventListener("click", onRequestClick);
domainList.addEventListener("click", onRequestClick);

input.addEventListener("input", (event) => {
  applySearch(event.target.value.trim());
});

async function init() {
  const [tabs, prefs] = await Promise.all([
    chrome.tabs.query({ active: true, currentWindow: true }),
    chrome.storage.local.get(["recent_search", LAST_SEARCH_KEY]),
  ]);

  const recentSearch = (prefs["recent_search"] || []).reverse();
  displayRecentSearch(recentSearch);

  if (tabs.length === 0) {
    return;
  }
  currentTabId = tabs[0].id;
  const tabKey = currentTabId.toString();
  const data = await chrome.storage.local.get(tabKey);
  requests = normalizeRequests(data[tabKey]);

  const lastSearch = prefs[LAST_SEARCH_KEY] || "";
  input.value = lastSearch;
  const count = updateDisplayByKeyword(lastSearch);
  if (lastSearch !== "" && count === 0) {
    input.value = "";
    chrome.storage.local.remove(LAST_SEARCH_KEY);
    updateDisplayByKeyword("");
  }
  domainsDirty = true;
}

init();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || currentTabId == null) {
    return;
  }
  const tabKey = currentTabId.toString();
  if (!changes[tabKey]) {
    return;
  }
  scheduleRequestsRefresh(changes[tabKey].newValue);
});

function clearDisplay(target = list) {
  renderTokens.set(target, {});
  target.replaceChildren();
}

function displayStatus(text) {
  statusText.innerText = text;
  statusText.setAttribute("alt", "success");
  statusText.classList.add("fade-out");
  setTimeout(() => {
    statusText.innerText = "";
    statusText.removeAttribute("alt");
    statusText.classList.remove("fade-out");
  }, 1000);
}

function methodBadgeClass(method) {
  const m = String(method || "").toUpperCase();
  switch (m) {
    case "GET":
      return "method-badge method-get";
    case "POST":
      return "method-badge method-post";
    case "PUT":
      return "method-badge method-put";
    case "PATCH":
      return "method-badge method-patch";
    case "DELETE":
      return "method-badge method-delete";
    case "OPTIONS":
      return "method-badge method-options";
    case "HEAD":
      return "method-badge method-head";
    default:
      return "method-badge method-other";
  }
}

function createRequestItem(req) {
  const item = document.createElement("div");
  item.classList.add("request-item");
  item.setAttribute("data-frame-id", req.frameId);
  item.setAttribute("data-url", req.url);
  item.setAttribute("data-method", req.method);

  const badge = document.createElement("span");
  badge.className = methodBadgeClass(req.method);
  badge.textContent = String(req.method || "?").toUpperCase();

  const url = document.createElement("span");
  url.classList.add("request-url");
  url.textContent = req.url;

  item.appendChild(badge);
  item.appendChild(url);
  return item;
}

function buildFragment(items) {
  const fragment = document.createDocumentFragment();
  items.forEach((req) => fragment.appendChild(createRequestItem(req)));
  return fragment;
}

function renderRequestList(target, items) {
  const token = {};
  renderTokens.set(target, token);
  target.replaceChildren(buildFragment(items.slice(0, FIRST_CHUNK)));

  let index = FIRST_CHUNK;
  const appendNextChunk = () => {
    if (renderTokens.get(target) !== token || index >= items.length) {
      return;
    }
    target.appendChild(buildFragment(items.slice(index, index + CHUNK_SIZE)));
    index += CHUNK_SIZE;
    setTimeout(appendNextChunk, 0);
  };
  setTimeout(appendNextChunk, 0);
}

function displayEmpty(target = list) {
  const item = document.createElement("div");
  item.classList.add("empty_result");
  item.textContent = `No Result`;
  target.appendChild(item);
}

function aggregateDomains(source) {
  const map = new Map();
  (source || []).forEach((req) => {
    const host = getHostname(req.url);
    if (!host) {
      return;
    }
    if (!map.has(host)) {
      map.set(host, { hostname: host, count: 0, firstUrl: req.url });
    }
    map.get(host).count += 1;
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function displayDomains() {
  domainsDirty = false;
  domainsEl.replaceChildren();
  const domains = aggregateDomains(requests);
  if (domains.length === 0) {
    const empty = document.createElement("div");
    empty.classList.add("domains-empty");
    empty.textContent = "No domains yet";
    domainsEl.appendChild(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  domains.forEach((domain) => {
    const row = document.createElement("div");
    row.classList.add("domain-row");
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");

    const img = document.createElement("img");
    img.src = faviconUrl(domain.hostname);
    img.alt = "";
    img.width = 16;
    img.height = 16;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      img.style.visibility = "hidden";
    });

    const name = document.createElement("span");
    name.classList.add("domain-name");
    name.textContent = domain.hostname;
    name.title = domain.hostname;

    const count = document.createElement("span");
    count.classList.add("domain-count");
    count.textContent = String(domain.count);

    row.appendChild(img);
    row.appendChild(name);
    row.appendChild(count);

    const open = () => showDomainPage(domain.hostname);
    row.addEventListener("click", open);
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });

    fragment.appendChild(row);
  });
  domainsEl.appendChild(fragment);
}

function renderDomainRequests(hostname) {
  const filtered = (requests || []).filter(
    (req) => getHostname(req.url) === hostname
  );
  if (filtered.length > 0) {
    renderRequestList(domainList, filtered);
  } else {
    clearDisplay(domainList);
    displayEmpty(domainList);
  }
  domainTitle.textContent = `${hostname} (${filtered.length})`;
  domainFavicon.src = faviconUrl(hostname);
  domainFavicon.hidden = false;
  domainFavicon.onerror = () => {
    domainFavicon.hidden = true;
  };
}

function showDomainPage(hostname) {
  activeDomain = hostname;
  renderDomainRequests(hostname);
  pagerTrack.classList.add("show-domain");
}

function showMainPage() {
  activeDomain = null;
  pagerTrack.classList.remove("show-domain");
  domainFavicon.hidden = true;
  domainFavicon.removeAttribute("src");
  refreshMainViews();
}

function displayRecentSearch(recentSearch) {
  recent.classList.remove(...recent.classList);
  if (recentSearch.length === 0) {
    recent.classList.add("hidden");
  } else {
    recent.replaceChildren();
    recentSearch.forEach((search) => {
      const label = document.createElement("label");
      label.textContent = search;
      label.setAttribute("data-keyword", search);
      label.addEventListener("click", () => {
        input.value = search;
        applySearch(search);
      });
      const deleteBtn = document.createElement("label");
      deleteBtn.classList.add("delete");
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        chrome.storage.local.get("recent_search", (data) => {
          let recentSearch = data["recent_search"] || [];
          recentSearch = recentSearch.reverse();
          recentSearch = recentSearch.filter((item) => item !== search);
          chrome.storage.local.set({ recent_search: recentSearch }, () => {
            displayRecentSearch(recentSearch);
          });
        });
      });
      label.appendChild(deleteBtn);
      recent.appendChild(label);
    });
  }
}

function addKeywordToRecent(keyword) {
  if (!keyword || keyword.trim() === "") {
    return;
  }
  chrome.storage.local.get("recent_search", (data) => {
    let recentSearch = data["recent_search"] || [];
    recentSearch = recentSearch.reverse();
    let exist = recentSearch.includes(keyword);
    if (!exist) {
      recentSearch.push(keyword);
      chrome.storage.local.set({ recent_search: recentSearch }, () => {
        displayRecentSearch(recentSearch);
      });
    }
  });
}

function updateDisplayByKeyword(text) {
  if (!requests || requests.length === 0) {
    clearDisplay(list);
    if (text !== "") {
      displayEmpty(list);
    }
    updateTitle(0);
    return 0;
  }
  const filtered = filterByKeyword(text);
  if (filtered.length > 0) {
    renderRequestList(list, filtered);
  } else {
    clearDisplay(list);
    displayEmpty(list);
  }
  updateTitle(filtered.length);
  return filtered.length;
}

function updateTitle(count) {
  title.innerText = count ? `${titleText} (${count})` : titleText;
}
