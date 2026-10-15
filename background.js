chrome.action.onClicked.addListener((tab) => {
  if (tab.url.includes("celerscet.com")) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        document.dispatchEvent(new CustomEvent('START_APPROVAL_AUTOMATION'));
      }
    });
  }
});