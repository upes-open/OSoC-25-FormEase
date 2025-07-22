/**
 * FormEase Content Script
 * Implements seamless file replacement using the DataTransfer API
 * Allows processed files (resized/compressed/converted) to be injected back into form fields
 */

/**
 * Injects a script into the page context to access page-level APIs
 */

console.log("[FormEase] content.js loaded✅");

function injectScript(filePath) {
  const script = document.createElement("script");
  script.src = filePath.startsWith("http")
    ? filePath
    : chrome.runtime.getURL(filePath);
  (document.head || document.documentElement).appendChild(script);
}

function injectScriptInOrder(filePath) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = filePath.startsWith("http")
      ? filePath
      : chrome.runtime.getURL(filePath);
    script.onload = () => {
      console.log(`✅ ${filePath} loaded`);
      resolve();
    };
    script.onerror = (e) => {
      console.error(`❌ Failed to load ${filePath}`, e);
      reject(e);
    };
    (document.head || document.documentElement).appendChild(script);
  });
}

// Inject processing scripts (remove pica.min.js since toolbox.html uses CDN)
// Load the FFmpeg CDN first

(async () => {
  try {
    await injectScriptInOrder("scripts/pdf-lib.min.js");
    await injectScriptInOrder("scripts/pica.min.js");
    await injectScriptInOrder("scripts/resize.js");
    await injectScriptInOrder("scripts/compressVideo.js");
    await injectScriptInOrder("scripts/compress.js");
    await injectScriptInOrder("scripts/convert.js");
    await injectScriptInOrder("scripts/compressPDF.js");
    await injectScriptInOrder("scripts/reset.js");
    console.log(`✅ All Scripts Loaded and Ready to Use.`);
  } catch (err) {
    console.error("❌ Script loading failed:", err);
  }
})();

// Initialise File Input Counter
let fileInputCounter = 0;

let OriginalFile = null;

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

window.addEventListener("message", async (event) => {
  if (event.source !== window) return;

  if (event.data.type === "compress-PDF") {
    const { inputId } = event.data;
    const file = getCurrentFileForInput(inputId);

    if (file && file.type === "application/pdf") {
      try {
        console.log(`[FormEase] 🔧 Compressing PDF for input: ${inputId}`);
        await compressPDF(file, inputId);
      } catch (err) {
        console.error(`[FormEase] ❌ PDF compression failed:`, err);
      }
    }
  }
});
//toolbox.html
document.addEventListener("change", (event) => {
  const input = event.target;
  if (input?.type === "file" && input?.files?.[0]) {
    const file = input.files[0];

    if (file.type.startsWith("video/")) {
      const videoUrl = URL.createObjectURL(file);

      window.postMessage(
        {
          formeaseVideoPreviewUrl: videoUrl,
          formeaseInputId: "video",
        },
        "*"
      );

      console.log("[FormEase] 🎥 Sent video preview URL to toolbox via content.js");
    }
  }
});

window.addEventListener("message", async (event) => {
  if (event.source !== window) return;

  if (event.data.type === "compress-video-result") {
    const { inputId, file: compressedData } = event.data;
    if (!inputId || !compressedData) return;

    console.log(
      `[FormEase] 📥 Received compressed video for input: ${inputId}`
    );

    const input = document.querySelector(
      `input[data-form-ease-id="${inputId}"]`
    );
    if (!input) {
      console.error(`[FormEase] ❌ No input found for ${inputId}`);
      return;
    }
    const compressedBlob = new Blob([compressedData.data], {
      type: compressedData.type,
    });
    const compressedFile = new File([compressedBlob], compressedData.name, {
      type: compressedData.type,
    });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(compressedFile);
    input.files = dataTransfer.files;

    input.dispatchEvent(new Event("change", { bubbles: true }));

    const toolbox = document.querySelector(
      `.formease-toolbox[data-input-id="${inputId}"]`
    );
    if (toolbox) {
      showDetailedSuccessMessage(
        toolbox,
        "✅ Video compression complete and file replaced."
      );
    }

    console.log(
      `[FormEase] ✅ Replaced input ${inputId} with compressed video.`
    );
  }
});

