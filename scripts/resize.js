/**
 * FormEase Resize Script
 * Handles image resizing operations using the Pica library for high-quality resizing
 * Communicates with the main content script via postMessage API
 */

window.addEventListener("message", async (event) => {
  // Only process resize requests from the same window
  if (event.source === window && event.data.type === "resize") {
    const { inputId } = event.data;

    const feedbackArea = document.querySelector(".formease-feedback");

    console.log(
      `[FormEase-Resize] Processing resize request for input ${inputId}`
    );

    console.log("[FormEase-Resize] Resize Logic called");

    const picaInstance = window.pica(); // Global Pica Instance

    if (!window.pica) {
      console.log("Pica not loaded");
    } else {
      console.log("[FormEase-Resize] Pica Loaded");

      const fileInput = document.querySelector(
        `input[type="file"][data-form-ease-id=${inputId}]`
      );
      console.log(
        `[FormEase-Resize] File taken for resizing with formeaseId ${inputId} : `,
        fileInput.files[0]
      );

      let originalSize = 0;
      let originalWidth = 0;
      let originalHeight = 0;
      let blob = null;

      const previewArea = document.getElementById("image-preview-area");
      const previewImg = document.getElementById("image-preview");

      const imgWidth = document.getElementById("img-width");
      const imgHeight = document.getElementById("img-height");
      const resizeScale = document.getElementById("resize-scale");
      const resizeValue = Number(resizeScale.innerText);
      const confirmButton = document.getElementById("confirm-btn");

      const file = fileInput.files[0];

      originalSize = (file.size / 1024).toFixed(2);

      const resizingFeedback = () => {
        feedbackArea.style.display = "block";
        feedbackArea.innerHTML = "<span>Resizing...</span>";
        feedbackArea.style.backgroundColor = "#dbeafe";
        feedbackArea.style.color = "#1d4ed8";
        return;
      };

      const errorFeedback = () => {
        feedbackArea.innerHTML = "<span>Error resizing file.</span>";
        feedbackArea.style.backgroundColor = "#fef2f2";
        feedbackArea.style.color = "#dc2626";
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

      const createSourceCanvas = (originalWidth, originalHeight, bitmap) => {
        const sourceCanvas = document.createElement("canvas");
        sourceCanvas.width = originalWidth;
        sourceCanvas.height = originalHeight;
        sourceCanvas.getContext("2d").drawImage(bitmap, 0, 0);
        return sourceCanvas;
      };

      const resize = async (sourceCanvas, targetCanvas) => {
        await picaInstance.resize(sourceCanvas, targetCanvas, {
          filter: "lanczos",
          quality: 3,
          alpha: true,
          unsharpAmount: 80,
          unsharpRadius: 0.6,
          unsharpThreshold: 2,
        });
        return;
      };

      const convertToBlob = async (targetCanvas) => {
        return new Promise((resolve, reject) => {
          targetCanvas.toBlob(
            (resizedBlob) => {
              console.log("[FormEase-Resize] Image Resized Successfully");
              console.log("[FormEase-Resize] Resized Blob : ", resizedBlob);

              blob = resizedBlob;

              const targetHeight = targetCanvas.height;
              const targetWidth = targetCanvas.width;

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
                console.log("[FormEase] Image loaded and ready to insert.");

                resolve([targetHeight, targetWidth, percentSaved, newSize]);
              };

              previewImg.onerror = () => {
                reject(new Error("Failed to load preview image"));
              };
            },
            "image/jpeg",
            0.9
          );
        });
      };

      confirmButton.addEventListener("click", () => {
        console.log("[FormEase-Resize] Confirm Button click event fired.");
        const newFile = new File([blob], `Resized: ${file.name}`, {
          type: blob.type,
          lastModified: Date.now(),
        });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(newFile);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));

        console.log("[FormEase] Resized Image added to Input.");

        confirmButton.classList.add("hidden");
        imgHeight.value = 0;
        imgWidth.value = 0;
      });

      if (!file) {
        feedbackArea.style.display = "block";
        feedbackArea.innerHTML = "Please select a file before applying.";
        feedbackArea.style.backgroundColor = "#fef2f2";
        feedbackArea.style.color = "#dc2626";
        alert("Please select a file before applying resize.");
        setTimeout(() => (feedbackArea.style.display = "none"), 3000);
        return;
      }

      if (
        imgWidth.value > 0 &&
        imgWidth.value < 1600 &&
        imgHeight.value > 0 &&
        imgHeight.value < 1600
      ) {
        resizingFeedback();
        console.log("[FormEase-Resize] Resizing using manual dimensions.");

        try {
          const bitmap = await createBitmap(file);

          originalWidth = bitmap.width;
          originalHeight = bitmap.height;

          const sourceCanvas = createSourceCanvas(
            originalWidth,
            originalHeight,
            bitmap
          );

          const targetCanvas = document.createElement("canvas");
          targetCanvas.width = imgWidth.value;
          targetCanvas.height = imgHeight.value;

          await resize(sourceCanvas, targetCanvas);

          const [targetHeight, targetWidth, percentSaved, newSize] =
            await convertToBlob(targetCanvas);

          feedbackArea.innerHTML = `<div>Resized, please review.</div><div>Press the confirm button below the image preview to add this image to the input field.</div><div><span>Original Resolution : ${originalWidth} X ${originalHeight}</span><span>New Resolution : ${targetWidth} X ${targetHeight}</span></div><div><span>Original Size : ${originalSize} kB</span><span>New Size : ${newSize} kB</span></div><div>Saved : ${percentSaved}%</div>`;

          setTimeout(() => (feedbackArea.style.display = "none"), 1500);
        } catch (error) {
          console.error("Resize error:", error);
          errorFeedback();
        }
      } else if (resizeValue > 0) {
        resizingFeedback();
        console.log("[FormEase-Resize] Resizing using scale");

        try {
          const bitmap = await createBitmap(file);

          originalWidth = bitmap.width;
          originalHeight = bitmap.height;

          const sourceCanvas = createSourceCanvas(
            originalWidth,
            originalHeight,
            bitmap
          );

          const targetCanvas = document.createElement("canvas");
          targetCanvas.width = Math.round(bitmap.width * (resizeValue / 100));
          targetCanvas.height = Math.round(bitmap.height * (resizeValue / 100));

          await resize(sourceCanvas, targetCanvas);

          const [targetHeight, targetWidth, percentSaved, newSize] =
            await convertToBlob(targetCanvas);

          feedbackArea.innerHTML = `<div>Resized, please review.</div><div>Press the confirm button below the image preview to add this image to the input field.</div><div><span style="margin-right: 1rem">Original Resolution : ${originalWidth} X ${originalHeight}</span><span>New Resolution : ${targetWidth} X ${targetHeight}</span></div><div><span style="margin-right: 1rem">Original Size : ${originalSize} kB</span><span>New Size : ${newSize} kB</span></div><div>Saved : ${percentSaved}%</div>`;

          setTimeout(() => (feedbackArea.style.display = "none"), 1500);
        } catch (error) {
          console.error("Resize error:", error);
          errorFeedback();
        }
      } else {
        alert("Please provide valid dimensions for resize.");
        console.log("[FormEase] Error... Resize Dimensions Not Valid.");
      }
    }
  }
});
