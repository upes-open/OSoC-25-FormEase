import { FFmpeg } from "/assets/ffmpeg/package/dist/esm/index.js";
import { fetchFile } from "/assets/util/package/dist/esm/index.js";
let ffmpeg = null;
const trim = async ({ target: { files } }) => {
  const message = document.getElementById("message");
  const startTime = document.getElementById("start-time").value.trim();
  const endTime = document.getElementById("end-time").value.trim();

  if (!startTime || !endTime) {
    message.innerHTML = "❌ Please enter both start and end time.";
    return;
  }

  if (ffmpeg === null) {
    ffmpeg = new FFmpeg();
    ffmpeg.on("log", ({ message }) => {
      console.log(message);
    });
    ffmpeg.on("progress", ({ progress }) => {
      message.innerHTML = `⏳ ${Math.round(progress * 100)}%`;
    });
    await ffmpeg.load({
      coreURL: "/assets/core/package/dist/umd/ffmpeg-core.js",
    });
  }

  const file = files[0];
  const { name } = file;

  await ffmpeg.writeFile(name, await fetchFile(file));
  message.innerHTML = "🚀 Trimming started...";

  await ffmpeg.exec([
    "-i",
    name,
    "-ss",
    startTime,
    "-to",
    endTime,
    "-vcodec",
    "libx264",
    "-crf",
    "28",
    "-preset",
    "veryfast",
    "-acodec",
    "aac",
    "-b:a",
    "128k",
    "output.mp4",
  ]);

  message.innerHTML = "✅ Trimming complete.";

  const data = await ffmpeg.readFile("output.mp4");
  const video = document.getElementById("output-video");
  video.src = URL.createObjectURL(
    new Blob([data.buffer], { type: "video/mp4" })
  );
};

document.getElementById("uploader").addEventListener("change", trim);
