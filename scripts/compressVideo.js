console.log("[FormEase] compressVideo.js (UMD) loaded ✅");

(async () => {
  if (!window.createFFmpeg || !window.fetchFile) {
    console.error("[FormEase] ❌ FFmpeg or fetchFile not available.");
    return;
  }

  const ffmpeg = window.createFFmpeg({ log: true });
  let isLoaded = false;

  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.data.type !== "compress-Video") return;

    const { inputId } = event.data;

    const input = document.querySelector(`input[data-form-ease-id="${inputId}"]`);
    const file = input?.files?.[0];

    const feedback = document.querySelector(
      `.formease-toolbox[data-input-id="${inputId}"] .formease-feedback-video`
    );
    const confirmBtn = document.querySelector(
      `.formease-toolbox[data-input-id="${inputId}"] #confirm-btn`
    );

    if (!file || !file.type.startsWith("video/")) {
      if (feedback) {
        feedback.style.color = "#dc2626";
        feedback.innerHTML = `❌ Unsupported file type: ${file?.type || "N/A"}`;
      }
      return;
    }

    try {
      if (feedback) {
        feedback.innerHTML = "🔄 Compressing video...";
        feedback.style.color = "#1d4ed8";
      }

      if (!isLoaded) {
        await ffmpeg.load();
        isLoaded = true;
      }

      const { name } = file;
      await ffmpeg.FS("writeFile", name, await window.fetchFile(file));

      await ffmpeg.run(
        "-i", name,
        "-vcodec", "libx264",
        "-crf", "28",
        "-preset", "veryfast",
        "-acodec", "aac",
        "-b:a", "128k",
        "output.mp4"
      );

      const data = ffmpeg.FS("readFile", "output.mp4");

      const blob = new Blob([data.buffer], { type: "video/mp4" });
      const compressedFile = new File([blob], `compressed_${name}`, {
        type: "video/mp4",
      });

      window.postMessage({
        type: "compress-video-result",
        file: {
          name: compressedFile.name,
          type: compressedFile.type,
          data: await compressedFile.arrayBuffer(),
        },
        inputId,
      }, "*");

      if (feedback) {
        const sizeKB = (compressedFile.size / 1024).toFixed(1);
        feedback.innerHTML = `✅ Compressed: ${sizeKB} KB`;
        feedback.style.color = "#16a34a";
      }

      if (confirmBtn) confirmBtn.style.display = "block";

    } catch (err) {
      console.error("[FormEase-Compress-Video] ❌", err);
      if (feedback) {
        feedback.innerHTML = `❌ Compression failed: ${err.message}`;
        feedback.style.color = "#dc2626";
      }
    }
  });
})();
