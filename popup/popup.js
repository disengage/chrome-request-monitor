const list = document.getElementById("requests");
const input = document.getElementById("search_input");
const title = document.getElementById("title");
const statusText = document.getElementById("status");
const titleText = `Network Requests`;

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
  clearDisplay();
  chrome.runtime.sendMessage({ action: "clear" });
});

chrome.storage.local.get("requests", (data) => {
  const requests = data.requests?.reverse();
  requests?.forEach((req) => {
    displayRequest(req);
  });
  onInputChanges(requests);
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
  });
  list.appendChild(item);
}

function displayEmpty() {
  const item = document.createElement("div");
  item.classList.add("empty_result");
  item.textContent = `No Result`;
  list.appendChild(item);
}

function onInputChanges(requests) {
  input.addEventListener("input", (event) => {
    clearDisplay();
    const text = event.target.value;
    if (text == "") {
      requests?.map((req) => displayRequest(req));
    } else {
      const filtered = requests?.filter((request) =>
        request.url.includes(text)
      );
      filtered.map((req) => displayRequest(req));
      filtered.length == 0 && displayEmpty();
    }
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
