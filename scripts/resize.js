/**
 * FormEase Resize Script
 * Handles image resizing operations using the Pica library for high-quality resizing
 * Communicates with the main content script via postMessage API
 */

window.addEventListener("message", async (event) => {
  // Only process resize requests from the same window
  if (event.source === window && event.data.type === "resize") {
    const { inputId } = event.data;

    console.log(
      `[FormEase-Resize] Processing resize request for input ${inputId}`
    );

    console.log("[FormEase] Resize Logic called");
    if (!window.pica) {
      console.log("Pica not loaded");
    } else {
      const picaInstance = window.pica; // Global Pica instance

      const fileInput = document.querySelector(
        `input[type="file"][data-form-ease-id=${inputId}]`
      );
      let feedbackArea = document.querySelector(".formease-feedback");

      let originalFile = null;
      const file = fileInput.files[0];

      const imgWidth = document.getElementById("img-width");
      const imgHeight = document.getElementById("img-height");
      const resizeScale = document.getElementById("resize-scale");
      const resizeValue = Number(resizeScale.innerText);

      if (
        !imgWidth.value &&
        !imgHeight.value &&
        (!resizeValue || resizeValue < 10)
      ) {
        const fileInput = document.getElementById("resize-file-input");
        const originalSize = (file.size / 1024).toFixed(2);

        if (!file) {
          feedbackArea.style.display = "block";
          feedbackArea.innerHTML = "Please select a file before applying.";
          feedbackArea.style.backgroundColor = "#fef2f2";
          feedbackArea.style.color = "#dc2626";
          setTimeout(() => (feedbackArea.style.display = "none"), 3000);
          return;
        }
        if (!file) {
          alert("Please select a file before applying resize.");
          return;
        }

        feedbackArea.style.display = "block";
        feedbackArea.innerHTML = "Resizing...";
        feedbackArea.style.backgroundColor = "#dbeafe";
        feedbackArea.style.color = "#1d4ed8";

        originalFile = file;

        const img = new Image();
        img.src = URL.createObjectURL(file);

        try {
          await new Promise((resolve) => (img.onload = resolve));

          const canvas = document.createElement("canvas");
          const scale = document.getElementById("resize-range").value / 100;
          canvas.width =
            img.width * scale || document.getElementById("img-width").value;
          canvas.height =
            img.height * scale || document.getElementById("img-height").value;

          await createImageBitmap(img).then((bitmap) => {
            return picaInstance.resize(bitmap, canvas, {
              filter: "lanczos",
              alpha: true,
              quality: 3,
              unsharpAmount: 160,
              unsharpRadius: 0.6,
              unsharpThreshold: 1,
            });
          });

          const blob = await picaInstance.toBlob(canvas, `image/jpg`, 0.9);

          const newFile = new File([blob], file.name, {
            type: blob.type,
            lastModified: Date.now(),
          });

          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(newFile);
          fileInput.files = dataTransfer.files;
          fileInput.dispatchEvent(new Event("change", { bubbles: true }));

          const previewURL = URL.createObjectURL(blob);
          previewImg.src = previewURL;
          previewArea.style.display = "block";

          const resizedImg = new Image();
          resizedImg.src = previewURL;
          resizedImg.onload = () => {
            const newSizeKB = (blob.size / 1024).toFixed(2);
            const sizeSaved = (originalSize - newSizeKB) / originalSize;
            const percentSaved = (sizeSaved * 100).toFixed(2);
            feedbackArea.textContent = `Resolution: ${resizedImg.width} × ${resizedImg.height}px`;
            feedbackArea.textContent = `New Size : ${newSizeKB}`;
            feedbackArea.textContent = `Saved : ${percentSaved}%`;
          };

          feedbackArea.innerHTML = "Resizing complete.";
          feedbackArea.style.backgroundColor = "#d1fae5";
          feedbackArea.style.color = "#065f46";
        } catch (error) {
          console.error("Resize error:", error);
          feedbackArea.innerHTML = "Error resizing file.";
          feedbackArea.style.backgroundColor = "#fef2f2";
          feedbackArea.style.color = "#dc2626";
        } finally {
          setTimeout(() => (feedbackArea.style.display = "none"), 3000);
        }
      }
    }
  }
});
