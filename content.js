
/**
 * FormEase Content Script
 * Implements seamless file replacement using the DataTransfer API
 * Allows processed files (resized/compressed/converted) to be injected back into form fields
 */

/**
 * Injects a script into the page context to access page-level APIs
 * This is necessary because content scripts run in an isolated environment
 * @param {string} filePath - Path to the script file to inject
 */
function injectScript(filePath) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(filePath);
  (document.head || document.documentElement).appendChild(script);
}

// Inject all necessary processing scripts
injectScript('scripts/pica.min.js');
injectScript('scripts/resize.js');
injectScript('scripts/compress.js');
injectScript('scripts/convert.js');

/**
 * Global counter to assign unique IDs to file inputs
 * This ensures we can track and update the correct input when files are processed
 */
let fileInputCounter = 0;

/**
 * Map to store original file references for each input
 * Key: inputId, Value: original file object
 * This allows us to maintain file history and enable undo functionality
 */
const originalFiles = new Map();

/**
 * Map to store processing state for each input
 * Key: inputId, Value: { isProcessing: boolean, lastProcessedFile: File }
 */
const processingState = new Map();

/**
 * Initialize FormEase toolbox for all file inputs on the page
 * This function runs immediately when the content script loads
 */
function initializeFormEase() {
  // Find all file inputs on the page, including dynamically added ones
  const fileInputs = document.querySelectorAll('input[type="file"]');
  
  fileInputs.forEach(input => {
    // Skip if already processed (prevents duplicate toolboxes)
    if (input.dataset.formEaseId) {
      return;
    }
    
    setupFileInput(input);
  });
}

/**
 * Setup FormEase functionality for a single file input
 * @param {HTMLInputElement} input - The file input element to enhance
 */
function setupFileInput(input) {
  // Assign unique identifier to track this specific input
  const inputId = `formEaseInput-${fileInputCounter++}`;
  input.dataset.formEaseId = inputId;
  
  // Initialize processing state for this input
  processingState.set(inputId, {
    isProcessing: false,
    lastProcessedFile: null
  });
  
  // Store original file when user selects a file
  input.addEventListener('change', function(event) {
    if (event.target.files && event.target.files[0]) {
      originalFiles.set(inputId, event.target.files[0]);
      console.log(`[FormEase] Original file stored for input ${inputId}:`, event.target.files[0].name);
    }
  });
  
  // Create and inject the toolbox UI
  createToolboxForInput(input, inputId);
}

/**
 * Creates and injects the FormEase toolbox UI for a file input
 * @param {HTMLInputElement} input - The file input element
 * @param {string} inputId - Unique identifier for the input
 */
function createToolboxForInput(input, inputId) {
  const toolbox = document.createElement('div');
  toolbox.className = 'formease-toolbox';
  toolbox.dataset.inputId = inputId;
  
  // Fetch and inject the toolbox HTML
  fetch(chrome.runtime.getURL('toolbox.html'))
    .then(response => response.text())
    .then(data => {
      toolbox.innerHTML = data;
      
      // Insert toolbox after the file input
      input.parentNode.insertBefore(toolbox, input.nextSibling);
      
      // Setup event listeners for toolbox controls
      setupToolboxEventListeners(toolbox, inputId);
      
      // Add visual feedback elements
      addVisualFeedback(toolbox, inputId);
      
      console.log(`[FormEase] Toolbox created for input ${inputId}`);
    })
    .catch(error => {
      console.error('[FormEase] Failed to load toolbox:', error);
    });
}

/**
 * Setup event listeners for toolbox controls (resize, compress, convert buttons)
 * @param {HTMLElement} toolbox - The toolbox container element
 * @param {string} inputId - Unique identifier for the associated input
 */
