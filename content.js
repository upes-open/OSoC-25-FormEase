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

// Inject processing scripts
injectScript("scripts/pica.min.js");
injectScript("scripts/resize.js");
injectScript("scripts/compress.js");
injectScript("scripts/convert.js");

let fileInputCounter = 0;
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
      if (event.target.name == "profilePhoto") {
        checkToolboxExistence(input, 0, event.target.files[0]);
      } else {
        checkToolboxExistence(input, 1, event.target.files[0]);
      }
    } else {
      // Clear preview if file selection is cancelled
      const toolbox = document.querySelector(
        `.formease-toolbox[data-input-id="${inputId}"]`
      );
      const imagePreview = toolbox.querySelector("#image-preview");
      const imagePreviewArea = toolbox.querySelector("#image-preview-area");
      if (imagePreview && imagePreviewArea) {
        imagePreview.src = "#";
        imagePreviewArea.style.display = "none";
        console.log("[FormEase] File selection cancelled, preview cleared.");
      }
    }
  });

  injectFloatingEditButton(input); // <- Shagun's addition
}

function injectFloatingEditButton(input) {
  const editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
  editBtn.className = "formease-edit-btn";
  /* removed the styling which was giving through js instead of that used external css */

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
  if (inputId == 0) {
    const profileToolbox = document.querySelector(".container-0");
    if (!profileToolbox) {
      const toolbox = document.createElement("div");
      toolbox.className = "container-0";
      createToolboxForInput(input, inputId, toolbox);
    }
  } else {
    const documentToolbox = document.querySelector(".container-1");
    if (!documentToolbox) {
      const toolbox = document.createElement("div");
      toolbox.className = "container-1";
      createToolboxForInput(input, inputId, toolbox, file);
    }
  }
}

