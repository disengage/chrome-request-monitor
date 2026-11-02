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

var requests = [];
var currentTabId = null;
var activeDomain = null;
var inputListenerBound = false;
var domainsOpen = false;

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

function refreshMainViews() {
  updateDisplayByKeyword(input.value.trim());
  displayDomains();
}

function applyRequestsFromStorage(raw) {
  requests = normalizeRequests(raw);
  refreshMainViews();
  if (activeDomain) {
    renderDomainRequests(activeDomain);
  }
}

document.getElementById("clear").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      const tabId = tabs[0].id;
      requests = [];
      clearDisplay(list);
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
}

domainsToggle.addEventListener("click", () => {
  setDomainsOpen(!domainsOpen);
});

setDomainsOpen(false);

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs.length > 0) {
    currentTabId = tabs[0].id;
    const tabKey = currentTabId.toString();
    chrome.storage.local.get(tabKey, (data) => {
      applyRequestsFromStorage(data[tabKey]);
      onInputChanges();
    });
    chrome.storage.local.get("recent_search", (data) => {
      let recentSearch = data["recent_search"] || [];
      recentSearch = recentSearch.reverse();
      displayRecentSearch(recentSearch);
      if (recentSearch.length > 0) {
        let firstKeyword = recentSearch[0];
        input.value = firstKeyword;
        updateDisplayByKeyword(firstKeyword);
      }
    });
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || currentTabId == null) {
    return;
  }
  const tabKey = currentTabId.toString();
  if (!changes[tabKey]) {
    return;
  }
  applyRequestsFromStorage(changes[tabKey].newValue);
});

function clearDisplay(target = list) {
  while (target.hasChildNodes()) {
    target.removeChild(target.firstChild);
  }
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

function displayRequest(req, target = list) {
  const item = document.createElement("div");
  item.classList.add("request-item");
  item.setAttribute("data-frame-id", req.frameId);
  item.setAttribute("data-url", req.url);
  item.setAttribute("data-method", req.method);
  item.textContent = `${req.method} - ${req.url}`;
  item.addEventListener("click", () => {
    copyToClipBoard(req.url);
    displayStatus("Copies!!!");
    addKeywordToRecent(input.value);
  });
  target.appendChild(item);
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
  domainsEl.replaceChildren();
  const domains = aggregateDomains(requests);
  if (domains.length === 0) {
    const empty = document.createElement("div");
    empty.classList.add("domains-empty");
    empty.textContent = "No domains yet";
    domainsEl.appendChild(empty);
    return;
  }
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

    domainsEl.appendChild(row);
  });
}

function renderDomainRequests(hostname) {
  clearDisplay(domainList);
  const filtered = (requests || []).filter(
    (req) => getHostname(req.url) === hostname
  );
  if (filtered.length > 0) {
    filtered.forEach((req) => displayRequest(req, domainList));
  } else {
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
        updateDisplayByKeyword(search);
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
  clearDisplay(list);
  if (!requests || requests.length === 0) {
    if (text !== "") {
      displayEmpty(list);
    }
    return;
  }
  if (text == "") {
    requests.map((req) => displayRequest(req));
  } else {
    const filtered = requests.filter((request) => request.url.includes(text));
    if (filtered?.length > 0) {
      filtered?.map((req) => displayRequest(req));
    } else {
      displayEmpty();
    }
  }
}

function onInputChanges() {
  if (inputListenerBound) {
    return;
  }
  inputListenerBound = true;
  input.addEventListener("input", (event) => {
    const text = event.target.value.trim();
    updateDisplayByKeyword(text);
  });
}

// Create an observer instance
const observer = new MutationObserver(function (mutations) {
  const childNodes = mutations[mutations.length - 1].target?.childNodes ?? [];
  let count = childNodes.length;
  if (count == 1) {
    count = Array.from(childNodes).filter(
      (div) => !div.classList.contains("empty_result")
    ).length;
  }
  title.innerText = count ? `${titleText} (${count})` : titleText;
}).observe(list, {
  attributes: true,
  childList: true,
  characterData: true,
  // This option allows you to listen to all descendants of body
  subtree: true,
});
