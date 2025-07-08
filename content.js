/**
 * FormEase Content Script
 * Implements seamless file replacement using the DataTransfer API
 * Allows processed files (resized/compressed/converted) to be injected back into form fields
 */

/**
 * Injects a script into the page context to access page-level APIs
 */
function injectScript(filePath) {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL(filePath);
  (document.head || document.documentElement).appendChild(script);
}

// Inject processing scripts (remove pica.min.js since toolbox.html uses CDN)
injectScript("scripts/compress.js");
injectScript("scripts/convert.js");

// Initialise File Input Counter
let fileInputCounter = 0;

// Drag & Drop Processing
const dropZones = document.querySelectorAll(".drop-zone");
const inputs = document.querySelectorAll(".input-file");

// Preventing Default Behaviour of Windows
document.addEventListener("dragover", (e) => {
  e.preventDefault();

  const toolboxes = document.querySelectorAll(".formease-toolbox");
  for (let toolbox of toolboxes) {
    toolbox.classList.add("hidden");
  }

  for (let dropZone of dropZones) {
    dropZone.classList.remove("hidden");
  }

  for (let input of inputs) {
    input.classList.add("hidden");
  }
});

document.addEventListener("drop", (e) => {
  e.preventDefault();

  const toolboxes = document.querySelectorAll(".formease-toolbox");
  for (let toolbox of toolboxes) {
    toolbox.classList.remove("hidden");
  }

  for (let dropZone of dropZones) {
    dropZone.classList.add("hidden");
  }
  for (let input of inputs) {
    input.classList.remove("hidden");
  }
});

// Drop Box Event Listeners
for (let dropZone of dropZones) {
  // Control styling on drag
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  });

  // Drop functionality
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault(); // change
    dropZone.classList.remove("dragover");
    const input =
      dropZone.id === "profile-drop-zone"
        ? document.getElementById("profilePhoto")
        : dropZone.id === "product-drop-zone"
        ? document.getElementById("productImage")
        : dropZone.id === "banner-drop-zone"
        ? document.getElementById("bannerImage")
        : document.getElementById("documentFile");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      if (!input.dataset.formEaseId) {
        const inputId = `formEaseInput-${fileInputCounter++}`;
        input.dataset.formEaseId = inputId;
      }
      if (dropZone.id === "doc-drop-zone" && file.type === "application/pdf") {
        console.log("[FormEase] PDF dropped, no toolbox created.");
      } else if (file.type.startsWith("image/")) {
        checkToolboxExistence(input, input.dataset.formEaseId, file);
      } else {
        console.log(
          "[FormEase] Invalid file type for drop zone, no toolbox created."
        );
      }
    }
  });
}

// Normal File Input Processing
const originalFiles = new Map();
const processingState = new Map();

function initializeFormEase() {
  const fileInputs = document.querySelectorAll('input[type="file"]');
  fileInputs.forEach((input) => {
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
    lastProcessedFile: null,
  });

  input.addEventListener("change", function (event) {
    console.log(
      "[FormEase] File input change event fired.",
      event.target.files
    );
    if (event.target.files && event.target.files[0]) {
      originalFiles.set(inputId, event.target.files[0]);
      console.log(
        `[FormEase] Original file stored for input ${inputId}:`,
        event.target.files[0].name
      );
      checkToolboxExistence(input, inputId, event.target.files[0]);
    } else {
      // Clear preview if file selection is cancelled
      const toolbox = document.querySelector(
        `.formease-toolbox[data-input-id="${inputId}"]`
      );
      const imagePreview = toolbox?.querySelector("#image-preview");
      const imagePreviewArea = toolbox?.querySelector("#image-preview-area");
      if (imagePreview && imagePreviewArea) {
        imagePreview.src = "#";
        imagePreviewArea.style.display = "none";
        console.log("[FormEase] File selection cancelled, preview cleared.");
      }
    }
  });

  injectFloatingEditButton(input);
}

