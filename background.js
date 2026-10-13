chrome.action.onClicked.addListener((tab) => {
  if (tab.url.includes("celerscet.com")) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: startAutomation
    });
  }
});

function startAutomation() {
  // This sends a message to content.js to begin the loop
  document.dispatchEvent(new CustomEvent('START_APPROVAL_AUTOMATION'));
}