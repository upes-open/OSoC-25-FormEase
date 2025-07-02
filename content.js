
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
// FormEase Content Script (Enhanced with Floating Edit Button)

function injectScript(filePath) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(filePath);
  (document.head || document.documentElement).appendChild(script);
}

injectScript('scripts/pica.min.js');
injectScript('scripts/resize.js');
injectScript('scripts/compress.js');
injectScript('scripts/convert.js');

let fileInputCounter = 0;
const originalFiles = new Map();
const processingState = new Map();

function initializeFormEase() {
  const fileInputs = document.querySelectorAll('input[type="file"]');
  fileInputs.forEach(input => {
    if (!input.dataset.formEaseId) {
      setupFileInput(input);
    }
  });
}

function setupFileInput(input) {
  const inputId = `formEaseInput-${fileInputCounter++}`;
  input.dataset.formEaseId = inputId;

  processingState.set(inputId, {
    isProcessing: false,
    lastProcessedFile: null
  });

  input.addEventListener('change', function(event) {
    if (event.target.files && event.target.files[0]) {
      originalFiles.set(inputId, event.target.files[0]);
      console.log(`[FormEase] Original file stored for input ${inputId}:`, event.target.files[0].name);
    }
  });

  createToolboxForInput(input, inputId);
  injectFloatingEditButton(input);
}

function createToolboxForInput(input, inputId) {
  const toolbox = document.createElement('div');
  toolbox.className = 'formease-toolbox';
  toolbox.dataset.inputId = inputId;

  fetch(chrome.runtime.getURL('toolbox.html'))
    .then(response => response.text())
    .then(data => {
      toolbox.innerHTML = data;
      input.parentNode.insertBefore(toolbox, input.nextSibling);
      setupToolboxEventListeners(toolbox, inputId);
      addVisualFeedback(toolbox, inputId);
      console.log(`[FormEase] Toolbox created for input ${inputId}`);
    })
    .catch(error => console.error('[FormEase] Failed to load toolbox:', error));
}

function injectFloatingEditButton(input) {
  const editBtn = document.createElement('button');
  editBtn.textContent = 'Edit';
  editBtn.className = 'formease-edit-btn';
  editBtn.style.cssText = `
    position: absolute;
    right: 5px;
    top: 5px;
    z-index: 9999;
    padding: 4px 10px;
    background-color: #2563eb;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
  `;

  if (input.parentNode && input.parentNode.style) {
    input.parentNode.style.position = 'relative';
    input.parentNode.appendChild(editBtn);
  }

  editBtn.addEventListener('click', () => {
    const toolbox = document.querySelector(`.formease-toolbox[data-input-id="${input.dataset.formEaseId}"]`);
    if (toolbox) {
      toolbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toolbox.classList.add('highlight');
      setTimeout(() => toolbox.classList.remove('highlight'), 2000);
    }
    console.log("Toolbox opening...");
  });
}

function addVisualFeedback(toolbox, inputId) {
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
}

function watchForDynamicInputs() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'INPUT' && node.type === 'file' && !node.dataset.formEaseId) {
            setupFileInput(node);
          }
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
  observer.observe(document.body, { childList: true, subtree: true });
  console.log('[FormEase] Dynamic input watcher initialized');
}

function cleanup() {
  originalFiles.clear();
  processingState.clear();
  document.querySelectorAll('.formease-toolbox').forEach(toolbox => toolbox.remove());
  console.log('[FormEase] Cleanup completed');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeFormEase();
    watchForDynamicInputs();
  });
} else {
  initializeFormEase();
  watchForDynamicInputs();
}

window.addEventListener('beforeunload', cleanup);

console.log('[FormEase] Content script loaded and initialized');
