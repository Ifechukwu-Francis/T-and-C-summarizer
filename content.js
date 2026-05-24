//scrap the T&C's from the page and send it to the background script
chrome.runtime.onMessage.addListener( (message, sender, sendResponse) =>{
  if (message.type === "SCRAPE_TEXT") {
    const pageText = document.body.innerText;
    if (pageText && pageText.length > 100) {
        sendResponse({ type: "SCRAPE_RESULT", text: pageText, error: null });
    } else {
        sendResponse({ type: "SCRAPE_RESULT", text: null, error: "No significant text found." });
    }
  }
  return true;//keep the message channel open for async Response

  //User visits sptify.com/terms,
  //background.js sends a { type: "SCRAPE_TEXT" },
  //content.js receives it, grabs document.body.innerText,
  //sends back { type: "SCRAPE_RESULT", text: "...all the T&C text..." }
});