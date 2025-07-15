// scripts/compressVideo.js

console.log("[FormEase] compressVideo.js loaded ✅");

async function compressVideo(file, inputId) {
  if (!window.FFmpegWASM || !FFmpegWASM.FFmpeg) {
    console.error("[FormEase] FFmpegWASM not available ❌");
    return;
  }

  const { FFmpeg } = FFmpegWASM;
  const isExtensionContext = typeof chrome !== 'undefined' && chrome.runtime?.getURL;
  const corePath = isExtensionContext
    ? chrome.runtime.getURL('scripts/ffmpeg.js')
    : 'scripts/ffmpeg.js'; // fallback for test.html
  console.log("Using corePath:", corePath);

  const ffmpeg = new FFmpeg({
    corePath,
    log: true,
  });



  try {
    console.log("[FormEase] Loading FFmpeg core...");
    await ffmpeg.load();
    console.log("[FormEase] FFmpeg loaded ✅");

    const fileExt = file.name.split('.').pop();
    const inputFileName = `input.${fileExt}`;
    const outputFileName = `output.mp4`;

    const fileData = new Uint8Array(await file.arrayBuffer());
    await ffmpeg.writeFile(inputFileName, fileData);

    console.log("[FormEase] Running FFmpeg compression...");
    await ffmpeg.exec([
      '-i', inputFileName,
      '-vcodec', 'libx264',
      '-crf', '28',
      '-preset', 'veryfast',
      outputFileName
    ]);

    const data = await ffmpeg.readFile(outputFileName);
    const compressedBlob = new Blob([data.buffer], { type: 'video/mp4' });

    const compressedFile = new File(
      [compressedBlob],
      file.name.replace(/\.\w+$/, '.mp4'),
      { type: 'video/mp4', lastModified: Date.now() }
    );

    window.postMessage({
      type: 'compress-result',
      inputId,
      file: compressedFile,
    }, '*');

    console.log(`[FormEase] Compression done ✅ for ${inputId}`);
  } catch (err) {
    console.error('[FormEase] Compression failed ❌', err);
    window.postMessage({
      type: 'compress-error',
      inputId,
      error: err.message
    }, '*');
  }
}


// Expose method for test/debug use
window.testFFmpegLoad = async () => {
  if (!window.FFmpegWASM || !FFmpegWASM.FFmpeg) {
    console.error("[FormEase] FFmpegWASM not available ❌");
    return;
  }
  const { FFmpeg } = FFmpegWASM;
  const ffmpeg = new FFmpeg({ log: true });

  console.log("[FormEase] Loading FFmpeg core...");
  try {
    await ffmpeg.load();
    console.log("[FormEase] FFmpeg is loaded and ready ✅");
  } catch (err) {
    console.error("[FormEase] Failed to load FFmpeg ❌", err);
  }
};


// Listen for compression request
window.addEventListener("message", async (event) => {
  if (event.source !== window) return;
  const { type, file, inputId } = event.data;
  if (type === "compress" && file && inputId) {
    await compressVideo(file, inputId);
  }
});
