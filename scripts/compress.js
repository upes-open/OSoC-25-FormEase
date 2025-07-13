/**
 * FormEase Compress Script
 * Handles image compression to reduce file size while maintaining reasonable quality
 * Communicates with the main content script via postMessage API
 */

window.addEventListener("message", async (event) => {
  // Only process compress requests from the same window
  if (event.source === window && event.data.type === "compress") {
    const { inputId } = event.data;

    const compressFeedbackArea = document.querySelector(
      ".formease-feedback-compress"
    );
    document.querySelector(".formease-feedback").innerHTML = "";
    document.querySelector(".formease-feedback-resize").innerHTML = "";
    document.querySelector(".formease-feedback-convert").innerHTML = "";
    document.querySelector(".formease-feedback-reset").innerHTML = "";

    const toolbox = document.querySelector(
      `.formease-toolbox[data-input-id="${inputId}"]`
    );

    console.log(
      `[FormEase-Compress] Processing compress request for input ${inputId}`
    );

    console.log("[FormEase-Compress] Compress Logic called");

    const fileInput = document.querySelector(
      `input[type="file"][data-form-ease-id=${inputId}]`
    );
    console.log(
      `[FormEase-Compress] File taken for compressing with formeaseId ${inputId} : `,
      fileInput.files[0]
    );

    let blob = null;

    const previewArea = document.getElementById("image-preview-area");
    const previewImg = document.getElementById("image-preview");

    const compressInput = document.getElementById("compress-input");
    const quality = (100 - compressInput.value) / 100;
    const confirmButton = document.getElementById("confirm-btn");

    const file = fileInput.files[0];

    originalSize = (file.size / 1024).toFixed(2);

    const compressingFeedback = () => {
      compressFeedbackArea.style.display = "block";
      compressFeedbackArea.innerHTML = "<span>ℹ️ Compressing...</span>";
      compressFeedbackArea.style.color = "#1d4ed8";
      return;
    };

    const errorFeedback = () => {
      compressFeedbackArea.innerHTML =
        "<span>⚠️ Error compressing file.</span>";
      compressFeedbackArea.style.color = "#dc2626";
      compressFeedbackArea.style.boxShadow = "rgba(219, 0, 0, 1) 0px 5px 15px;";
      return;
    };

    const createBitmap = async (file) => {
      const img = new Image();

      const reader = new FileReader();
      const dataURL = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      img.src = dataURL;
      await img.decode();

      const bitmap = await createImageBitmap(img);

      return bitmap;
    };

    const createTargetCanvas = (bitmap) => {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;

      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(bitmap, 0, 0);

      return canvas;
    };

    const convertToBlob = (canvas, file, quality) => {
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (resizedBlob) => {
            console.log("[FormEase-Compress] Image Compressed Successfully");
            console.log("[FormEase-Compress] Compressed Blob : ", resizedBlob);

            blob = resizedBlob;

            const reader = new FileReader();
            reader.onload = () => {
              previewImg.src = reader.result;
              previewArea.style.display = "block";
              confirmButton.classList.remove("hidden");
            };
            reader.readAsDataURL(resizedBlob);

            previewImg.onload = () => {
              const newSize = (resizedBlob.size / 1024).toFixed(2);
              const sizeSaved = (originalSize - newSize) / originalSize;
              const percentSaved = (sizeSaved * 100).toFixed(2);
              console.log(
                "[FormEase-Compress] Image loaded and ready to insert."
              );

              resolve([percentSaved, newSize]);
            };

            previewImg.onerror = () => {
              reject(new Error("Failed to load preview image"));
            };
          },
          file,
          quality
        );
      });
    };

    confirmButton.addEventListener("click", () => {
      console.log(
        "[FormEase-Compress] Confirm Button click event fired for compress."
      );
      const newFile = new File([blob], `Compressed: ${file.name}`, {
        type: blob.type,
        lastModified: Date.now(),
      });

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(newFile);
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));

      console.log("[FormEase-Compress] Resized Image added to Input.");

      confirmButton.classList.add("hidden");
      compressInput.value = 0;

      setTimeout(() => {
        previewArea.remove();
        toolbox.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        compressFeedbackArea.style.display = "block";
        compressFeedbackArea.innerHTML = "<div>✅ File Injected Successfully!";
        compressFeedbackArea.style.boxShadow =
          "rgba(46, 242, 11, 1) 0px 5px 15px;";
      }, 100);

      setTimeout(() => {
        toolbox.remove();
      }, 3000);
    });

    if (!file) {
      compressFeedbackArea.style.display = "block";
      compressFeedbackArea.innerHTML =
        "⚠️ Please select a file before applying.";
      compressFeedbackArea.style.color = "#dc2626";
      alert("Please select a file before applying resize.");
      setTimeout(() => (compressFeedbackArea.style.display = "none"), 3000);
      return;
    }

    if (quality > 0) {
      compressingFeedback();

      console.log("[FormEase-Compress] Compressing the file.");

      try {
        const bitmap = await createBitmap(file);

        const canvas = createTargetCanvas(bitmap);

        const [percentSaved, newSize] = await convertToBlob(
          canvas,
          "image/jpeg",
          quality
        );

        compressFeedbackArea.innerHTML = `<div style="margin-bottom:1rem;">✅ Compressed, please review.</div><div><ul><li><span>Original Size : ${originalSize} kB</span></li><li><span>New Size : ${newSize} kB</span></li></ul></div><div style="margin-top: 1rem;">Saved : ${percentSaved}%</div>`;
        compressFeedbackArea.style.backgroundColor = "#d1fae5";
        compressFeedbackArea.style.color = "#065f46";

        setTimeout(() => {
          compressFeedbackArea.style.display = "block";
          compressFeedbackArea.innerHTML =
            "<div>ℹ️ Press the <strong><em>Save Changes</em></strong></div> below the image to finalize and inject the file in the input.";
          compressFeedbackArea.style.color = "#065f46";
        }, 3000);
      } catch (error) {
        console.error("Resize error:", error);
        errorFeedback();
      }
    }
  }
});
