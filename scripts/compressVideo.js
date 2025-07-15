console.log("[FormEase] compressVideo.js loaded ✅");

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

    // Inject file
    const targetInput = document.querySelector(`input[type="file"][id="${inputId}"]`);
    const dt = new DataTransfer();
    dt.items.add(compressedFile);
    targetInput.files = dt.files;

    // Show success
    const originalSize = (file.size / 1024).toFixed(2);
    const newSize = (blob.size / 1024).toFixed(2);
    const saved = (((file.size - blob.size) / file.size) * 100).toFixed(1);

    feedback.style.color = "#16a34a";
    feedback.innerHTML = `
      ✅ <strong>${compressedFile.name}</strong> compressed successfully!<br>
      <small>Original: ${originalSize} KB → ${newSize} KB (${saved}% smaller)</small>
    `;

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

  } catch (err) {
    feedback.style.color = "#dc2626";
    feedback.innerHTML = `❌ Compression failed: ${err.message}`;
    console.error("[FormEase] Compression failed ❌", err);
  }
}
