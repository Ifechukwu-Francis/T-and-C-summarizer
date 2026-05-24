//receive the T&C's from the content script and summarize it using the OpenAI API

//this file has 3 jobs:
//1. Listen for "ANALYZE_PAGE" from popup.js
//2. Tell content.js to scrape the page text
//3. Send that text to Claude API and return the 3 bullets

chrome.runtime.onMessage.addListener( async (message, sender, sendResponse) => {
  if (message.type === "ANALYZE_PAGE") {
    //1. Tell content.js to scrape the page text    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id;

      chrome.tabs.active.sendMessage(tabId, { type: "SCRAPE_TEXT" }, async (scrapeResponse) => {

        if (scrapeResponse.error) {
            sendResponse({ type: "ANALYZE_RESULT", bullets: null, error: scrapeResponse.error });
        return;

        }
        const pageText = scrapeResponse.text;

        try{
            const response = await fetch("https://generativeLanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_API_KEY",{
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `Summarize the following Terms and Conditions into 3 concise bullet points:\n\n${pageText}`
                            }
                        ]
                    }
                ]
        })

        });
        const data = await response.json();
        const rawText = data.candidates[0].content.parts[0].text;
        const bullets = rawText.split("\n").filter(line => line.trim() !== ""); //split by new line and remove empty lines

        sendResponse({ type: "ANALYZE_RESULT", bullets, error: null });
        } catch(error){
            sendResponse({ type: "ANALYZE_RESULT", bullets: null, error: error.message || "An error occurred while summarizing." });
        }
    });

  });
}
    return true;//keep the message channel open for async Response
});