window.addEventListener("message", async (event) => {
  if (event.source === window && event.data.type === "reset") {
    const { inputId, OriginalFile } = event.data;

    console.log(
      `[FormEase-Reset] Processing reset request for input ${inputId}`
    );

    console.log("[FormEase-Reset] Reset Logic called");

    document.getElementById("confirm-btn").classList.add("hidden");

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

    const resetFeedbackArea = document.querySelector(
      ".formease-feedback-reset"
    );
    document.querySelector(".formease-feedback-pdf").innerHTML = "";
    document.querySelector(".formease-feedback-resize").innerHTML = "";
    document.querySelector(".formease-feedback-compress").innerHTML = "";
    document.querySelector(".formease-feedback-convert").innerHTML = "";
    document.querySelector(".formease-feedback-compress").innerHTML = "";

    let width = 0;
    let height = 0;
    const sizeKB = (OriginalFile.size / 1024).toFixed(2);

    if (!fileInput || !OriginalFile) {
      resetFeedbackArea.style.display = "block";
      resetFeedbackArea.innerHTML =
        "<div>Error: Input or original file not found.</div>";
      resetFeedbackArea.style.color = "#dc2626";
      setTimeout(() => (resetFeedbackArea.style.display = "none"), 10000);
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

    if (OriginalFile.type.startsWith("image/")) {
      setTimeout(() => {
        resetFeedbackArea.style.display = "block";
        resetFeedbackArea.innerHTML = `<div>ℹ️ Original file restored.</div><div>Resolution : ${width} X ${height}</div><div>Original Size : ${sizeKB} kB`;
        resetFeedbackArea.style.color = "#065f46";
      }, 100);
    }

    if (OriginalFile.type === "application/pdf") {
      setTimeout(() => {
        resetFeedbackArea.style.display = "block";
        resetFeedbackArea.innerHTML = `<div>ℹ️ Original file restored.</div><div>Original Size : ${sizeKB} kB`;
        resetFeedbackArea.style.color = "#065f46";
      }, 100);
    }

    setTimeout(() => {
      document.querySelector(".formease-feedback").innerHTML = "";
    }, 200);

    setTimeout(() => {
      document.querySelector(".formease-feedback-resize").innerHTML = "";
      document.querySelector(".formease-feedback-compress").innerHTML = "";
      document.querySelector(".formease-feedback-convert").innerHTML = "";
      document.querySelector(".formease-feedback-pdf").innerHTML = "";
    }, 2000);
  }
});