function injectFloatingEditButton(input) {
  const editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
  editBtn.className = "formease-edit-btn";

  if (input.parentNode && input.parentNode.style) {
    input.parentNode.style.position = "relative";
    input.parentNode.appendChild(editBtn);
  }

  editBtn.addEventListener("click", () => {
    const toolbox = document.querySelector(
      `.formease-toolbox[data-input-id="${input.dataset.formEaseId}"]`
    );
    if (toolbox) {
      toolbox.scrollIntoView({ behavior: "smooth", block: "center" });
      toolbox.classList.add("highlight");
      setTimeout(() => toolbox.classList.remove("highlight"), 2000);
    }
    console.log("Toolbox opening...");
  });
}

function checkToolboxExistence(input, inputId, file = null) {
  const formEaseId = input.dataset.formEaseId;
  let existingToolbox = document.querySelector(
    `.formease-toolbox[data-input-id="${formEaseId}"]`
  );

  // Suppress toolbox for non-image files
  if (file && !file.type.startsWith("image/")) {
    if (existingToolbox) {
      existingToolbox.remove();
      console.log(
        `[FormEase] Removed toolbox for non-image input: ${formEaseId}`
      );
    }
    return;
  }

  if (!existingToolbox) {
    const toolbox = document.createElement("div");
    toolbox.className = `formease-toolbox container-${inputId}`;
    createToolboxForInput(input, inputId, toolbox, file);
    toolbox.dataset.initialized = "true"; // Prevent duplicate creation
  } else if (!existingToolbox.dataset.initialized) {
    createToolboxForInput(input, inputId, existingToolbox, file);
    existingToolbox.dataset.initialized = "true";
  } else {
    console.log(
      `[FormEase] Reusing existing toolbox for input: ${formEaseId}, updating preview`
    );
    setupToolboxEventListeners(existingToolbox, formEaseId, file);
    existingToolbox.style.display = "block"; // Ensure visibility
  }
}

function createToolboxForInput(input, inputId, toolbox, file = null) {
  if (toolbox) {
    toolbox.dataset.inputId = input.dataset.formEaseId;
    console.log(
      "[FormEase] createToolboxForInput called for inputId:",
      inputId,
      "with file:",
      file
    );

    fetch(chrome.runtime.getURL("toolbox.html"))
      .then((response) => response.text())
      .then((data) => {
        toolbox.innerHTML = data;
        input.parentNode.insertBefore(toolbox, input.nextSibling);
        console.log("[FormEase] Toolbox inserted into DOM.", toolbox);

        setupToolboxEventListeners(toolbox, input.dataset.formEaseId, file);
        addVisualFeedback(toolbox, input.dataset.formEaseId);

        console.log(`[FormEase] Toolbox created for input ${inputId}`);
      })
      .catch((error) =>
        console.error("[FormEase] Failed to load toolbox:", error)
      );
  }
}

