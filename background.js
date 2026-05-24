//receive the T&C's from the content script and summarize it using the OpenAI API

//this file has 3 jobs:
//1. Listen for "ANALYZE_PAGE" from popup.js
//2. Tell content.js to scrape the page text
//3. Send that text to Claude API and return the 3 bullets

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ANALYZE_PAGE") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0].id;
            //this code is simply asking the browser: 
            // "Hey, which tab is currently active? Browser replies: "Tab 2, and its ID is 451."
            //tabId = 451
            chrome.tabs.sendMessage(tabId, {type: "SCRAPE_TEXT"}, (scrapeResponse) => {
                if (scrapeResponse.error) {
                    sendResponse({ type: "ANALYZE_RESULT", bullets: null, error: scrapeResponse.error });
                    return;
                }
                const pageText = scrapeResponse.text;
                // Process the scraped text and send it to Claude API
            });
        });
    }

    return true; 

});