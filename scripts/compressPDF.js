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
    document.querySelector(".formease-feedback-compress").innerHTML = "";
    document.querySelector(".formease-feedback-convert").innerHTML = "";
    document.querySelector(".formease-feedback-reset").innerHTML = "";
    document.querySelector(".formease-feedback-resize").innerHTML = "";
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
      // Button visibility is now handled by message passing to toolbox
      // confirmBtn.classList.remove("hidden");
      return new Blob([compressedBytes], { type: "application/pdf" });
    };

    confirmBtn.addEventListener("click", () => {
      console.log(
        "[FormEase-Compress-PDF] Confirm Button click event fired for compressing PDF."
      );

      // Show loading feedback immediately
      pdfFeedback.style.display = "block";
      pdfFeedback.style.color = "#1d4ed8";
      pdfFeedback.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="spinner" style="position: relative; top: 0; left: 0; margin: 0; width: 16px; height: 16px; border-width: 2px;"></div>
          📄 File is being injected... Please wait.
        </div>
      `;

      // Small delay to show the loading message before processing
      setTimeout(() => {
        const newFile = new File([blob], `Compressed: ${file.name}`, {
          type: "application/pdf",
        });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(newFile);

        fileInput.files = dataTransfer.files;

        // Button visibility is now handled by message passing to toolbox
        // confirmBtn.classList.add("hidden");

        setTimeout(() => {
          toolbox.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          pdfFeedback.style.display = "block";
          pdfFeedback.innerHTML = "<div>✅ File injected successfully!</div>";
          pdfFeedback.style.color = "#007bff";
          pdfFeedback.style.backgroundColor = "#f0f9ff";
          pdfFeedback.style.border = "1px solid #007bff";
          pdfFeedback.style.borderRadius = "8px";
          pdfFeedback.style.padding = "12px";
          pdfFeedback.style.boxShadow = "rgba(0, 123, 255, 0.25) 0px 5px 15px;";
        }, 100);

        setTimeout(() => {
          toolbox.remove();
        }, 3000);
      }, 200); // Small delay to show loading state
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

      pdfFeedback.innerHTML = `<div>✅ Compressed. Please review!<div style="margin-top:1rem;">Size: ${size} kB</div></div>`;
      pdfFeedback.style.color = "#007bff";
      pdfFeedback.style.backgroundColor = "#f0f9ff";
      pdfFeedback.style.border = "1px solid #007bff";
      pdfFeedback.style.borderRadius = "8px";
      pdfFeedback.style.padding = "12px";

      setTimeout(() => {
        pdfFeedback.innerHTML =
          "<div>ℹ️ Click on the <strong><em>Save Changes</em></strong> button below to inject the file in input.</div>";
        pdfFeedback.style.color = "#007bff";
        
        // Button visibility is now handled by message passing to toolbox
        // confirmBtn.classList.remove("hidden");
        // confirmBtn.style.backgroundColor = "#007bff";
        // confirmBtn.style.borderColor = "#007bff";
        // confirmBtn.textContent = "Save Changes";
      }, 3000);
    } else {
      errorFeedback();
    }
  } else {
    return;
  }
});