function setupToolboxEventListeners(toolbox, inputId) {
  const input = document.querySelector(`input[data-form-ease-id="${inputId}"]`);
  
  // Resize functionality
  const resizeSlider = toolbox.querySelector('#resize');
  const resizeBtn = toolbox.querySelector('#resizeBtn');
  
  if (resizeSlider && resizeBtn) {
    // Real-time slider update (optional - can be removed for performance)
    resizeSlider.addEventListener('input', (e) => {
      const scaleDisplay = toolbox.querySelector('.scale-display');
      if (scaleDisplay) {
        scaleDisplay.textContent = `${e.target.value}%`;
      }
    });
    
    // Resize button click handler
    resizeBtn.addEventListener('click', () => {
      const scale = resizeSlider.value;
      const currentFile = getCurrentFileForInput(inputId);
      
      if (currentFile) {
        processFile('resize', currentFile, { scale: parseFloat(scale) }, inputId);
      } else {
        showError(toolbox, 'Please select a file first');
      }
    });
  }
  
  // Compress functionality
  const compressBtn = toolbox.querySelector('#compressBtn');
  if (compressBtn) {
    compressBtn.addEventListener('click', () => {
      const currentFile = getCurrentFileForInput(inputId);
      
      if (currentFile) {
        // Default compression quality - could be made configurable
        processFile('compress', currentFile, { quality: 0.7 }, inputId);
      } else {
        showError(toolbox, 'Please select a file first');
      }
    });
  }
  
  // Convert functionality
  const convertBtn = toolbox.querySelector('#convertBtn');
  if (convertBtn) {
    convertBtn.addEventListener('click', () => {
      const currentFile = getCurrentFileForInput(inputId);
      
      if (currentFile) {
        // Default format - could be made configurable via dropdown
        processFile('convert', currentFile, { format: 'jpeg' }, inputId);
      } else {
        showError(toolbox, 'Please select a file first');
      }
    });
  }
}

/**
 * Get the current file for a given input (either original or last processed)
 * @param {string} inputId - Unique identifier for the input
 * @returns {File|null} The current file or null if no file exists
 */
function getCurrentFileForInput(inputId) {
  const input = document.querySelector(`input[data-form-ease-id="${inputId}"]`);
  
  if (!input) {
    console.error(`[FormEase] Input with ID ${inputId} not found`);
    return null;
  }
  
  // Return the current file from the input (this will be the processed file if any)
  if (input.files && input.files.length > 0) {
    return input.files[0];
  }
  
  // Fallback to original file if input is empty
  return originalFiles.get(inputId) || null;
}

/**
 * Process a file using the specified operation
 * @param {string} operation - Type of processing ('resize', 'compress', 'convert')
 * @param {File} file - The file to process
 * @param {Object} options - Processing options (scale, quality, format, etc.)
 * @param {string} inputId - Unique identifier for the input
 */
function processFile(operation, file, options, inputId) {
  console.log(`[FormEase] Starting ${operation} operation for input ${inputId}`);
  
  // Update processing state
  const state = processingState.get(inputId);
  if (state) {
    state.isProcessing = true;
  }
  
  // Show processing indicator
  const toolbox = document.querySelector(`.formease-toolbox[data-input-id="${inputId}"]`);
  if (toolbox) {
    showProcessingIndicator(toolbox, operation);
  }
  
  // Send processing request to the appropriate script
  const messageData = {
    type: operation,
    file: file,
    inputId: inputId,
    ...options
  };
  
  // Set a timeout for processing (30 seconds max)
  const timeoutId = setTimeout(() => {
    console.error(`[FormEase] Processing timeout for ${operation} on input ${inputId}`);
    hideProcessingIndicator(toolbox);
    showError(toolbox, `${operation} operation timed out`);
    
    if (state) {
      state.isProcessing = false;
    }
  }, 30000);
  
  // Store timeout ID for potential cleanup
  messageData.timeoutId = timeoutId;
  
  window.postMessage(messageData, '*');
}

/**
 * Handle processed file results from worker scripts
 * This is the core function that implements the DataTransfer API file replacement
 */