function createToolboxForInput(input, inputId, toolbox, file = null) {
  if (toolbox) {
    toolbox.dataset.inputId = inputId;
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
        setupToolboxEventListeners(toolbox, inputId, file);
        addVisualFeedback(toolbox, inputId);
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

  const resize = toolbox.querySelector("#resize");
  const resizeScale = toolbox.querySelector("#resize-scale");

  const compress = toolbox.querySelector("#compress");
  const convert = toolbox.querySelector("#convert");
  const resizeSlider = toolbox.querySelector("#resize-range");
  const applyBtn = toolbox.querySelector("#apply");

  // Display image preview if a file is provided
  if (file) {
    console.log(
      "[FormEase] File provided to setupToolboxEventListeners, attempting to display preview."
    );
    const reader = new FileReader();
    reader.onload = function (e) {
      const imagePreview = toolbox.querySelector("#image-preview");
      const imagePreviewArea = toolbox.querySelector("#image-preview-area");
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
  } else {
    console.log(
      "[FormEase] No file provided to setupToolboxEventListeners for preview."
    );
  }

  dropdown.addEventListener("change", (e) => {
    dropdown.value = e.target.value;

    if (dropdown.value == "resize") {
      resizeScale.classList.remove("hidden");
      resize.classList.remove("hidden");
      compress.classList.add("hidden");
      convert.classList.add("hidden");
      applyBtn.classList.remove("hidden");
      resizeSlider.addEventListener("input", (e) => {
        if (resizeScale) {
          resizeScale.textContent = `${e.target.value}%`;
        }
      });

      applyBtn.addEventListener("click", () => {
        const scale = resizeSlider.value;
        const currentFile = getCurrentFileForInput(inputId);
        if (currentFile) {
          processFile(
            "resize",
            currentFile,
            { scale: parseFloat(scale) },
            inputId
          );
        } else {
          showError(toolbox, "Please select a file first");
        }
      });
    } else if (dropdown.value == "compress") {
      resizeScale.classList.add("hidden");
      compress.classList.remove("hidden");
      resize.classList.add("hidden");
      convert.classList.add("hidden");
      applyBtn.classList.remove("hidden");
      applyBtn.addEventListener("click", () => {
        const currentFile = getCurrentFileForInput(inputId);
        if (currentFile) {
          processFile("compress", currentFile, { quality: 0.7 }, inputId);
        } else {
          showError(toolbox, "Please select a file first");
        }
      });
    } else if (dropdown.value == "convert") {
      resizeScale.classList.add("hidden");
      convert.classList.remove("hidden");
      resize.classList.add("hidden");
      compress.classList.add("hidden");
      applyBtn.classList.remove("hidden");
      applyBtn.addEventListener("click", () => {
        const currentFile = getCurrentFileForInput(inputId);
        if (currentFile) {
          processFile("convert", currentFile, { format: "jpeg" }, inputId);
        } else {
          showError(toolbox, "Please select a file first");
        }
      });
    } else {
      resizeScale.classList.add("hidden");
      resize.classList.add("hidden");
      compress.classList.add("hidden");
      convert.classList.add("hidden");
      applyBtn.classList.add("hidden");
    }
  });
}

const submitBtns = document.querySelectorAll(".submit-btn");
for (let submitBtn of submitBtns) {
  submitBtn.addEventListener("click", () => {
    closeToolboxOnSubmit(submitBtn.innerText);
  });
}

function closeToolboxOnSubmit(toolboxName) {
  if (toolboxName === "Upload Profile") {
    let profileToolbox = document.querySelector(".container-0");
    console.log(profileToolbox);
    if (profileToolbox) {
      profileToolbox.remove();
    }
  } else {
    let documentToolbox = document.querySelector(".container-1");
    console.log(documentToolbox);
    if (documentToolbox) {
      documentToolbox.remove();
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
    const { inputId } = event.data;
    const input = document.querySelector(
      `input[data-form-ease-id="${inputId}"]`
    );
    const toolbox = document.querySelector(
      `.formease-toolbox[data-input-id="${inputId}"]`
    );
    const feedbackArea = toolbox.querySelector(".formease-feedback");

    if (!input) {
      showError(toolbox, "Input not found.");
      return;
    }

    if (originalFiles && originalFiles.has(inputId)) {
      const originalFile = originalFiles.get(inputId);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(originalFile);
      const hiddenInput = document.createElement("input");
      hiddenInput.type = "file";
      hiddenInput.style.display = "none";
      hiddenInput.files = dataTransfer.files;
      input.parentNode.insertBefore(hiddenInput, input);
      input.parentNode.removeChild(input);
      input.parentNode.appendChild(input);
      hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));

      showDetailedSuccessMessage(toolbox, "Original file restored.");
      feedbackArea.innerHTML = ""; // Clear success messages
      // Clear previews
      const imagePreview = toolbox.querySelector("#image-preview");
      const imagePreviewArea = toolbox.querySelector("#image-preview-area");
      if (imagePreview && imagePreviewArea) {
        imagePreview.src = "#";
        imagePreviewArea.style.display = "none";
      }
      setTimeout(() => (feedbackArea.style.display = "none"), 3000);
    } else {
      showError(toolbox, "No original file found to reset.");
      setTimeout(() => (feedbackArea.style.display = "none"), 3000);
    }
  }
});

function showProcessingIndicator(toolbox, operation) {
  const feedback = toolbox.querySelector(".formease-feedback");
  if (feedback) {
    feedback.style.display = "block";
    feedback.style.backgroundColor = "#dbeafe";
    feedback.style.color = "#1d4ed8";
    feedback.innerHTML = `🔄 ${operation}ing file...`;
  }
}

function hideProcessingIndicator(toolbox) {
  const feedback = toolbox.querySelector(".formease-feedback");
  if (feedback) {
    setTimeout(() => {
      feedback.style.display = "none";
    }, 2000);
  }
}

function showError(toolbox, message) {
  const feedback = toolbox.querySelector(".formease-feedback");
  if (feedback) {
    feedback.style.display = "block";
    feedback.style.backgroundColor = "#fef2f2";
    feedback.style.color = "#dc2626";
    feedback.innerHTML = `❌ ${message}`;
  }
}

function showDetailedSuccessMessage(toolbox, message) {
  const feedback = toolbox.querySelector(".formease-feedback");
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