document.addEventListener("DOMContentLoaded", () => {
  document.body.addEventListener("click", async (e) => {
    if (e.target && e.target.id === "compress-btn") {
      const btn = e.target;
      const inputId = btn.closest(".formease-toolbox")?.dataset?.inputId;

      if (!inputId) {
        console.warn("[FormEase] ❌ Could not find inputId for compression.");
        return;
      }

      const input = document.querySelector(`input[type="file"][data-form-ease-id="${inputId}"]`);
      if (!input || !input.files.length) {
        alert("Please upload a video file before compressing.");
        return;
      }

      const file = input.files[0];

      // ✅ Send message to compressVideo.js
      window.postMessage({
        type: "compress-Video",
        file,
        inputId,
      }, "*");

      console.log(`[FormEase] 📦 Sent compress request for inputId: ${inputId}`);
    }
  });
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

// console.warn("watchout! [FormEase] Content script initialized.",window.location.href );

function initializeFormEase() {
  const fileInputs = findAllInputsDeep();
  console.log("✅✅ [FormEase] Found file inputs:", fileInputs);
  fileInputs.forEach((input) => {
    if (!input.dataset.formEaseId) {
      setupFileInput(input);
    }
  });
}

function setupFileInput(input) {
  console.log("✅ [FormEase] Found file inputs:", input);

  if (!input.dataset.formEaseId) {
    const inputId = `formEaseInput-${fileInputCounter++}`;
    input.dataset.formEaseId = inputId;

    console.log(`[FormEase] Assigned new ID to input: ${inputId}`);
  } else {
    console.log(`[FormEase] Input already has ID: ${input.dataset.formEaseId}`);
  }

  const inputId = input.dataset.formEaseId;

  if (!processingState.has(inputId)) {
    processingState.set(inputId, {
      isProcessing: false,
      lastProcessedFile: null,
    });

    console.log(
      `[FormEase] Initialized processing state for input: ${inputId}`
    );
  }

  if (!input.dataset.formEaseListenerAdded) {
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

    // ✅ Mark as listener added
    input.dataset.formEaseListenerAdded = "true";
  }

  if (!input.dataset.formEaseButtonInjected) {
    injectFloatingEditButton(input);
    input.dataset.formEaseButtonInjected = "true";
  }
}
function injectStyles() {
  if (document.getElementById("formease-styles")) return; // Avoid duplicate
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = chrome.runtime.getURL("styles.css");
  link.id = "formease-styles";
  document.head.appendChild(link);
}

function injectFloatingEditButton(input) {
  console.log("injectflotaing edit button working ✅!!!!");
  const editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
  editBtn.className = "formease-edit-btn";
  editBtn.dataset.formEaseInputId = input.dataset.formEaseId;

  if (input.parentNode && input.parentNode.style) {
    input.parentNode.style.position = "relative";
    input.parentNode.appendChild(editBtn);
  }

  editBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const inputId = editBtn.dataset.formEaseInputId;
    const currentFile = getCurrentFileForInput(inputId);

    const toolbox = document.querySelector(
      `.formease-toolbox[data-input-id="${inputId}"]`
    );

    if (toolbox) {
      toolbox.style.display = "block";
      scrollToToolbox(toolbox);
      setupToolboxEventListeners(toolbox, inputId, currentFile);
    } else {
      console.log("[FormEase] No existing toolbox found, creating new one.");
      checkToolboxExistence(
        input,
        input.dataset.formEaseId,
        getCurrentFileForInput(input.dataset.formEaseId)
      );

      waitForToolboxAndScroll(input.dataset.formEaseId);
    }
  });
}