window.addEventListener('message', (event) => {
  // Verify message source and type
  if (event.source !== window) {
    return;
  }
  
  // Handle processing errors
  if (event.data.type === 'fileProcessingError') {
    const { inputId, error, operation, timeoutId } = event.data;
    
    console.error(`[FormEase] Processing error for input ${inputId}:`, error);
    
    // Clear timeout if provided
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Update processing state
    const state = processingState.get(inputId);
    if (state) {
      state.isProcessing = false;
    }
    
    // Show error feedback
    const toolbox = document.querySelector(`.formease-toolbox[data-input-id="${inputId}"]`);
    if (toolbox) {
      hideProcessingIndicator(toolbox);
      showError(toolbox, `${operation} failed: ${error}`);
    }
    
    return;
  }
  
  // Handle successful file processing
  if (event.data.type !== 'fileProcessed') {
    return;
  }
  
  const { file, inputId, originalOperation } = event.data;
  
  if (!file || !inputId) {
    console.error('[FormEase] Invalid processed file data received');
    return;
  }
  
  console.log(`[FormEase] Received processed file for input ${inputId}:`, file.name);
  
  // Find the target input element
  const targetInput = document.querySelector(`input[data-form-ease-id="${inputId}"]`);
  
  if (!targetInput) {
    console.error(`[FormEase] Target input ${inputId} not found for file replacement`);
    return;
  }
  
  // Clear any existing timeout
  if (event.data.timeoutId) {
    clearTimeout(event.data.timeoutId);
  }
  
  // Update processing state
  const state = processingState.get(inputId);
  if (state) {
    state.isProcessing = false;
    state.lastProcessedFile = file;
  }
  
  // **CRITICAL: Implement DataTransfer API file replacement**
  try {
    // Create a new DataTransfer object
    const dataTransfer = new DataTransfer();
    
    // Add the processed file to the DataTransfer object
    dataTransfer.items.add(file);
    
    // **KEY STEP: Replace the input's files with the processed file**
    // This ensures the form will submit the processed file instead of the original
    targetInput.files = dataTransfer.files;
    
    // Dispatch a 'change' event to notify any listeners that the file has changed
    // This is crucial for frameworks like React, Vue, Angular that listen for change events
    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
    targetInput.dispatchEvent(changeEvent);
    
    // Also dispatch an 'input' event for broader compatibility
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    targetInput.dispatchEvent(inputEvent);
    
    console.log(`[FormEase] Successfully replaced file in input ${inputId} with processed file`);
    console.log(`[FormEase] New file details:`, {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    
    // Verify the replacement was successful
    if (targetInput.files && targetInput.files.length > 0 && targetInput.files[0] === file) {
      console.log('[FormEase] File replacement verified successfully');
      
      // Show enhanced success feedback with processing details
      const toolbox = document.querySelector(`.formease-toolbox[data-input-id="${inputId}"]`);
      if (toolbox) {
        hideProcessingIndicator(toolbox);
        
        // Create detailed success message based on operation
        let successMessage = `✅ File ${originalOperation || 'processing'}ed successfully!`;
        
        if (event.data.originalSize && event.data.newSize) {
          const sizeChange = ((event.data.originalSize - event.data.newSize) / event.data.originalSize * 100);
          const sizeChangeText = sizeChange > 0 ? 
            `Size reduced by ${sizeChange.toFixed(1)}%` : 
            `Size increased by ${Math.abs(sizeChange).toFixed(1)}%`;
          successMessage += ` ${sizeChangeText}.`;
        }
        
        if (event.data.compressionRatio) {
          successMessage += ` Compressed by ${event.data.compressionRatio}%.`;
        }
        
        if (event.data.originalFormat && event.data.newFormat) {
          successMessage += ` Converted from ${event.data.originalFormat} to ${event.data.newFormat}.`;
        }
        
        successMessage += ' Ready for upload.';
        
        showDetailedSuccessMessage(toolbox, successMessage);
      }
      
      // Trigger form validation if the input has validation rules
      if (targetInput.checkValidity) {
        targetInput.checkValidity();
      }
      
      // Dispatch custom event for external integrations
      const customEvent = new CustomEvent('formease:fileProcessed', {
        detail: {
          inputId: inputId,
          operation: originalOperation,
          originalFile: originalFiles.get(inputId),
          processedFile: file,
          processStats: {
            originalSize: event.data.originalSize,
            newSize: event.data.newSize,
            compressionRatio: event.data.compressionRatio,
            originalFormat: event.data.originalFormat,
            newFormat: event.data.newFormat
          }
        },
        bubbles: true
      });
      targetInput.dispatchEvent(customEvent);
      
    } else {
      throw new Error('File replacement verification failed');
    }
    
  } catch (error) {
    console.error('[FormEase] Failed to replace file using DataTransfer API:', error);
    
    // Show error feedback
    const toolbox = document.querySelector(`.formease-toolbox[data-input-id="${inputId}"]`);
    if (toolbox) {
      hideProcessingIndicator(toolbox);
      showError(toolbox, 'Failed to update file. Please try again.');
    }
  }
});

/**
 * Add visual feedback elements to the toolbox
 * @param {HTMLElement} toolbox - The toolbox container
 * @param {string} inputId - Unique identifier for the input
 */
function addVisualFeedback(toolbox, inputId) {
  // Create feedback container
  const feedbackContainer = document.createElement('div');
  feedbackContainer.className = 'formease-feedback';
  feedbackContainer.dataset.inputId = inputId;
  feedbackContainer.style.cssText = `
    margin-top: 10px;
    padding: 8px;
    border-radius: 4px;
    font-size: 12px;
    display: none;
  `;
  
  toolbox.appendChild(feedbackContainer);
  
  // Add scale display for resize slider
  const resizeCard = toolbox.querySelector('.card:has(#resize)');
  if (resizeCard) {
    const scaleDisplay = document.createElement('span');
    scaleDisplay.className = 'scale-display';
    scaleDisplay.textContent = '100%';
    scaleDisplay.style.cssText = 'font-weight: bold; color: #2563eb;';
    
    const resizeSlider = resizeCard.querySelector('#resize');
    if (resizeSlider) {
      resizeSlider.parentNode.appendChild(scaleDisplay);
    }
  }
}

/**
 * Show processing indicator
 * @param {HTMLElement} toolbox - The toolbox container
 * @param {string} operation - The operation being performed
 */
function showProcessingIndicator(toolbox, operation) {
  const feedback = toolbox.querySelector('.formease-feedback');
  if (feedback) {
    feedback.style.display = 'block';
    feedback.style.backgroundColor = '#dbeafe';
    feedback.style.color = '#1d4ed8';
    feedback.innerHTML = `🔄 ${operation.charAt(0).toUpperCase() + operation.slice(1)}ing file...`;
  }
}

/**
 * Hide processing indicator
 * @param {HTMLElement} toolbox - The toolbox container
 */
function hideProcessingIndicator(toolbox) {
  const feedback = toolbox.querySelector('.formease-feedback');
  if (feedback) {
    setTimeout(() => {
      feedback.style.display = 'none';
    }, 2000); // Hide after 2 seconds
  }
}

/**
 * Show success message
 * @param {HTMLElement} toolbox - The toolbox container
 * @param {string} operation - The completed operation
 */
function showSuccessMessage(toolbox, operation) {
  const feedback = toolbox.querySelector('.formease-feedback');
  if (feedback) {
    feedback.style.display = 'block';
    feedback.style.backgroundColor = '#dcfce7';
    feedback.style.color = '#166534';
    feedback.innerHTML = `✅ File ${operation}ed successfully! Ready for upload.`;
  }
}

/**
 * Show detailed success message with processing statistics
 * @param {HTMLElement} toolbox - The toolbox container
 * @param {string} message - The detailed success message
 */
function showDetailedSuccessMessage(toolbox, message) {
  const feedback = toolbox.querySelector('.formease-feedback');
  if (feedback) {
    feedback.style.display = 'block';
    feedback.style.backgroundColor = '#dcfce7';
    feedback.style.color = '#166534';
    feedback.style.lineHeight = '1.4';
    feedback.innerHTML = message;
  }
}

/**
 * Show error message
 * @param {HTMLElement} toolbox - The toolbox container
 * @param {string} message - The error message
 */
function showError(toolbox, message) {
  const feedback = toolbox.querySelector('.formease-feedback');
  if (feedback) {
    feedback.style.display = 'block';
    feedback.style.backgroundColor = '#fef2f2';
    feedback.style.color = '#dc2626';
    feedback.innerHTML = `❌ ${message}`;
  }
}

/**
 * Watch for dynamically added file inputs
 * Uses MutationObserver to detect new file inputs added to the DOM
 */
function watchForDynamicInputs() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if the added node is a file input
          if (node.tagName === 'INPUT' && node.type === 'file' && !node.dataset.formEaseId) {
            setupFileInput(node);
          }
          
          // Check for file inputs within the added node
          const fileInputs = node.querySelectorAll && node.querySelectorAll('input[type="file"]');
          if (fileInputs) {
            fileInputs.forEach(input => {
              if (!input.dataset.formEaseId) {
                setupFileInput(input);
              }
            });
          }
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('[FormEase] Dynamic input watcher initialized');
}

/**
 * Cleanup function for when the extension is disabled or page unloads
 */
function cleanup() {
  // Clear all stored data
  originalFiles.clear();
  processingState.clear();
  
  // Remove all toolboxes
  document.querySelectorAll('.formease-toolbox').forEach(toolbox => {
    toolbox.remove();
  });
  
  console.log('[FormEase] Cleanup completed');
}

// Initialize FormEase when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeFormEase();
    watchForDynamicInputs();
  });
} else {
  initializeFormEase();
  watchForDynamicInputs();
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);

console.log('[FormEase] Content script loaded and initialized');

document.querySelectorAll('input[type="file"]').forEach((input, index) => {
  console.log(`FormEase detected a file input! (${index + 1})`);
});