function setupToolboxEventListeners(toolbox, inputId, file = null) {
  console.log(
    "[FormEase] setupToolboxEventListeners called for inputId:",
    inputId,
    "with file:",
    file
  );
  const input = document.querySelector(`input[data-form-ease-id="${inputId}"]`);
  const dropdown = toolbox.querySelector("#task");

  if (!file || !file.type.startsWith("image/")) {
    toolbox.style.display = "none";
    return;
  }

  const resolutionDisplay = toolbox.querySelector("#image-resolution");
  const sizeComparison = toolbox.querySelector("#size-comparison");

  if (file && resolutionDisplay) {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const sizeKB = (file.size / 1024).toFixed(2);

      resolutionDisplay.textContent = `Resolution: ${width} x ${height} px`;

      if (sizeComparison) {
        sizeComparison.innerHTML = `
        <span style="background-color: #f3f4f6; padding: 4px 6px; border-radius: 4px;">
          Original: ${sizeKB} KB
        </span><span id="new-size" style="background-color: #f3f4f6; padding: 4px 6px; border-radius: 4px;"></span>
      `;
      }

      URL.revokeObjectURL(img.src);
    };
  }

  const resize = toolbox.querySelector("#resize");
  const resizeScale = toolbox.querySelector("#resize-scale");
  const compress = toolbox.querySelector("#compress");
  const convert = toolbox.querySelector("#convert");
  const resizeSlider = toolbox.querySelector("#resize-range");
  const applyBtn = toolbox.querySelector("#apply");

  // Display image preview
  if (file) {
    console.log(
      "[FormEase] File provided to setupToolboxEventListeners, attempting to display preview."
    );
    const reader = new FileReader();
    reader.onload = function (e) {
      const imagePreview = toolbox.querySelector("#image-preview");
      const imagePreviewArea = toolbox.querySelector("#image-preview-area");
      const loader = toolbox.querySelector(".spinner");

      // Loader untill image loads
      imagePreview.onload = () => {
        loader.classList.add("hidden");
      };

      console.log(
        "[FormEase] FileReader onload fired. imagePreview:",
        imagePreview,
        "imagePreviewArea:",
        imagePreviewArea
      );
      if (imagePreview && imagePreviewArea) {
        imagePreview.src = e.target.result;
        imagePreviewArea.style.display = "block";
        console.log("[FormEase] Image preview updated and displayed.");
      } else {
        console.log("[FormEase] Image preview elements not found in toolbox.");
      }
    };
    reader.readAsDataURL(file);
    console.log("[FormEase] FileReader readAsDataURL called.");
  }

  if (dropdown && !dropdown.dataset.listenerAdded) {
    dropdown.addEventListener("change", (e) => {
      dropdown.value = e.target.value;
      dropdown.dataset.listenerAdded = "true";

      if (dropdown.value === "resize") {
        resizeScale.classList.remove("hidden");
        resize.classList.remove("hidden");
        compress.classList.add("hidden");
        convert.classList.add("hidden");
        applyBtn.classList.remove("hidden");
        if (resizeSlider && !resizeSlider.dataset.listenerAdded) {
          resizeSlider.addEventListener("input", (e) => {
            if (resizeScale) resizeScale.textContent = `${e.target.value}`;
            resizeSlider.dataset.listenerAdded = "true";
          });
        }
        if (applyBtn && !applyBtn.dataset.listenerAdded) {
          applyBtn.addEventListener("click", () => {
            const currentFile = getCurrentFileForInput(inputId);
            if (currentFile) {
              const img = new Image();

              img.src = URL.createObjectURL(currentFile);
              img.onload = () => {
                if (img.width > 1600 || img.height > 1600) {
                  window.postMessage({ type: "triggerApply", inputId }, "*");
                } else {
                  showError(
                    toolbox,
                    "Resolution is already under 1600x1600px, no resize needed."
                  );
                }
                URL.revokeObjectURL(img.src);
              };
            }
            applyBtn.dataset.listenerAdded = "true";
          });
        }
      } else if (dropdown.value === "compress") {
        resizeScale.classList.add("hidden");
        compress.classList.remove("hidden");
        resize.classList.add("hidden");
        convert.classList.add("hidden");
        applyBtn.classList.remove("hidden");
        if (applyBtn && !applyBtn.dataset.listenerAdded) {
          applyBtn.addEventListener("click", () => {
            const currentFile = getCurrentFileForInput(inputId);
            if (currentFile && currentFile.size > 1024 * 1024) {
              // 1MB in bytes
              processFile("compress", currentFile, { quality: 0.7 }, inputId);
            } else {
              showError(
                toolbox,
                "File size is already under 1MB, no compression needed."
              );
            }
            applyBtn.dataset.listenerAdded = "true";
          });
        }
      } else if (dropdown.value === "convert") {
        resizeScale.classList.add("hidden");
        convert.classList.remove("hidden");
        resize.classList.add("hidden");
        compress.classList.add("hidden");
        applyBtn.classList.remove("hidden");
        if (applyBtn && !applyBtn.dataset.listenerAdded) {
          applyBtn.addEventListener("click", () => {
            const currentFile = getCurrentFileForInput(inputId);
            if (currentFile) {
              processFile("convert", currentFile, { format: "jpeg" }, inputId);
            } else {
              showError(toolbox, "Please select a file first");
            }
            applyBtn.dataset.listenerAdded = "true";
          });
        }
      } else {
        resizeScale.classList.add("hidden");
        resize.classList.add("hidden");
        compress.classList.add("hidden");
        convert.classList.add("hidden");
        applyBtn.classList.add("hidden");
      }
    });
  }
}

