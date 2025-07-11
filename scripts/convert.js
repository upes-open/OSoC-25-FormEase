/**
 * FormEase Convert Script
 * Handles image conversion to reduce file size while maintaining reasonable quality
 * Communicates with the main content script via postMessage API
 */

window.addEventListener("message", async (event) => {
  // Only process compress requests from the same window
  if (event.source === window && event.data.type === "convert") {
    const { inputId, mimeType } = event.data;

    const mime = mimeType.toLowerCase();
    const fileType = `image/${mime}`;

    const feedbackArea = document.querySelector(".formease-feedback");

    const toolbox = document.querySelector(
      `.formease-toolbox[data-input-id="${inputId}"]`
    );

    console.log(
      `[FormEase-Convert] Processing convert request for input ${inputId}`
    );

    console.log("[FormEase-Convert] Convert Logic called");

    console.log(
      "[FormEase-Convert] File type in which conversion is to be done : ",
      fileType
    );

    const fileInput = document.querySelector(
      `input[type="file"][data-form-ease-id=${inputId}]`
    );
    console.log(
      `[FormEase-Convert] File taken for converting with formeaseId ${inputId} : `,
      fileInput.files[0]
    );

    let blob = null;

    const previewArea = document.getElementById("image-preview-area");
    const previewImg = document.getElementById("image-preview");

    const convertDropdown = document.getElementById("convert-dropdown");

    const confirmButton = document.getElementById("confirm-btn");

    const file = fileInput.files[0];

    originalType = file.type;

    const convertingFeedback = () => {
      feedbackArea.style.display = "block";
      feedbackArea.innerHTML = "<span>ℹ️ Converting...</span>";
      feedbackArea.style.backgroundColor = "#dbeafe";
      feedbackArea.style.color = "#1d4ed8";
      return;
    };

    const errorFeedback = () => {
      feedbackArea.innerHTML = "<span>⚠️ Error converting file.</span>";
      feedbackArea.style.backgroundColor = "#fef2f2";
      feedbackArea.style.color = "#dc2626";
      feedbackArea.style.boxShadow = "rgba(219, 0, 0, 1) 0px 5px 15px;";
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

    const convertToBlob = (canvas, newMimeType) => {
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (resizedBlob) => {
            console.log("[FormEase-Convert] Image Converted Successfully");
            console.log("[FormEase-Compress] Converted Blob : ", resizedBlob);

            blob = resizedBlob;

            const newType = resizedBlob.type;

            const reader = new FileReader();
            reader.onload = () => {
              previewImg.src = reader.result;
              previewArea.style.display = "block";
              confirmButton.classList.remove("hidden");
            };
            reader.readAsDataURL(resizedBlob);

            console.log("[FormEase-Convert] Image loaded and ready to insert.");
            console.log(newType);
            resolve(newType);

            previewImg.onerror = () => {
              reject(new Error("Failed to load preview image"));
            };
          },
          newMimeType,
          0.9
        );
      });
    };

    confirmButton.addEventListener("click", () => {
      console.log(
        "[FormEase-Compress] Confirm Button click event fired for compress."
      );
      const newFile = new File([blob], `Resized: ${file.name}`, {
        type: fileType,
        lastModified: Date.now(),
      });

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(newFile);
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));

      console.log("[FormEase-Compress] Resized Image added to Input.");

      confirmButton.classList.add("hidden");
      convertDropdown.value = "PNG";

      setTimeout(() => {
        previewArea.remove();
        toolbox.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        feedbackArea.style.display = "block";
        feedbackArea.innerHTML = "<div>✅ File Injected Successfully!";
        feedbackArea.style.boxShadow = "rgba(46, 242, 11, 1) 0px 5px 15px;";
      }, 100);

      setTimeout(() => {
        toolbox.remove();
      }, 3000);
    });

    if (!file) {
      feedbackArea.style.display = "block";
      feedbackArea.innerHTML = "⚠️ Please select a file before applying.";
      feedbackArea.style.backgroundColor = "#fef2f2";
      feedbackArea.style.color = "#dc2626";
      alert("Please select a file before applying resize.");
      setTimeout(() => (feedbackArea.style.display = "none"), 3000);
      return;
    }

    if (fileType !== "") {
      convertingFeedback();

      console.log("[FormEase-Convert] Converting the file.");

      try {
        const bitmap = await createBitmap(file);

        const canvas = createTargetCanvas(bitmap);

        const newType = await convertToBlob(canvas, fileType);

        feedbackArea.innerHTML = `<div style="margin-bottom:1rem;">✅ Converted, please review.</div><div>Original Type : ${originalType}</div><div style="margin-top: 1rem;">New Type : ${newType}</div>`;
        feedbackArea.style.backgroundColor = "#d1fae5";
        feedbackArea.style.color = "#065f46";

        setTimeout(() => (feedbackArea.style.display = "none"), 1500);

        setTimeout(() => {
          feedbackArea.style.display = "block";
          feedbackArea.innerHTML =
            "<div>ℹ️ Press the <strong><em>Save Changes</em></strong></div> below the image to finalize and inject the file in the input.";
          feedbackArea.style.backgroundColor = "#d1fae5";
          feedbackArea.style.color = "#065f46";
        }, 1500);
      } catch (error) {
        console.error("Resize error:", error);
        errorFeedback();
      }
    }
  }
});
