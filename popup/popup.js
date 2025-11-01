const list = document.getElementById("requests");
const input = document.getElementById("search_input");
const title = document.getElementById("title");
const statusText = document.getElementById("status");
const recent = document.getElementById("recent");
const titleText = `Network Requests`;

var requests = [];

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

document.getElementById("clear").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      const tabId = tabs[0].id;
      clearDisplay();
      chrome.runtime.sendMessage({ action: "clear", tabId: tabId });
    }
  });
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs.length > 0) {
    const tabId = tabs[0].id;
    chrome.storage.local.get(tabId.toString(), (data) => {
      requests = data[tabId]?.reverse(); // Access requests for the current tabId
      requests?.forEach((req) => {
        displayRequest(req);
      });
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

function clearDisplay() {
  while (list.hasChildNodes()) {
    list.removeChild(list.firstChild);
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

function displayRequest(req) {
  const item = document.createElement("div");
  item.setAttribute("data-frame-id", req.frameId);
  item.setAttribute("data-url", req.url);
  item.setAttribute("data-method", req.method);
  item.textContent = `${req.method} - ${req.url}`;
  item.addEventListener("click", (e) => {
    copyToClipBoard(req.url);
    displayStatus("Copies!!!");
    addKeywordToRecent(input.value);
  });
  list.appendChild(item);
}

function displayEmpty() {
  const item = document.createElement("div");
  item.classList.add("empty_result");
  item.textContent = `No Result`;
  list.appendChild(item);
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
  clearDisplay();
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
  input.addEventListener("input", (event) => {
    clearDisplay();
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