const submitBtns = document.querySelectorAll(".submit-btn");
for (let submitBtn of submitBtns) {
  submitBtn.addEventListener("click", () => {
    closeToolboxOnSubmit(submitBtn);
  });
}

function closeToolboxOnSubmit(submitBtn) {
  const inputId = submitBtn.closest("form").querySelector('input[type="file"]')
    ?.dataset.formEaseId;
  if (inputId) {
    const toolbox = document.querySelector(
      `.formease-toolbox[data-input-id="${inputId}"]`
    );
    if (toolbox) {
      toolbox.remove();
      console.log(`[FormEase] Removed toolbox for input ${inputId} on submit`);
      originalFiles.delete(inputId);
      processingState.delete(inputId);
    }
  }
}

function getCurrentFileForInput(inputId) {
  const input = document.querySelector(`input[data-form-ease-id="${inputId}"]`);
  if (!input) return null;
  return input.files?.[0] || originalFiles.get(inputId) || null;
}

function processFile(operation, file, options, inputId) {
  const toolbox = document.querySelector(
    `.formease-toolbox[data-input-id="${inputId}"]`
  );
  const state = processingState.get(inputId);
  if (state) state.isProcessing = true;

  showProcessingIndicator(toolbox, operation);

  const timeoutId = setTimeout(() => {
    showError(toolbox, `${operation} operation timed out`);
    hideProcessingIndicator(toolbox);
    if (state) state.isProcessing = false;
  }, 30000);

  if (operation !== "resize") {
    // Skip resize, handled by toolbox.html
    window.postMessage(
      {
        type: operation,
        file,
        inputId,
        timeoutId,
        ...options,
      },
      "*"
    );
  }
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  const { type, inputId, file, error, timeoutId, originalOperation } =
    event.data;
  const toolbox = document.querySelector(
    `.formease-toolbox[data-input-id="${inputId}"]`
  );
  const input = document.querySelector(`input[data-form-ease-id="${inputId}"]`);
  const state = processingState.get(inputId);

  if (timeoutId) clearTimeout(timeoutId);

  if (type === "fileProcessingError") {
    showError(toolbox, `${originalOperation} failed: ${error}`);
    hideProcessingIndicator(toolbox);
    if (state) state.isProcessing = false;
    return;
  }

  if (type === "storeOriginal") {
    originalFiles.set(inputId, file);
    return;
  }

  if (type === "triggerApply") {
    const applyButton = toolbox?.querySelector("#apply");
    if (applyButton) applyButton.click(); // Trigger toolbox.html's apply logic
    return;
  }

  if (type !== "fileProcessed" || !input || !file) return;

  if (state) {
    state.isProcessing = false;
    state.lastProcessedFile = file;
  }

  try {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;

    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("input", { bubbles: true }));

    if (input.checkValidity) input.checkValidity();

    showDetailedSuccessMessage(
      toolbox,
      `✅ File ${originalOperation}ed successfully! Ready for upload.`
    );

    const customEvent = new CustomEvent("formease:fileProcessed", {
      detail: {
        inputId,
        originalFile: originalFiles.get(inputId),
        processedFile: file,
      },
      bubbles: true,
    });
    input.dispatchEvent(customEvent);
  } catch (err) {
    console.error("[FormEase] Replacement failed:", err);
    showError(toolbox, "Failed to update file. Please try again.");
  }

  // Handle Reset Request
  if (type === "requestReset") {
    const input = document.querySelector(
      `input[data-form-ease-id="${inputId}"]`
    );
    const toolbox = document.querySelector(
      `.formease-toolbox[data-input-id="${inputId}"]`
    );
    const feedbackArea = toolbox?.querySelector(".formease-feedback");

    if (!input) {
      showError(toolbox, "Input not found.");
      return;
    }

    if (originalFiles && originalFiles.has(inputId)) {
      const originalFile = originalFiles.get(inputId);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(originalFile);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));

      showDetailedSuccessMessage(toolbox, "Original file restored.");
      if (feedbackArea) {
        feedbackArea.innerHTML = "";
        const imagePreview = toolbox.querySelector("#image-preview");
        const imagePreviewArea = toolbox.querySelector("#image-preview-area");
        if (imagePreview && imagePreviewArea) {
          imagePreview.src = "#";
          imagePreviewArea.style.display = "none";
        }
        setTimeout(() => (feedbackArea.style.display = "none"), 3000);
      }
    } else {
      showError(toolbox, "No original file found to reset.");
      if (feedbackArea)
        setTimeout(() => (feedbackArea.style.display = "none"), 3000);
    }
  }
});

