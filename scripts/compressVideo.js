// scripts/compressVideo.js

console.log("[FormEase] compressVideo.js loaded ✅");

async function testFFmpegLoad() {
  if (!window.FFmpeg || !FFmpeg.createFFmpeg) {
    console.error("[FormEase] FFmpeg not available ❌");
    return;
  }

  const { createFFmpeg } = FFmpeg;
  const ffmpeg = createFFmpeg({ log: true });

  console.log("[FormEase] Loading FFmpeg core...");
  await ffmpeg.load();
  console.log("[FormEase] FFmpeg is loaded and ready ✅");
}

window.testFFmpegLoad = testFFmpegLoad;
