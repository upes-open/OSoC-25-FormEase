console.log("[FormEase] compressVideo.js loaded ✅");

// Add message listener for compress-Video events
window.addEventListener("message", async (event) => {
  if (event.source === window && event.data.type === "compress-Video") {
    const { inputId } = event.data;
    
    console.log(`[FormEase-Video] Processing compress-Video request for input ${inputId}`);
    
    const fileInput = document.querySelector(
      `input[type="file"][data-form-ease-id=${inputId}]`
    );
    
    if (!fileInput || !fileInput.files[0]) {
      console.error("[FormEase-Video] No file found for compression");
      return;
    }
    
    const file = fileInput.files[0];
    await compressVideo(file, inputId);
  }
});

async function compressVideo(file, inputId) {
  const feedback = document.querySelector(".formease-feedback-video");
  const confirmBtn = document.getElementById("confirm-btn");

  feedback.innerHTML = "";
  feedback.style.display = "block";

  if (!file || !file.type.startsWith("video/")) {
    feedback.style.color = "#dc2626";
    feedback.innerHTML = `❌ Unsupported file type: ${file?.type || "N/A"}`;
    return;
  }

  if (!window.FFmpegWASM || !FFmpegWASM.FFmpeg) {
    feedback.style.color = "#dc2626";
    feedback.innerHTML = `❌ FFmpegWASM not available.`;
    console.error("[FormEase] FFmpegWASM not available ❌");
    return;
  }

  const { FFmpeg } = FFmpegWASM;

  const isExtensionContext =
    typeof chrome !== "undefined" &&
    chrome.runtime?.id &&
    location.protocol === "chrome-extension:";

  const corePath = isExtensionContext
    ? chrome.runtime.getURL("scripts/814.ffmpeg.js")
    : "scripts/814.ffmpeg.js";

  const ffmpeg = new FFmpeg({
    corePath,
    log: true,
  });

  try {
    feedback.style.color = "#1d4ed8";
    feedback.innerHTML = `ℹ️ Loading FFmpeg...`;
    await ffmpeg.load();

    const ext = file.name.split(".").pop();
    const inputName = `input.${ext}`;
    const outputName = `output.mp4`;

    await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

    feedback.innerHTML = `🔄 Compressing ${file.name}...`;

    await ffmpeg.exec([
      "-i", inputName,
      "-vcodec", "libx264",
      "-crf", "28",
      "-preset", "veryfast",
      outputName,
    ]);

    const outputData = await ffmpeg.readFile(outputName);
    const blob = new Blob([outputData.buffer], { type: "video/mp4" });

    const compressedFile = new File(
      [blob],
      file.name.replace(/\.\w+$/, ".mp4"),
      { type: "video/mp4", lastModified: Date.now() }
    );

    // Show completion message and reveal confirm button
    const originalSize = (file.size / 1024).toFixed(2);
    const newSize = (blob.size / 1024).toFixed(2);
    const saved = (((file.size - blob.size) / file.size) * 100).toFixed(1);

    feedback.style.color = "#28a745";
    feedback.innerHTML = `
      ✅ <strong>Compression Complete!</strong><br>
      <small>Original: ${originalSize} KB → ${newSize} KB (${saved}% smaller)</small><br>
      <em style="font-size: 12px;">Click "Save Changes" below to inject the file.</em>
    `;

    // Button visibility is now handled by message passing to toolbox
    // confirmBtn.classList.remove("hidden");
    // confirmBtn.style.backgroundColor = "#28a745";
    // confirmBtn.style.borderColor = "#28a745";
    
    // Remove existing event listeners to avoid duplicates
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.addEventListener("click", () => {
      console.log("[FormEase-Video] Confirm Button clicked - injecting video");
      
      // Show loading feedback
      feedback.style.color = "#1d4ed8";
      feedback.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="spinner" style="position: relative; top: 0; left: 0; margin: 0; width: 16px; height: 16px; border-width: 2px;"></div>
          🎥 File is being injected... Please wait.
        </div>
      `;
      newConfirmBtn.disabled = true;
      
      setTimeout(() => {
        // Inject the file
        const targetInput = document.querySelector(`input[type="file"][data-form-ease-id="${inputId}"]`);
        const dt = new DataTransfer();
        dt.items.add(compressedFile);
        targetInput.files = dt.files;
        targetInput.dispatchEvent(new Event("change", { bubbles: true }));

        // Show success message
        feedback.style.color = "#28a745";
        feedback.innerHTML = `
          ✅ <strong>File injected successfully!</strong><br>
          <small>${compressedFile.name} is now ready for upload</small>
        `;

        // Button visibility is now handled by message passing to toolbox
        // newConfirmBtn.classList.add("hidden");
        
        // Dispatch event for additional info display
        const event = new CustomEvent("formease:fileProcessed", {
          detail: {
            inputId,
            originalFile: file,
            processedFile: compressedFile,
            operation: "Video Compression",
          },
        });
        document.dispatchEvent(event);

        // Auto-hide after success
        setTimeout(() => {
          const toolbox = document.querySelector(`.formease-toolbox[data-input-id="${inputId}"]`);
          if (toolbox) toolbox.remove();
        }, 3000);
      }, 500); // Small delay to show loading state
    });

  } catch (err) {
    feedback.style.color = "#dc2626";
    feedback.innerHTML = `❌ Compression failed: ${err.message}`;
    console.error("[FormEase] Compression failed ❌", err);
    // Button visibility is now handled by message passing to toolbox
    // confirmBtn.classList.add("hidden");
  }
}
