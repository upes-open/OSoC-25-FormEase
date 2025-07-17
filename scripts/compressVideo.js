console.log("[FormEase] compressVideo.js loaded ✅");

async function compressVideo(file, inputId) {
  const feedback = document.querySelector(".formease-feedback-video");
  const confirmBtn = document.getElementById("confirm-btn"); // This button isn't directly used as a trigger within this function's scope, but is fetched.

  feedback.innerHTML = "";
  feedback.style.display = "block";
  feedback.style.boxShadow = "none"; // Clear any old shadows

  // --- NEW: Helper feedback functions ---
  const showProcessingFeedback = (message, color = "#16a34a") => { // Default to green for video operations
    feedback.style.display = "block";
    feedback.innerHTML = `<span>${message} <span class="loader-spinner"></span></span>`;
    feedback.style.color = color;
    feedback.style.boxShadow = "none";
  };

  const showSuccessFeedback = (message) => {
    feedback.style.display = "block";
    feedback.innerHTML = `<div>${message}</div>`;
    feedback.style.color = "#16a34a"; // Green color for success
    feedback.style.boxShadow = "rgba(46, 242, 11, 1) 0px 5px 15px;"; // Green shadow
    // Ensure loader is removed if it was present
    const loader = feedback.querySelector('.loader-spinner');
    if (loader) {
      loader.remove();
    }
  };

  const showErrorFeedback = (message) => {
    feedback.style.display = "block";
    feedback.innerHTML = `❌ ${message}`; // Display message directly without extra div
    feedback.style.color = "#dc2626"; // Red color for error
    feedback.style.boxShadow = "rgba(219, 0, 0, 1) 0px 5px 15px;"; // Red shadow
    // Ensure loader is removed if it was present
    const loader = feedback.querySelector('.loader-spinner');
    if (loader) {
      loader.remove();
    }
  };
  // --- END NEW: Helper feedback functions ---


  if (!file || !file.type.startsWith("video/")) {
    showErrorFeedback(`Unsupported file type: ${file?.type || "N/A"}`);
    return;
  }

  if (!window.FFmpegWASM || !FFmpegWASM.FFmpeg) {
    showErrorFeedback(`FFmpegWASM not available.`);
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
    // --- NEW: Initial loading feedback with loader ---
    showProcessingFeedback(`Loading FFmpeg...`);
    // --- END NEW ---

    await ffmpeg.load();

    const ext = file.name.split(".").pop();
    const inputName = `input.${ext}`;
    const outputName = `output.mp4`;

    await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

    // --- NEW: Feedback for video compression with loader ---
    showProcessingFeedback(`Compressing ${file.name}...`);
    // --- END NEW ---

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

    // Show compression success details immediately after compression is done
    const originalSize = (file.size / 1024).toFixed(2);
    const newSize = (blob.size / 1024).toFixed(2);
    const saved = (((file.size - blob.size) / file.size) * 100).toFixed(1);

    // --- NEW: Update feedback after compression, before injection starts ---
    // This message serves as a "Compression Complete" notification.
    feedback.style.color = "#16a34a"; // Green for video compression success
    feedback.style.boxShadow = "none"; // Clear any old shadows for this intermediate step
    feedback.innerHTML = `
      ✅ <strong>${compressedFile.name}</strong> compressed successfully!<br>
      <small>Original: ${originalSize} KB → ${newSize} KB (${saved}% smaller)</small><br>
      <div style="margin-top:1rem;">ℹ️ Preparing file for injection...</div>
    `;
    // Ensure loader is removed from compression feedback
    const loader = feedback.querySelector('.loader-spinner');
    if (loader) {
      loader.remove();
    }
    // --- END NEW ---

    // --- NEW: Display "File is being injected..." just before actual injection ---
    // Add a slight delay to allow the UI to update with the "Preparing..." message
    // before the 'injecting' message takes over and the file operation occurs.
    setTimeout(() => {
      showProcessingFeedback("File is being injected... Please wait.", "#16a34a"); // Green for video injection
    }, 100); // Give 100ms for "Preparing..." to show

    // Inject file - wrapped in a setTimeout to allow "injecting" message to render
    setTimeout(() => {
      const targetInput = document.querySelector(`input[type="file"][id="${inputId}"]`);
      const dt = new DataTransfer();
      dt.items.add(compressedFile);
      targetInput.files = dt.files;

      // --- NEW: Show final injection success ---
      showSuccessFeedback("✅ File injected successfully.");
      // --- END NEW ---

      // Dispatch event so `formease:fileProcessed` listener shows additional info
      const event = new CustomEvent("formease:fileProcessed", {
        detail: {
          inputId,
          originalFile: file,
          processedFile: compressedFile,
          operation: "Video Compression",
        },
      });
      document.dispatchEvent(event);

      // Remove toolbox after a delay
      const toolbox = document.querySelector(`.formease-toolbox[data-input-id="${inputId}"]`);
      if (toolbox) {
          setTimeout(() => {
              toolbox.remove();
          }, 3000);
      }
    }, 200); // This timeout is cumulative with the previous one, giving total 200ms for initial UI changes + injection message.

  } catch (err) {
    showErrorFeedback(`Compression failed: ${err.message}`);
    console.error("[FormEase] Compression failed ❌", err);
  } finally {
      // Clean up FFmpeg instance if not needed anymore
      if (ffmpeg) {
          // ffmpeg.terminate(); // Consider uncommenting if you want to free resources immediately
      }
  }
}