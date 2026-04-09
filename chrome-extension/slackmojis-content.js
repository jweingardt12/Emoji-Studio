
// Wrap everything in an IIFE to avoid top-level return
(function() {
  // Check if extension context is valid
  if (!chrome.runtime?.id) {
    console.warn('Emoji Studio extension context not available');
    // Don't set up any functionality if the extension context is invalid
    return;
  }

  // Function to create the "Add to Emoji Studio" button
function createAddButton(emojiUrl, emojiName, metadata = {}) {
  const button = document.createElement('button');
  button.className = 'emoji-studio-add-btn';
  button.title = 'Add to Emoji Studio'; // Tooltip
  button.type = 'button';
  button.setAttribute('aria-label', 'Add to Emoji Studio');
  
  // Create logo image or fallback
  let logoElement;
  try {
    if (chrome.runtime?.getURL) {
      const logoImg = document.createElement('img');
      logoImg.src = chrome.runtime.getURL('logo.png');
      logoImg.alt = 'Emoji Studio';
      logoImg.width = 20;
      logoImg.height = 20;
      logoImg.style.cssText = `
        width: 20px;
        height: 20px;
        margin-right: 2px;
      `;
      logoElement = logoImg;
    } else {
      throw new Error('Chrome runtime not available');
    }
  } catch (error) {
    console.warn('Could not load extension logo:', error);
    // Use a fallback emoji instead
    const emojiSpan = document.createElement('span');
    emojiSpan.textContent = '😀';
    emojiSpan.style.cssText = `
      font-size: 20px;
      margin-right: 2px;
    `;
    logoElement = emojiSpan;
  }
  
  // Create plus span
  const plusSpan = document.createElement('span');
  plusSpan.textContent = '+';
  plusSpan.style.cssText = `
    font-size: 16px;
    font-weight: bold;
    line-height: 1;
  `;
  
  button.appendChild(logoElement);
  button.appendChild(plusSpan);
  
  button.style.cssText = `
    background: #1a1a1a;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.6);
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
    margin-top: 4px;
    transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease, color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-weight: 500;
    display: none;
    align-items: center;
    justify-content: center;
    position: relative;
    opacity: 0;
    gap: 4px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
  `;
  
  // Add hover effect
  button.addEventListener('mouseenter', () => {
    if (!button.disabled) {
      button.style.background = '#2a2a2a';
      button.style.transform = 'scale(1.02)';
    }
  });
  
  button.addEventListener('mouseleave', () => {
    if (!button.disabled && plusSpan.textContent === '+') {
      button.style.background = '#1a1a1a';
      button.style.transform = 'scale(1)';
    }
  });
  
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    
    // Check if extension context is still valid
    if (!chrome.runtime?.id) {
      console.warn('Extension context invalidated - please refresh the page');
      plusSpan.textContent = '⟳';
      button.style.background = '#f59e0b';
      button.title = 'Please refresh the page';
      return;
    }
    
    // Check if we have any saved Slack data
    try {
      chrome.storage.local.get('slackData', async (result) => {
        // Check for Chrome runtime errors
        if (chrome.runtime.lastError) {
          plusSpan.textContent = '✗';
          button.style.background = '#dc2626';
          button.title = 'Extension error';
          setTimeout(() => {
            plusSpan.textContent = '+';
          button.style.background = '#1a1a1a';
          button.title = 'Add to Emoji Studio';
        }, 2000);
        return;
      }
      
      if (!result.slackData || Object.keys(result.slackData).length === 0) {
        plusSpan.textContent = '✗';
        button.style.background = '#dc2626';
        button.title = 'No Slack workspace connected';
        setTimeout(() => {
          plusSpan.textContent = '+';
          button.style.background = '#1a1a1a';
          button.title = 'Add to Emoji Studio';
        }, 2000);
        return;
      }
      
      // Get the first workspace (for now)
      const workspaceData = Object.values(result.slackData)[0];
      
      plusSpan.textContent = '...';
      button.title = 'Adding...';
      button.disabled = true;
      
      // Add a timeout safeguard
      const timeoutId = setTimeout(() => {
        console.error('Request timed out after 5 seconds');
        plusSpan.textContent = '✗';
        button.style.background = '#dc2626';
        button.title = 'Request timed out';
        setTimeout(() => {
          plusSpan.textContent = '+';
          button.style.background = '#1a1a1a';
          button.title = 'Add to Emoji Studio';
          button.disabled = false;
        }, 2000);
      }, 5000);
      
      // Send message to background script to add emoji to cart
      chrome.runtime.sendMessage({
        type: 'ADD_TO_EMOJI_CART',
        emoji: {
          url: emojiUrl,
          name: emojiName,
          workspace: workspaceData.workspace,
          source: 'slackmojis',
          originalUrl: emojiUrl,
          isHDR: metadata?.isHDR || false,
          timestamp: Date.now()
        }
      }, (response) => {
        clearTimeout(timeoutId); // Clear the timeout
        
        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          plusSpan.textContent = '✗';
          button.style.background = '#dc2626';
          button.title = 'Failed to communicate with extension';
        } else if (response && response.success) {
          plusSpan.textContent = '✓';
          button.style.background = '#15803d';
          button.title = 'Added!';
          createToast(); // Show toast notification
        } else {
          console.error('Failed to add emoji:', response);
          plusSpan.textContent = '✗';
          button.style.background = '#dc2626';
          button.title = response?.error || 'Failed to add';
        }
        
        setTimeout(() => {
          plusSpan.textContent = '+';
          button.style.background = '#1a1a1a';
          button.title = 'Add to Emoji Studio';
          button.disabled = false;
        }, 2000);
      });
    });
    } catch (error) {
      console.error('Error accessing Chrome storage:', error);
      plusSpan.textContent = '✗';
      button.style.background = '#dc2626';
      button.title = 'Extension error - please refresh';
      setTimeout(() => {
        plusSpan.textContent = '+';
        button.style.background = '#1a1a1a';
        button.title = 'Add to Emoji Studio';
      }, 2000);
    }
  });
  
  return button;
}

