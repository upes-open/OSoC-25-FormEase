/**
 * FormEase Compress PDF Script
 * Handles PDF compression to reduce file size while maintaining reasonable quality
 * Communicates with the main content script via postMessage API
 */

window.addEventListener("message", async (event) => {
  // Only process compress requests from the same window
  if (event.source === window && event.data.type === "compress-PDF") {
    console.log("[FormEase-Compress-PDF] ✅ compressPDF.js loaded.");

    const { inputId } = event.data;

    console.log(
      `[FormEase-Compress-PDF] Processing compress PDF request for input ${inputId}`
    );

    console.log("[FormEase-Compress-PDF] Compress PDF Logic called");

    const fileInput = document.querySelector(
      `input[type="file"][data-form-ease-id=${inputId}]`
    );
    console.log(
      `[FormEase-Compress-PDF] File taken for compressing with formeaseId ${inputId} : `,
      fileInput.files[0]
    );

    const toolbox = document.querySelector(
      `.formease-toolbox[data-input-id="${inputId}"]`
    );

    const file = fileInput.files[0];
    let blob = null;

    const confirmBtn = document.getElementById("confirm-btn");

    document.querySelector(".formease-feedback").innerHTML = "";
    const pdfFeedback = document.querySelector(".formease-feedback-pdf");

    const compressingFeedback = () => {
      pdfFeedback.style.display = "block";
      pdfFeedback.innerHTML = "<span>ℹ️ Compressing...</span>";
      pdfFeedback.style.color = "#1d4ed8";
      return;
    };

    const errorFeedback = () => {
      pdfFeedback.style.display = "block";
      pdfFeedback.style.color = "#dc2626";
      pdfFeedback.style.boxShadow = "rgba(219, 0, 0, 1) 0px 5px 15px;";
      pdfFeedback.innerHTML =
        "<div>Some Error occured during the process</div>";
      console.error(
        "[FormEase-Compress-PDF] ❌ pdf-lib is not available. Check if pdf-lib.min.js was loaded."
      );
    };

    const compressPDF = async (file) => {
      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFLib.PDFDocument.load(arrayBuffer);

      const newDoc = await PDFLib.PDFDocument.create();
      const pages = await newDoc.copyPages(srcDoc, srcDoc.getPageIndices());

      pages.forEach((page) => newDoc.addPage(page));

      const compressedBytes = await newDoc.save();
      confirmBtn.classList.remove("hidden");
      return new Blob([compressedBytes], { type: "application/pdf" });
    };

    confirmBtn.addEventListener("click", () => {
      console.log(
        "[FormEase-Compress-PDF] Confirm Button click event fired for compressing PDF."
      );

      const newFile = new File([blob], `Compressed: ${file.name}`, {
        type: "application/pdf",
      });

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(newFile);

      fileInput.files = dataTransfer.files;

      confirmBtn.classList.add("hidden");

      setTimeout(() => {
        toolbox.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        pdfFeedback.style.display = "block";
        pdfFeedback.innerHTML = "<div>✅ File Injected Successfully!";
        pdfFeedback.style.boxShadow = "rgba(46, 242, 11, 1) 0px 5px 15px;";
      }, 100);

      setTimeout(() => {
        toolbox.remove();
      }, 3000);
    });

    if (typeof PDFLib !== "undefined" && PDFLib.PDFDocument) {
      console.log("✅ pdf-lib is loaded and ready.");

      if (!file) {
        pdfFeedback.style.display = "block";
        pdfFeedback.innerHTML = "⚠️ Please select a file before applying.";
        pdfFeedback.style.color = "#dc2626";
        alert("Please select a file before applying compress.");
        setTimeout(() => (pdfFeedback.style.display = "none"), 3000);
        return;
      }

      if (!file || file.type !== "application/pdf") {
        console.error("Invalid file.");
        return;
      }

      compressingFeedback();

      const compressedBlob = await compressPDF(file);
      blob = compressedBlob;

      const size = (compressedBlob.size / 1024).toFixed(2);

      console.log("[FormEase-Compress-PDF] PDF Compressed Successfully.");

      console.log("[FormEase-Compress-PDF] New PDF : ", compressedBlob);

      pdfFeedback.innerHTML = `<div>✅ Compressed. Please review!<div style="margin-top:1rem;">Size: ${size} kB<div>`;

      setTimeout(() => {
        pdfFeedback.innerHTML =
          "<div>ℹ️ Click on the Save Changes button below to inject the file in input.</div>";
      }, 3000);
    } else {
      errorFeedback();
    }
  } else {
    return;
  }
});
