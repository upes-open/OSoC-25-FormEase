import { FFmpeg } from "/assets/ffmpeg/package/dist/esm/index.js";
import { fetchFile } from "/assets/util/package/dist/esm/index.js";

window.addEventListener("message", async (event) => {
  if (event.source === window && event.data.type === "trim-video") {
    let ffmpeg = null;
    const trim = async ({ target: { files } }) => {
      const videoFeedbackArea = document.querySelector(
        ".formease-feedback-video"
      );
      document.querySelector(".formease-feedback").innerHTML = "";
      document.querySelector(".formease-feedback-resize").innerHTML = "";
      document.querySelector(".formease-feedback-convert").innerHTML = "";
      document.querySelector(".formease-feedback-reset").innerHTML = "";
      document.querySelector(".formease-feedback-pdf").innerHTML = "";
      document.querySelector(".formease-feedback-compress").innerHTML = "";

      const startTime = document.getElementById("start-time").value.trim();
      const endTime = document.getElementById("end-time").value.trim();

      if (!startTime || !endTime) {
        videoFeedbackArea.innerHTML =
          "<div>❌ Please enter both start and end time.</div>";
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

      try {
        const file = files[0];
        const { name } = file;

        await ffmpeg.writeFile(name, await fetchFile(file));
        videoFeedbackArea.innerHTML = "<div>🚀 Trimming started...</div>";

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

        videoFeedbackArea.innerHTML = "<div>✅ Trimming complete.</div>";

        const data = await ffmpeg.readFile("output.mp4");
        const video = document.getElementById("output-video");
        video.src = URL.createObjectURL(
          new Blob([data.buffer], { type: "video/mp4" })
        );

        document.getElementById("uploader").addEventListener("change", trim);
      } catch (error) {
        console.error("Error in trimming the video : ", error);
      }
    };
  }
});
