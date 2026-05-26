//receive the T&C's from the content script and summarize it using the OpenAI API

//this file has 3 jobs:
//1. Listen for "ANALYZE_PAGE" from popup.js
//2. Tell content.js to scrape the page text
//3. Send that text to proxy server and return the 3 bullets

chrome.runtime.onMessage.addListener( (message, sender, sendResponse) =>{
    if (message.type === "ANALYZE_PAGE") {
        //tell content.js to scrape the page
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            const tabId = tabs[0].id;

            chrome.tabs.sendMessage(tabId, { type: "SCRAPE_TEXT" }, async (scrapeResponse) => {
                if (scrapeResponse.error) {
                    sendResponse({ type: "ANALYZE_RESULT", bullets: null, error: scrapeResponse.error });
                    return;
                }
                const pageText = scrapeResponse.text;
        try{
            const response = await fetch("http://localhost:3000/analyze",{
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
            body: JSON.stringify({ text: pageText })
              
        });

        
        const data = await response.json();
        
        if (data.error) {
            sendResponse({ type: "ANALYZE_RESULT", bullets: null, error: data.error });
            return;
        }

        sendResponse({ type: "ANALYZE_RESULT", bullets: data.bullets, error: null });

        } catch(error){
            sendResponse({ type: "ANALYZE_RESULT", bullets: null, error: error.message || "An error occurred while summarizing." });
        }
    });

});
    }
    return true;//keep the message channel open for async Response
});

 