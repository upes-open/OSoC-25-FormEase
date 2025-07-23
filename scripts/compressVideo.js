console.log("[FormEase] compressVideo.js (UMD) loaded ✅");

(async () => {
  if (!window.FFmpegWASM.FFmpeg || !window.FFmpegUtil.fetchFile) {
    console.log(window)
    console.error("[FormEase] ❌ FFmpeg or FFmpegUtil.fetchFile not available.");
    return;
  }
  let ffmpeg = null;
  ffmpeg = new window.FFmpegWASM.FFmpeg();
  // const ffmpeg = window.FFmpegWASM.FFmpeg({ log: true });
  let isLoaded = false;

  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.data.type !== "compress-Video") return;

    const { inputId } = event.data;

    const videoFeedbackArea = document.querySelector(
      ".formease-feedback-video"
    );
    document.querySelector(".formease-feedback").innerHTML = "";
    document.querySelector(".formease-feedback-resize").innerHTML = "";
    document.querySelector(".formease-feedback-convert").innerHTML = "";
    document.querySelector(".formease-feedback-compress").innerHTML = "";
    document.querySelector(".formease-feedback-reset").innerHTML = "";
    document.querySelector(".formease-feedback-pdf").innerHTML = "";

    const videoFeedback = () => {
      videoFeedbackArea.style.display = "block";
      videoFeedbackArea.innerHTML = "<span>ℹ️ Compressing...</span>";
      videoFeedbackArea.style.color = "#1d4ed8";
      return;
    };

    const input = document.querySelector(
      `input[data-form-ease-id="${inputId}"]`
    );
    const file = input?.files?.[0];

    const feedback = document.querySelector(
      `.formease-toolbox[data-input-id="${inputId}"] .formease-feedback-video`
    );
    const confirmBtn = document.querySelector(
      `.formease-toolbox[data-input-id="${inputId}"] #confirm-btn`
    );

    if (!file || !file.type.startsWith("video/")) {
      if (videoFeedback) {
        videoFeedback.style.color = "#dc2626";
        videoFeedback.innerHTML = `❌ Unsupported file type: ${
          file?.type || "N/A"
        }`;
      }
      return;
    }

    try {
      videoFeedback();

      if (!isLoaded) {
        await ffmpeg.load({
            coreURL: "ffmpeg-core.js",
          });
        isLoaded = true;
      }

      const { name } = file;
      await ffmpeg.FS("writeFile", name, await window.FFmpegUtil.fetchFile(file));

      await ffmpeg.run(
        "-i",
        name,
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
        "output.mp4"
      );

      const data = ffmpeg.FS("readFile", "output.mp4");

      const blob = new Blob([data.buffer], { type: "video/mp4" });
      const compressedFile = new File([blob], `compressed_${name}`, {
        type: "video/mp4",
      });

      window.postMessage(
        {
          type: "compress-video-result",
          file: {
            name: compressedFile.name,
            type: compressedFile.type,
            data: await compressedFile.arrayBuffer(),
          },
          inputId,
        },
        "*"
      );

      if (videoFeedback) {
        const sizeKB = (compressedFile.size / 1024).toFixed(1);
        videoFeedback.innerHTML = `✅ Compressed: ${sizeKB} KB`;
        videoFeedback.style.color = "#16a34a";
      }

      if (confirmBtn) confirmBtn.style.display = "block";
    } catch (err) {
      console.error("[FormEase-Compress-Video] ❌", err);
      if (feedback) {
        videoFeedback.innerHTML = `❌ Compression failed: ${err.message}`;
        // videoFeedback.style.color = "#dc2626";
      }
    }
  });
})();




// Make sure these are loaded first (in your content script or background script)
// You need to inject these scripts before this code runs



// const { FFmpeg } = FFmpegWASM;
// const { fetchFile } = FFmpegUtil;

// const ffmpeg = new FFmpeg();

// const coreUrl = chrome.runtime.getURL("scripts/ffmpeg/ffmpeg-core.js");
// const wasmUrl = chrome.runtime.getURL("scripts/ffmpeg/ffmpeg-core.wasm");

// console.log("FFmpeg core URL:", coreUrl);
// console.log("FFmpeg WASM URL:", wasmUrl);

// const transcode = async ({ target: { files } }) => {
//   console.log("transcode called");
//   const message = document.getElementById("message");

//   if (ffmpeg === null) {
//     ffmpeg = new FFmpeg();
//     ffmpeg.on("log", ({ message }) => {
//       console.log(message);
//     });
//     ffmpeg.on("progress", ({ progress, time }) => {
//       if (message) {
//         message.innerHTML = `${progress * 100} %, time: ${time / 1000000} s`;
//       }
//     });

//     try {
//       await ffmpeg.load({
//         coreURL: coreUrl,
//         wasmURL: wasmUrl,
//       });
//       console.log("FFmpeg loaded successfully");
//     } catch (error) {
//       console.error("Failed to load FFmpeg:", error);
//       return;
//     }
//   }

//   const { name } = files[0];
//   await ffmpeg.writeFile(name, await fetchFile(files[0]));

//   if (message) message.innerHTML = "Start transcoding";
//   console.time("exec");
//   await ffmpeg.exec(["-i", name, "output.mp4"]);
//   console.timeEnd("exec");

//   if (message) message.innerHTML = "Complete transcoding";
//   const data = await ffmpeg.readFile("output.mp4");
//   const video = document.getElementById("output-video");

//   if (video) {
//     video.src = URL.createObjectURL(
//       new Blob([data.buffer], { type: "video/mp4" })
//     );
//   }
// };

// window.addEventListener("message", async (event) => {
//   if (event.source !== window || event.data.type !== "compress-Video") return;

//   // Fix: inputId should be a variable, not a string assignment
//   const inputId = "dynamicVideoPreview";
//   const elm = document.getElementById(inputId);
//   let file;

//   if (elm && elm.files && elm.files[0]) {
//     // still works for <input type="file">
//     file = elm.files[0];
//   } else if (elm && elm.tagName === "VIDEO" && (elm.currentSrc || elm.src)) {
//     // handle <video> element
//     const videoURL = elm.currentSrc || elm.src;
//     try {
//       const resp = await fetch(videoURL);
//       const blob = await resp.blob();
//       // wrap in a File so transcode() sees a .name and .type
//       file = new File([blob], "input.mp4", { type: blob.type });
//     } catch (err) {
//       console.error("[FormEase] ❌ failed to fetch video blob:", err);
//       return;
//     }
//   }

//   if (file) {
//     await transcode({ target: { files: [file] } });
//   } else {
//     console.error(
//       `[FormEase] ❌ No file or video source found in element #${inputId}.`
//     );
//   }
// });