function showProcessingIndicator(toolbox, operation) {
  const feedback = toolbox.querySelector(".formease-toolbox");
  if (feedback) {
    feedback.style.display = "block";
    feedback.style.backgroundColor = "#dbeafe";
    feedback.style.color = "#1d4ed8";
    feedback.innerHTML = `🔄 ${operation}ing file...`;
  }
}

function hideProcessingIndicator(toolbox) {
  const feedback = toolbox.querySelector(".formease-toolbox");
  if (feedback) {
    setTimeout(() => {
      feedback.style.display = "none";
    }, 2000);
  }
}

function showError(toolbox, message) {
  const feedback = toolbox.querySelector(".formease-toolbox");
  if (feedback) {
    feedback.style.display = "block";
    feedback.style.backgroundColor = "#fef2f2";
    feedback.style.color = "#dc2626";
    feedback.innerHTML = `❌ ${message}`;
  }
}

function showDetailedSuccessMessage(toolbox, message) {
  const feedback = toolbox.querySelector(".formease-toolbox");
  if (feedback) {
    feedback.style.display = "block";
    feedback.style.backgroundColor = "#dcfce7";
    feedback.style.color = "#166534";
    feedback.style.lineHeight = "1.4";
    feedback.innerHTML = message;
  }
}

function addVisualFeedback(toolbox, inputId) {
  const feedbackContainer = document.createElement("div");
  feedbackContainer.className = "formease-feedback";
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
        if (
          node.tagName === "INPUT" &&
          node.type === "file" &&
          !node.dataset.formEaseId
        ) {
          setupFileInput(node);
        }
        const fileInputs = node.querySelectorAll?.('input[type="file"]') || [];
        fileInputs.forEach((input) => {
          if (!input.dataset.formEaseId) setupFileInput(input);
        });
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log("[FormEase] Dynamic input watcher initialized");
}

function cleanup() {
  originalFiles.clear();
  processingState.clear();
  document
    .querySelectorAll(".formease-toolbox")
    .forEach((toolbox) => toolbox.remove());
  console.log("[FormEase] Cleanup completed");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initializeFormEase();
    watchForDynamicInputs();
  });
} else {
  initializeFormEase();
  watchForDynamicInputs();
}

window.addEventListener("beforeunload", cleanup);
console.log("[FormEase] Content script loaded and initialized");
