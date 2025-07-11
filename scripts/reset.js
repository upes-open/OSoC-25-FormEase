window.addEventListener("message", async (event) => {
  if (event.source === window && event.data.type === "reset") {
    const { inputId, OriginalFile } = event.data;

    console.log(
      `[FormEase-Reset] Processing reset request for input ${inputId}`
    );

    console.log("[FormEase-Reset] Reset Logic called");

    document.getElementById("resize-scale").innerText = "";

    document.getElementById("resize-range").value = 100;

    document.getElementById("img-width").value = 0;
    document.getElementById("img-height").value = 0;

    document.getElementById("compress-input").value = 0;

    document.getElementById("convert-dropdown").value = "PNG";

    const fileInput = document.querySelector(
      `input[type="file"][data-form-ease-id=${inputId}]`
    );
    console.log(
      `[FormEase-Reset] File Input taken for resetting with formeaseId ${inputId} : `,
      fileInput
    );

    const feedbackArea = document.querySelector(".formease-feedback");

    let width = 0;
    let height = 0;
    const sizeKB = (OriginalFile.size / 1024).toFixed(2);

    if (!fileInput || !OriginalFile) {
      feedbackArea.style.display = "block";
      feedbackArea.innerHTML =
        "<div>Error: Input or original file not found.</div>";
      feedbackArea.style.backgroundColor = "#fef2f2";
      feedbackArea.style.color = "#dc2626";
      setTimeout(() => (feedbackArea.style.display = "none"), 10000);
      return;
    }

    const img = new Image();
    img.src = URL.createObjectURL(OriginalFile);

    img.onload = () => {
      console.log("Image reset");
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(OriginalFile);
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));

      width = img.width;
      height = img.height;
    };
    setTimeout(() => {
      feedbackArea.style.display = "block";
      feedbackArea.innerHTML = `<div>Original file restored.</div><div><em>Click <strong>Confirm</strong> button below the image preview to add original file to input field.</em></div><div>Resolution : ${width} X ${height}</div><div>Original Size : ${sizeKB} kB`;
      feedbackArea.style.backgroundColor = "#d1fae5";
      feedbackArea.style.color = "#065f46";
    }, 100);
  }
});