function waitForToolboxAndScroll(inputId) {
  const observer = new MutationObserver((mutations, obs) => {
    const toolbox = document.querySelector(
      `.formease-toolbox[data-input-id="${inputId}"]`
    );
    if (toolbox) {
      scrollToToolbox(toolbox);
      obs.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    const toolbox = document.querySelector(
      `.formease-toolbox[data-input-id="${inputId}"]`
    );

    if (toolbox) scrollToToolbox(toolbox);
  }, 5000);
}

function scrollToToolbox(toolbox) {
  toolbox.scrollIntoView({ behavior: "smooth", block: "center" });
  toolbox.classList.add("highlight");
  setTimeout(() => {
    toolbox.classList.remove("highlight");
  }, 2000);
}

function checkToolboxExistence(input, inputId, file = null) {
  const formEaseId = input.dataset.formEaseId;
  let existingToolbox = document.querySelector(
    `.formease-toolbox[data-input-id="${formEaseId}"]`
  );

  const fileType = file?.type || "";

  if (!existingToolbox) {
    const toolbox = document.createElement("div");
    toolbox.className = `formease-toolbox container-${inputId}`;
    toolbox.dataset.inputId = formEaseId;
    createToolboxForInput(input, inputId, toolbox, file);
    toolbox.dataset.initialized = "true"; // Prevent duplicate creation
  } else if (!existingToolbox.dataset.initialized) {
    existingToolbox.dataset.fileType = fileType;
    createToolboxForInput(input, inputId, existingToolbox, file);
    existingToolbox.dataset.initialized = "true";
  } else {
    existingToolbox.dataset.fileType = fileType;
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
    injectStyles();

    fetch(chrome.runtime.getURL("toolbox.html"))
      .then((response) => response.text())//(file && file.type === "application/pdf") {
      .then((data) => {
        toolbox.innerHTML = data;
        input.parentNode.parentNode.parentNode.appendChild(toolbox);
        // input.parentNode.insertBefore(toolbox, input.nextSibling);
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
//currently did changes in it
function setupToolboxEventListeners(toolbox, inputId, file = null) {
  console.log(
    "[FormEase] setupToolboxEventListeners called for inputId:",
    inputId,
    "with file:",
    file
  );
  if (file) {
    const fileType = file.type;
    toolbox.dataset.fileType = fileType;

    const resizeSection = toolbox.querySelector(".resize-section");
    const compressSection = toolbox.querySelector(".compress-section");
    const convertSection = toolbox.querySelector(".convert-section");
    const compressDocSection = toolbox.querySelector(".compress-doc-section");
    const compressVideoSection = toolbox.querySelector(
      ".compress-video-section"
    );

    // Hide all by default
    [
      resizeSection,
      compressSection,
      convertSection,
      compressDocSection,
      compressVideoSection,
    ].forEach((section) => {
      if (section) section.classList.add("hidden");
    });

    if (fileType.startsWith("image/")) {
      resizeSection?.classList.remove("hidden");
      compressSection?.classList.remove("hidden");
      convertSection?.classList.remove("hidden");
    } else if (fileType === "application/pdf") {
      compressDocSection?.classList.remove("hidden");
    } else if (fileType.startsWith("video/")) {
      compressVideoSection?.classList.remove("hidden");
    }
  }

  const input = document.querySelector(`input[data-form-ease-id="${inputId}"]`);
  const dropdown = toolbox.querySelector("#task");

  const imagePreview = toolbox.querySelector("#image-preview");
  const imagePreviewArea = toolbox.querySelector("#image-preview-area");
  const formeasefeedback = toolbox.querySelector(".formease-feedback");
  const closeBtn = toolbox.querySelector(".formease-close-btn");
  if (closeBtn && !closeBtn.dataset.listenerAdded) {
    closeBtn.addEventListener("click", () => {
      toolbox.style.display = "none"; // Hide toolbox

      const imagePreview = toolbox.querySelector("#image-preview");
      const imagePreviewArea = toolbox.querySelector("#image-preview-area");
      const feedback = toolbox.querySelector(".formease-feedback");

      if (imagePreview && imagePreviewArea) {
        imagePreview.src = "#";
        imagePreviewArea.style.display = "none";
      }

      if (feedback) {
        feedback.innerHTML = "";
        feedback.style.display = "none";
      }

      console.log(`[FormEase] ❌ Closed toolbox for ${inputId}`);
    });
    closeBtn.dataset.listenerAdded = "true";
  }

  if (file && file.type.startsWith("image/")) {
    if (formeasefeedback) {
      formeasefeedback.style.display = "block";
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const sizeKB = (file.size / 1024).toFixed(2);

      if (formeasefeedback) {
        formeasefeedback.innerHTML = `
        <div>Resolution : ${width} X ${height} px</div>
        <div>
        <span style="background-color: #f3f4f6; padding: 4px 6px; border-radius: 4px;">
          Original size : ${sizeKB} KB
        </span><span id="new-size" style="background-color: #f3f4f6; padding: 4px 6px; border-radius: 4px;"></span></div>
      `;
      }

      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      console.error("[FormEase] Error Failed loading initial file info.");
      if (formeasefeedback) {
        const sizeKB = (file.size / 1024).toFixed(2);
        formeasefeedback.innerHTML = `<div> File info :${file.name} (${sizeKB} KB). Cannot display preview</div>`;
        formeasefeedback.style.display = "block";
      }
    };
  } else if (file && file.type === "application/pdf") {
      const blobUrl = URL.createObjectURL(file);

      if (formeasefeedback) {
        formeasefeedback.innerHTML = `
          <iframe
            id="pdfPreviewIframe"
            src="${blobUrl}"
            style="width: 100%; height: 400px; border: 1px solid #ccc;"
          ></iframe>
        `;
        formeasefeedback.style.display = "block";
      }
    } else if (file && file.type.startsWith("video/")) {
        const blobUrl = URL.createObjectURL(file);

        // Prepare new containers
        const previewContainer = document.createElement("div");
        previewContainer.className = "formease-video-preview-container";
        previewContainer.style.marginBottom = "10px";

        const trimControls = document.createElement("div");
        trimControls.className = "formease-video-trim-controls";
        trimControls.style.display = "flex";
        trimControls.style.flexDirection = "column";
        trimControls.style.gap = "10px";

        const playPauseBtn = document.createElement("button");
        playPauseBtn.id = "playPauseBtn";
        playPauseBtn.type = "button";
        playPauseBtn.className = "toolbox-btn";
        playPauseBtn.textContent = "▶️ Play / ⏸ Pause";
        playPauseBtn.style.marginBottom = "10px";

        // Create video preview
        const videoEl = document.createElement("video");
        videoEl.id = "dynamicVideoPreview";
        videoEl.controls = true;
        videoEl.src = blobUrl;
        videoEl.style.width = "100%";
        videoEl.style.maxHeight = "300px";
        videoEl.style.border = "1px solid #ccc";
        videoEl.style.marginBottom = "10px";
        previewContainer.appendChild(videoEl);

        // Time input fields
        const startTimeDiv = document.createElement("div");
        startTimeDiv.innerHTML = `
          <label for="startTime">Start Time (HH:MM:SS):</label>
          <input type="text" id="startTime" placeholder="e.g. 00:00:03" />
        `;

        const endTimeDiv = document.createElement("div");
        endTimeDiv.innerHTML = `
          <label for="endTime">End Time (HH:MM:SS):</label>
          <input type="text" id="endTime" placeholder="e.g. 00:00:10" />
        `;

        trimControls.appendChild(startTimeDiv);
        trimControls.appendChild(endTimeDiv);
        trimControls.appendChild(playPauseBtn);

        // Append to DOM (just after file input or toolbox area)
        const container = document.querySelector("#formease-video-container") || document.body;
        container.innerHTML = ""; // clear previous if needed
        container.appendChild(previewContainer);
        container.appendChild(trimControls);

        // Add play/pause functionality
        playPauseBtn.addEventListener("click", () => {
          if (videoEl.paused) {
            videoEl.play();
          } else {
            videoEl.pause();
          }
        });

        // Keep feedback area separate and clean
        if (formeasefeedback) {
          formeasefeedback.innerHTML = `<p id="video-process-status" style="font-size: 14px; color: #555;"></p>`;
          formeasefeedback.style.display = "block";
        }
      }else {
    if (formeasefeedback) {
      formeasefeedback.innerHTML = "<div>No File Selected.</div>";
      formeasefeedback.style.display = "block";
    }
  }

  const resize = toolbox.querySelector("#resize");
  const resizeScale = toolbox.querySelector("#resize-scale");
  const compress = toolbox.querySelector("#compress");
  const convert = toolbox.querySelector("#convert");
  const resizeSlider = toolbox.querySelector("#resize-range");

  const resizeBtn = toolbox.querySelector("#resize-btn");
  const compressBtn = toolbox.querySelector("#compress-btn");
  const convertBtn = toolbox.querySelector("#convert-btn");

  const resetBtn = toolbox.querySelector("#resetButton");

  const currentFile = getCurrentFileForInput(inputId);

  if (file && file.type === "application/pdf") {
    console.log("[FormEase] PDF File provided to setupToolboxEventListeners.");

    dropdown.classList.add("hidden");
    resizeBtn.classList.add("hidden");
    convertBtn.classList.add("hidden");
    compressBtn.classList.remove("hidden");

    compressBtn.addEventListener("click", () => {
      OriginalFile = currentFile;

      if (currentFile) {
        window.postMessage({ type: "compress-PDF", inputId }, "*");
      }
    });

    if (resetBtn && !resetBtn.dataset.listenerAdded) {
      resetBtn.addEventListener("click", () => {
        if (OriginalFile) {
          window.postMessage({ type: "reset", inputId, OriginalFile }, "*");
          OriginalFile = null;
        }
        resetBtn.dataset.listenerAdded = "true";
      });
    }
  } else if (file && file.type.startsWith("video/")) {
    console.log(
      "[FormEase] Video File provided to setupToolboxEventListeners."
    );

    dropdown.classList.add("hidden");
    resizeBtn.classList.add("hidden");
    convertBtn.classList.add("hidden");
    compressBtn.classList.remove("hidden");

    compressBtn.addEventListener("click", () => {
      OriginalFile = currentFile;

      if (currentFile) {
        window.postMessage({ type: "compress-Video", inputId }, "*");
      }
    });

    if (resetBtn && !resetBtn.dataset.listenerAdded) {
      resetBtn.addEventListener("click", () => {
        if (OriginalFile) {
          window.postMessage({ type: "reset", inputId, OriginalFile }, "*");
          OriginalFile = null;
        }
        resetBtn.dataset.listenerAdded = "true";
      });
    }
  } else if (file && file.type.startsWith("image/")) {
    console.log(
      "[FormEase] Image File provided to setupToolboxEventListeners, attempting to display preview."
    );
    const reader = new FileReader();
    reader.onload = function (e) {
      const loader = toolbox.querySelector(".spinner");

      imagePreview.onerror = () => {
        loader.classList.add("hidden");
        console.error("[FormEase] Error loading image preview.");
        if (formeasefeedback) {
          formeasefeedback.innerHTML = `<div>Error displaying image preview.</div>`;
          formeasefeedback.style.display = "block";
        }
      };

      // Loader untill image loads video
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

      const convertDropdown = document.getElementById("convert-dropdown");
      let mimeType = "";
      convertDropdown.addEventListener("change", (e) => {
        mimeType = e.target.value;
      });

      if (dropdown.value === "resize") {
        resizeScale.classList.remove("hidden");
        resize.classList.remove("hidden");
        compress.classList.add("hidden");
        convert.classList.add("hidden");
        resizeBtn.classList.remove("hidden");
        compressBtn.classList.add("hidden");
        convertBtn.classList.add("hidden");

        if (resizeSlider && !resizeSlider.dataset.listenerAdded) {
          resizeSlider.addEventListener("input", (e) => {
            if (resizeScale) resizeScale.textContent = `${e.target.value}`;
            resizeSlider.dataset.listenerAdded = "true";
          });
        }
        resizeBtn.addEventListener("click", () => {
          OriginalFile = currentFile;

          if (currentFile) {
            window.postMessage({ type: "resize", inputId }, "*");
          }
        });

        if (resetBtn && !resetBtn.dataset.listenerAdded) {
          resetBtn.addEventListener("click", () => {
            if (OriginalFile) {
              window.postMessage({ type: "reset", inputId, OriginalFile }, "*");
              OriginalFile = null;
            }
            resetBtn.dataset.listenerAdded = "true";
          });
        }
      } else if (dropdown.value === "compress") {
        resizeScale.classList.add("hidden");
        compress.classList.remove("hidden");
        resize.classList.add("hidden");
        convert.classList.add("hidden");
        compressBtn.classList.remove("hidden");
        resizeBtn.classList.add("hidden");
        convertBtn.classList.add("hidden");

        compressBtn.addEventListener("click", () => {
          OriginalFile = currentFile;

          if (currentFile) {
            window.postMessage({ type: "compress", inputId }, "*");
          }//revokeObjectURL
        });

        if (resetBtn && !resetBtn.dataset.listenerAdded) {
          resetBtn.addEventListener("click", () => {
            if (OriginalFile) {
              window.postMessage({ type: "reset", inputId, OriginalFile }, "*");
              OriginalFile = null;
            }
            resetBtn.dataset.listenerAdded = "true";
          });
        }
      } else if (dropdown.value === "convert") {
        resizeScale.classList.add("hidden");
        convert.classList.remove("hidden");
        resize.classList.add("hidden");
        compress.classList.add("hidden");
        convertBtn.classList.remove("hidden");
        resizeBtn.classList.add("hidden");
        compressBtn.classList.add("hidden");

        convertBtn.addEventListener("click", () => {
          OriginalFile = currentFile;

          if (currentFile || fileType !== "") {
            window.postMessage({ type: "convert", inputId, mimeType }, "*");
          }
        });

        if (resetBtn && !resetBtn.dataset.listenerAdded) {
          resetBtn.addEventListener("click", () => {
            if (OriginalFile) {
              window.postMessage({ type: "reset", inputId, OriginalFile }, "*");
              OriginalFile = null;
            }
            resetBtn.dataset.listenerAdded = "true";
          });
        }
      } else {
        resizeScale.classList.add("hidden");
        resize.classList.add("hidden");
        compress.classList.add("hidden");
        convert.classList.add("hidden");
        resizeBtn.classList.add("hidden");
        compressBtn.classList.add("hidden");
        convertBtn.classList.add("hidden");
      }
    });
  }
}
function setupVideoPreviewOnly(toolbox, inputId, file) {
  console.log("[FormEase] 🎬 setupVideoPreviewOnly for", inputId);

  const formeasefeedback = toolbox.querySelector(".formease-feedback-video");
  const videoEl = formeasefeedback?.querySelector("video");

  if (!file || !file.type.startsWith("video/")) {
    console.warn("[FormEase] ⚠️ Not a video file");
    formeasefeedback.innerHTML = "<div>❌ Invalid video file</div>";
    formeasefeedback.style.display = "block";
    return;
  }

  if (videoEl) {
    // Revoke old preview if any
    if (videoEl.dataset.blobUrl) {
      URL.revokeObjectURL(videoEl.dataset.blobUrl);
    }

    const blobUrl = URL.createObjectURL(file);
    videoEl.src = blobUrl;
    videoEl.dataset.blobUrl = blobUrl;
    videoEl.style.display = "block";
    videoEl.load();

    const sizeKB = (file.size / 1024).toFixed(1);
    formeasefeedback.innerHTML = `<div>🎥 Previewing: ${file.name} (${sizeKB} KB)</div>`;
    formeasefeedback.style.display = "block";

    console.log("[FormEase] ✅ Video preview updated");
  } else {
    console.error("[FormEase] ❌ Video tag not found in toolbox");
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

  if (type !== "fileProcessed" || !input || !file) return;

  if (state) {
    state.isProcessing = false;
    state.lastProcessedFile = file;
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

  // for pdf
  const pdfFeedback = document.createElement("div");
  pdfFeedback.className = "formease-feedback-pdf";
  pdfFeedback.style.marginTop = "5px";
  pdfFeedback.style.color = "#007bff";

  // for video
  const videoFeedback = document.createElement("div");
  videoFeedback.className = "formease-feedback-video";
  videoFeedback.style.marginTop = "5px";
  videoFeedback.style.color = "#28a745";

  toolbox.appendChild(feedbackContainer);
  toolbox.appendChild(pdfFeedback);
  toolbox.appendChild(videoFeedback);
}

function findAllInputsDeep(selector = 'input[type="file"]') {
  const results = [];

  function searchIn(node) {
    if (!node || typeof node.querySelectorAll !== "function") {
      return;
    }

    if (node.shadowRoot) {
      searchIn(node.shadowRoot);
    }

    const found = node.querySelectorAll(selector);
    results.push(...Array.from(found));

    for (const child of node.children || []) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        searchIn(child);
      }
    }
  }

  searchIn(document.body);
  return results;
}

function watchForDynamicInputs() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (
            node.tagName === "INPUT" &&
            node.type === "file" &&
            !node.dataset.formEaseId
          ) {
            setupFileInput(node);
          }
          const newFileInputs = findAllInputsDeepInNode(
            node,
            'input[type="file"]'
          );
          newFileInputs.forEach((input) => {
            if (!input.dataset.formEaseId) setupFileInput(input);
          });
        }

        //
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log("[FormEase] Dynamic input watcher initialized");
}

function findAllInputsDeepInNode(rootNode, selector = 'input[type="file"]') {
  const results = [];
  function search(node) {
    if (!node || typeof node.querySelectorAll !== "function") return;

    const found = node.querySelectorAll(selector);
    results.push(...Array.from(found));

    if (node.shadowRoot) {
      search(node.shadowRoot);
    }

    for (const child of node.children || []) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        search(child);
      }
    }
  }

  search(rootNode);
  return results;
}

