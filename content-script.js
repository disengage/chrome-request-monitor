// Override fetch/XHR to label iframe requests
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const frame = window.location.href;
  console.log(`Fetch from ${frame}:`, args);
  return originalFetch(...args);
};