// Create toast notification
function createToast(message, type = 'success') {
  // Remove any existing toast
  const existingToast = document.querySelector('.emoji-studio-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = 'emoji-studio-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.setAttribute('aria-atomic', 'true');
  
  // Try to get logo URL, fallback to emoji
  let logoHtml;
  try {
    if (chrome.runtime?.getURL) {
      logoHtml = `<img src="${chrome.runtime.getURL('logo.png')}" alt="Emoji Studio" width="24" height="24" style="width: 24px; height: 24px;">`;
    } else {
      logoHtml = `<span style="font-size: 24px;">😀</span>`;
    }
  } catch (error) {
    logoHtml = `<span style="font-size: 24px;">😀</span>`;
  }
  
  toast.innerHTML = `
    ${logoHtml}
    <div style="flex: 1;">
      <div style="font-weight: 600;">Emoji added!</div>
      <div style="font-size: 0.875rem; opacity: 0.8;">Ready to send to Emoji Studio</div>
    </div>
    <button class="emoji-studio-toast-button">Open Extension</button>
  `;
  
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1a1a1a;
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    border: 1px solid rgba(255, 255, 255, 0.6);
    max-width: 380px;
  `;
  
  // Style the button
  const button = toast.querySelector('.emoji-studio-toast-button');
  button.type = 'button';
  button.style.cssText = `
    background: white;
    color: #1a1a1a;
    border: none;
    padding: 6px 16px;
    border-radius: 4px;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  `;
  
  // Add button click handler
  button.addEventListener('click', () => {
    // Check if extension context is still valid
    if (!chrome.runtime?.id) {
      console.warn('Extension context invalidated');
      return;
    }
    
    try {
      // Set flag to open create tab when extension is clicked
      chrome.storage.local.set({ openCreateTab: true }, () => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
          return;
        }
        
        // Chrome doesn't allow programmatically opening the extension popup
        // So we'll highlight the extension icon instead
        chrome.runtime.sendMessage({
          type: 'HIGHLIGHT_EXTENSION_ICON'
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Message error:', chrome.runtime.lastError);
          }
        });
        
        // Update toast to show instruction
        let updateLogoHtml;
        try {
          if (chrome.runtime?.getURL) {
            updateLogoHtml = `<img src="${chrome.runtime.getURL('logo.png')}" alt="Emoji Studio" width="24" height="24" style="width: 24px; height: 24px;">`;
          } else {
            updateLogoHtml = `<span style="font-size: 24px;">😀</span>`;
          }
        } catch (error) {
          updateLogoHtml = `<span style="font-size: 24px;">😀</span>`;
        }
        
        toast.innerHTML = `
        ${updateLogoHtml}
        <div style="flex: 1;">
          <div style="font-weight: 600;">Click the extension icon</div>
          <div style="font-size: 0.875rem; opacity: 0.8;">Opens to Create tab →</div>
        </div>
      `;
      
      // Remove the button since it was clicked
      const toastButton = toast.querySelector('.emoji-studio-toast-button');
      if (toastButton) toastButton.remove();
      
        // Auto-remove after 3 seconds
        setTimeout(() => {
          toast.style.animation = 'slideOut 0.3s ease-out';
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      });
    } catch (error) {
      console.error('Error in toast button click:', error);
    }
  });
  
  // Add hover effect
  button.addEventListener('mouseenter', () => {
    button.style.background = '#f0f0f0';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.background = 'white';
  });
  
  // Add CSS animation (only once)
  if (!document.querySelector('#emoji-studio-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'emoji-studio-toast-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }

      .emoji-studio-add-btn:focus-visible,
      .emoji-studio-toast-button:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.8);
        outline-offset: 2px;
      }

      @media (prefers-reduced-motion: reduce) {
        .emoji-studio-toast {
          animation: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(toast);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Simple function to add buttons to emoji items
function addButtonsToEmojis() {
  
  // Target li.emoji containers directly based on the actual Slackmojis HTML structure
  const emojiContainers = document.querySelectorAll('li.emoji');
  
  let addedCount = 0;
  
  emojiContainers.forEach(container => {
    // Check if this container already has our button
    if (container.querySelector('.emoji-studio-add-btn')) {
      return; // Skip this emoji, already has a button
    }
    
    // Find the emoji image within this container
    const img = container.querySelector('img');
    if (!img) return;
    
    const emojiUrl = img.src;
    
    // Check if this might be an HDR image
    const isHDR = emojiUrl.toLowerCase().includes('hdr') ||
                  emojiUrl.toLowerCase().includes('heic') ||
                  emojiUrl.toLowerCase().includes('heif') ||
                  emojiUrl.toLowerCase().includes('_hdr') ||
                  img.alt?.toLowerCase().includes('hdr') ||
                  img.title?.toLowerCase().includes('hdr');
    
    // Try to get emoji name from various sources
    // 1. Look for the emoji name in the format :emoji-name: within anchor tags
    const anchorElement = container.querySelector('a');
    let emojiName = null;
    let anchorText = null;
    
    if (anchorElement) {
      anchorText = anchorElement.textContent.trim();
      // Extract name from :emoji-name: format
      const nameMatch = anchorText.match(/:([^:]+):/);
      if (nameMatch) {
        emojiName = nameMatch[1];
      }
    }
    
    // 2. Check for a span with the emoji name (fallback)
    if (!emojiName) {
      const nameSpan = container.querySelector('span.name');
      emojiName = nameSpan ? nameSpan.textContent.trim() : null;
    }
    
    // 3. Fall back to image attributes
    if (!emojiName) {
      emojiName = img.alt || img.title || '';
    }
    
    // 4. Try to extract from URL as last resort
    if (!emojiName && emojiUrl) {
      const urlMatch = emojiUrl.match(/\/([^\/]+)\.(gif|png|jpg|jpeg|webp|heic|heif)(?:\?|$)/i);
      if (urlMatch) {
        emojiName = urlMatch[1];
      }
    }
    
    // Clean up the emoji name (but preserve the original formatting from slackmojis)
    // Only clean if we had to fall back to alt/title/URL extraction
    if (!anchorElement || !anchorText || !anchorText.match(/:([^:]+):/)) {
      emojiName = emojiName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'emoji';
    } else {
      // For names from :emoji-name: format, just ensure it's not empty
      emojiName = emojiName || 'emoji';
    }
    
    // Skip if it's not a valid emoji image
    if (!emojiUrl || emojiUrl.includes('data:')) return;
    
    // Create and add the button
    const button = createAddButton(emojiUrl, emojiName, { isHDR });
    
    // Position the button in the top-right corner
    container.style.position = 'relative';
    button.style.position = 'absolute';
    button.style.top = '2px';
    button.style.right = '2px';
    button.style.zIndex = '10';
    
    // Add hover event listeners to show/hide the button
    container.addEventListener('mouseenter', () => {
      button.style.display = 'inline-flex';
      // Small delay before showing to make it smooth
      setTimeout(() => {
        button.style.opacity = '1';
      }, 10);
    });
    
    container.addEventListener('mouseleave', () => {
      button.style.opacity = '0';
      // Hide after transition completes
      setTimeout(() => {
        button.style.display = 'none';
      }, 200);
    });
    
    container.appendChild(button);
    addedCount++;
  });
  
}

// Function to set up mutation observer for dynamic content
function setupObserver() {
  // Create a MutationObserver to watch for new emojis being added
  const observer = new MutationObserver((mutations) => {
    // Check if any new nodes were added
    let hasNewEmojis = false;
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          // Check if the added node is an emoji or contains emojis
          if (node.classList && node.classList.contains('emoji') || 
              (node.querySelectorAll && node.querySelectorAll('li.emoji').length > 0)) {
            hasNewEmojis = true;
          }
        }
      });
    });
    
    // If new emojis were added, add buttons to them
    if (hasNewEmojis) {
      setTimeout(addButtonsToEmojis, 100);
    }
  });
  
  // Start observing the entire body for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Run when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(addButtonsToEmojis, 1000);
    setupObserver();
  });
} else {
  setTimeout(addButtonsToEmojis, 1000);
  setupObserver();
}

// Also try after delays for any emojis that might have been missed
setTimeout(() => {
  addButtonsToEmojis();
}, 3000);

})(); // End of IIFE