document.addEventListener("DOMContentLoaded", () => {
  console.log(
    "[FormEase] DOMContentLoaded. Performing initial scan for inputs."
  );
  const initialInputs = findAllInputsDeep();
  console.log("[FormEase] Found file inputs initially:", initialInputs.length);
  initialInputs.forEach((input) => {
    if (!input.dataset.formEaseId) {
      setupFileInput(input);
    }
  });

  watchForDynamicInputs(); // Start watching for new inputs after initial scan
});

function cleanup() {
  originalFiles.clear();
  processingState.clear();
  document
    .querySelectorAll(".formease-toolbox")
    .forEach((toolbox) => toolbox.remove());
  console.log("[FormEase] Cleanup completed");
}

function initFormEaseSafely() {
  console.log("[FormEase] initFormEaseSafely starting...");
  initializeFormEase();
  watchForDynamicInputs();

  // Fallback retry if inputs load late
  let retries = 0;
  const maxRetries = 10;
  const interval = setInterval(() => {
    const inputs = findAllInputsDeep();
    console.log(`[FormEase] Retry ${retries}: found ${inputs.length} inputs`);
    if (inputs.length > 0 || retries >= maxRetries) {
      clearInterval(interval);
    } else {
      initializeFormEase();
    }
    retries++;
  }, 1500);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFormEaseSafely);
} else {
  initFormEaseSafely();
}

window.addEventListener("beforeunload", cleanup);
console.log("[FormEase] Content script loaded and initialized");
