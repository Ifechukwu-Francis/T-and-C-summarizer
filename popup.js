// ============================================
// CONFIGURATION - Put this at the VERY TOP
// ============================================
const USE_MOCK_API = true;  // Change to false when background.js is ready

// ============================================
// DOM Elements
// ============================================
const summarizeBtn = document.getElementById('summarizeBtn');
const resetBtn = document.getElementById('resetBtn');
const copyBtn = document.getElementById('copyBtn');
const settingsBtn = document.getElementById('settingsBtn');
const summaryContainer = document.getElementById('summaryContainer');
const summaryContent = document.getElementById('summaryContent');
const statusText = document.getElementById('statusText');
const loader = document.getElementById('loader');
const pageStatus = document.getElementById('pageStatus');

// ============================================
// Main Functions
// ============================================

// Check if current page is a T&C page when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (isTermsPage(tab.url)) {
    pageStatus.textContent = '✅ T&C page detected';
    summarizeBtn.disabled = false;
  } else {
    pageStatus.textContent = '⚠️ Not a T&C page';
    summarizeBtn.disabled = true;
    summarizeBtn.style.opacity = '0.5';
    summarizeBtn.style.cursor = 'not-allowed';
  }
});

// Summarize button click
summarizeBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!isTermsPage(tab.url)) {
    showError('This doesn\'t appear to be a Terms & Conditions page');
    return;
  }
  
  // Show loading state
  summarizeBtn.disabled = true;
  summarizeBtn.textContent = '⏳ Summarizing...';
  statusText.textContent = 'Extracting T&C text...';
  loader.classList.remove('hidden');
  summaryContainer.classList.add('hidden');
  
  try {
    // Inject content script to extract T&C text
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractTermsText
    });
    
    const termsText = results[0].result;
    
    if (!termsText || termsText.length < 100) {
      throw new Error('Could not extract T&C text from this page');
    }
    
    statusText.textContent = 'Generating summary...';
    
    // ============================================
    // THIS IS WHERE sendToGemini IS CALLED
    // ============================================
    const summary = await sendToGemini(termsText);
    
    // Display the 3 bullet points
    displaySummary(summary);
    
    statusText.textContent = '✅ Summary complete!';
    summarizeBtn.classList.add('hidden');
    resetBtn.classList.remove('hidden');
    
  } catch (error) {
    console.error('Error:', error);
    showError(error.message);
  } finally {
    loader.classList.add('hidden');
    summarizeBtn.disabled = false;
    summarizeBtn.textContent = '🔍 Summarize This Page';
  }
});

// ============================================
// THIS IS THE sendToGemini FUNCTION (add it here)
// ============================================
async function sendToGemini(text) {
  if (USE_MOCK_API) {
    return getMockSummary(text);  // Uses mock data
  } else {
    // Real implementation using background.js
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'summarize', text: text },
        (response) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.summary);
          }
        }
      );
    });
  }
}

// ============================================
// MOCK FUNCTION (keep this too)
// ============================================
async function getMockSummary(termsText) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const text = termsText.toLowerCase();
      
      let summary = [
        "You must be at least 13 years old to use this service",
        "The company can modify these terms at any time without notice",
        "Your data may be shared with third-party service providers"
      ];
      
      if (text.includes('privacy') || text.includes('data')) {
        summary[0] = "⚠️ Your personal data including browsing history and IP address will be collected";
      }
      if (text.includes('refund') || text.includes('payment')) {
        summary[1] = "💰 Refunds are only available within 14 days of purchase with no guarantee";
      }
      if (text.includes('copyright') || text.includes('intellectual property')) {
        summary[2] = "©️ All content on this site is protected by copyright and cannot be reproduced";
      }
      
      resolve(summary);
    }, 1500);
  });
}

// Reset button
resetBtn.addEventListener('click', () => {
  summaryContainer.classList.add('hidden');
  summarizeBtn.classList.remove('hidden');
  resetBtn.classList.add('hidden');
  statusText.textContent = 'Ready to summarize';
});

// Copy button
copyBtn.addEventListener('click', async () => {
  const bulletPoints = document.querySelectorAll('.bullet-text');
  const summaryText = Array.from(bulletPoints)
    .map(point => '- ' + point.textContent)
    .join('\n\n');
  
  await navigator.clipboard.writeText(summaryText);
  
  const originalText = copyBtn.textContent;
  copyBtn.textContent = '✅ Copied!';
  setTimeout(() => {
    copyBtn.textContent = originalText;
  }, 2000);
});

// Settings button
settingsBtn.addEventListener('click', () => {
  alert('Settings will be available in future updates!');
});

// Helper: Check if URL is a T&C page
function isTermsPage(url) {
  const patterns = [
    /terms/i,
    /conditions/i,
    /tandc/i,
    /t&c/i,
    /tos/i,
    /agb/i,
    /terms-of-service/i,
    /terms-and-conditions/i
  ];
  return patterns.some(pattern => pattern.test(url));
}

// Helper: Extract T&C text from page
function extractTermsText() {
  const selectors = [
    'article', 'main', '.terms-content', '.terms-conditions',
    '#terms', '#conditions', '.legal', '.terms-text',
    '.tos', '.privacy-policy', '.legal-notice'
  ];
  
  let content = '';
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      content = elements[0].innerText;
      break;
    }
  }
  
  if (!content || content.length < 100) {
    content = document.body.innerText;
  }
  
  return content.substring(0, 5000);
}

// Helper: Display 3 bullet points
function displaySummary(bulletPoints) {
  summaryContent.innerHTML = '';
  
  if (!Array.isArray(bulletPoints) || bulletPoints.length !== 3) {
    showError('Received invalid summary format');
    return;
  }
  
  bulletPoints.forEach((point, index) => {
    const bulletDiv = document.createElement('div');
    bulletDiv.className = 'bullet-point';
    bulletDiv.innerHTML = `
      <div class="bullet-icon">${index === 0 ? '⚠️' : index === 1 ? '📌' : '✅'}</div>
      <div class="bullet-text">${escapeHtml(point)}</div>
    `;
    summaryContent.appendChild(bulletDiv);
  });
  
  summaryContainer.classList.remove('hidden');
}

// Helper: Show error message
function showError(message) {
  statusText.textContent = '❌ Error';
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error';
  errorDiv.textContent = message;
  summaryContainer.innerHTML = '';
  summaryContainer.appendChild(errorDiv);
  summaryContainer.classList.remove('hidden');
  
  setTimeout(() => {
    summaryContainer.classList.add('hidden');
    statusText.textContent = 'Ready to summarize';
  }, 3000);
}

// Helper: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}