/**
 * FormEase Resize Script
 * Handles image resizing operations using the Pica library for high-quality resizing
 * Communicates with the main content script via postMessage API
 */

window.addEventListener("message", async (event) => {
  // Only process resize requests from the same window
  if (event.source === window && event.data.type === "resize") {
    const { inputId } = event.data;

    const resizeFeedbackArea = document.querySelector(
      ".formease-feedback-resize"
    );
    document.querySelector(".formease-feedback").innerHTML = "";
    document.querySelector(".formease-feedback-compress").innerHTML = "";
    document.querySelector(".formease-feedback-convert").innerHTML = "";
    document.querySelector(".formease-feedback-reset").innerHTML = "";
    document.querySelector(".formease-feedback-pdf").innerHTML = "";

    const toolbox = document.querySelector(
      `.formease-toolbox[data-input-id="${inputId}"]`
    );

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
        resizeFeedbackArea.style.display = "block";
        resizeFeedbackArea.innerHTML = "<span>ℹ️ Resizing...</span>";
        resizeFeedbackArea.style.color = "#1d4ed8";
        return;
      };

      const errorFeedback = () => {
        resizeFeedbackArea.innerHTML = "<span>⚠️Error resizing file.</span>";
        resizeFeedbackArea.style.color = "#dc2626";
        resizeFeedbackArea.style.boxShadow = "rgba(219, 0, 0, 1) 0px 5px 15px;";
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
                console.log(
                  "[FormEase-Resize] Image loaded and ready to insert."
                );

                resolve([targetHeight, targetWidth, percentSaved, newSize]);
              };

              previewImg.onerror = () => {
                reject(new Error("Failed to load preview image"));
              };
            },
            file.type, // use the original MIME type
            0.9
          );
        });
      };

      confirmButton.addEventListener("click", () => {
        console.log(
          "[FormEase-Resize] Confirm Button click event fired for Resize."
        );
        const newFile = new File([blob], `Resized: ${file.name}`, {
          type: blob.type,
          lastModified: Date.now(),
        });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(newFile);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));

        console.log("[FormEase-Resize] Resized Image added to Input.");

        confirmButton.classList.add("hidden");
        imgHeight.value = 0;
        imgWidth.value = 0;

        setTimeout(() => {
          previewArea.remove();
          toolbox.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          resizeFeedbackArea.style.display = "block";
          resizeFeedbackArea.innerHTML = "<div>✅ File Injected Successfully!";
          resizeFeedbackArea.style.boxShadow =
            "rgba(46, 242, 11, 1) 0px 5px 15px;";
        }, 100);

        setTimeout(() => {
          toolbox.remove();
        }, 3000);
      });

      if (!file) {
        resizeFeedbackArea.style.display = "block";
        resizeFeedbackArea.innerHTML =
          "⚠️ Please select a file before applying.";
        resizeFeedbackArea.style.color = "#dc2626";
        alert("Please select a file before applying resize.");
        setTimeout(() => (resizeFeedbackArea.style.display = "none"), 3000);
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

          resizeFeedbackArea.innerHTML = `<div style="margin-bottom:1rem;margin-inline: auto;">✅Resized, please review.</div><div style="margin-inline:auto; width: 300px; text-align:left;"><ul><li><span>Original Resolution : ${originalWidth} X ${originalHeight}</span></li><li><span>New Resolution : ${targetWidth} X ${targetHeight}</span></li><li><span>Original Size : ${originalSize} kB</span></li><li><span>New Size : ${newSize} kB</span></li></ul></div><div style="margin-top: 1rem;margin-inline: auto">Saved : ${percentSaved}%</div>`;
          resizeFeedbackArea.style.color = "#065f46";

          setTimeout(() => {
            resizeFeedbackArea.style.display = "block";
            resizeFeedbackArea.innerHTML =
              "<div>ℹ️ Press the <strong><em>Save Changes</em></strong></div> below the image to finalize and inject the file in the input.";

            resizeFeedbackArea.style.color = "#065f46";
          }, 3000);
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

          resizeFeedbackArea.innerHTML = `<div style="margin-bottom:1rem;margin-inline: auto;">✅Resized, please review.</div><div style="margin-inline:auto; width: 300px; text-align:left;"><ul><li><span>Original Resolution : ${originalWidth} X ${originalHeight}</span></li><li><span>New Resolution : ${targetWidth} X ${targetHeight}</span></li><li><span>Original Size : ${originalSize} kB</span></li><li><span>New Size : ${newSize} kB</span></li></ul></div><div style="margin-top: 1rem;margin-inline: auto">Saved : ${percentSaved}%</div>`;

          resizeFeedbackArea.style.color = "#065f46";

          setTimeout(() => {
            resizeFeedbackArea.style.display = "block";
            resizeFeedbackArea.innerHTML =
              "<div>ℹ️ Press the <strong><em>Save Changes</em></strong></div> below the image to finalize and inject the file in the input.";

            resizeFeedbackArea.style.color = "#065f46";
          }, 3500);
        } catch (error) {
          console.error("Resize error:", error);
          errorFeedback();
        }
      } else {
        alert("Please provide valid dimensions for resize.");
        console.log("[FormEase-Resize] Error... Resize Dimensions Not Valid.");
      }
    }
  }
});
