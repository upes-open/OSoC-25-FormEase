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

    // Clear all feedback areas at the start of a new process
    document.querySelector(".formease-feedback").innerHTML = "";
    document.querySelector(".formease-feedback-compress").innerHTML = "";
    document.querySelector(".formease-feedback-convert").innerHTML = "";
    document.querySelector(".formease-feedback-reset").innerHTML = "";
    document.querySelector(".formease-feedback-resize").innerHTML = "";
    const pdfFeedback = document.querySelector(".formease-feedback-pdf");

    const compressingFeedback = () => {
      pdfFeedback.style.display = "block";
      pdfFeedback.innerHTML = '<span>ℹ️ Compressing... <span class="loader-spinner"></span></span>'; // Added loader to compressing state
      pdfFeedback.style.color = "#1d4ed8"; // Blue color for compression
      pdfFeedback.style.boxShadow = "none"; // Clear any old shadow
    };

    // NEW: Function to display "File is being injected..."
    const injectingFeedback = () => {
      pdfFeedback.style.display = "block";
      pdfFeedback.innerHTML =
        '<span>File is being injected... Please wait. <span class="loader-spinner"></span></span>';
      pdfFeedback.style.color = "#1d4ed8"; // Blue color for injection
      pdfFeedback.style.boxShadow = "none"; // Remove any previous shadows
    };

    const errorFeedback = (message = "Some Error occurred during the process") => {
      pdfFeedback.style.display = "block";
      pdfFeedback.style.color = "#dc2626";
      pdfFeedback.style.boxShadow = "rgba(219, 0, 0, 1) 0px 5px 15px;";
      pdfFeedback.innerHTML = `<div>${message}</div>`;
      console.error(
        "[FormEase-Compress-PDF] ❌ An error occurred:", message
      );
      // Ensure loader is removed if an error occurs
      const loader = pdfFeedback.querySelector('.loader-spinner');
      if (loader) {
          loader.remove();
      }
    };

    const compressPDF = async (file) => {
      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFLib.PDFDocument.load(arrayBuffer);

      const newDoc = await PDFLib.PDFDocument.create();
      const pages = await newDoc.copyPages(srcDoc, srcDoc.getPageIndices());

      pages.forEach((page) => newDoc.addPage(page));

      const compressedBytes = await newDoc.save();
      confirmBtn.classList.remove("hidden"); // This button should be shown after compression, before injection
      return new Blob([compressedBytes], { type: "application/pdf" });
    };

    confirmBtn.addEventListener("click", () => {
      console.log(
        "[FormEase-Compress-PDF] Confirm Button click event fired for injecting PDF."
      );

      // --- NEW CODE START ---
      // Display "File is being injected..." and show loader
      injectingFeedback();

      // Delay the actual injection slightly to allow the "injecting" message to render
      setTimeout(() => {
        // --- NEW CODE END ---

        const newFile = new File([blob], `Compressed: ${file.name}`, {
          type: "application/pdf",
        });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(newFile);

        fileInput.files = dataTransfer.files;

        confirmBtn.classList.add("hidden"); // Hide button after injection

        toolbox.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        pdfFeedback.style.display = "block";
        pdfFeedback.innerHTML = "<div>✅ File Injected Successfully!</div>"; // Final success message
        pdfFeedback.style.boxShadow = "rgba(46, 242, 11, 1) 0px 5px 15px;"; // Green shadow for success

        // --- NEW CODE START ---
      }, 50); // Small delay to allow UI update
      // --- NEW CODE END ---

      // This setTimeout for toolbox removal should stay outside the inner setTimeout
      // to ensure it happens regardless of small UI render delays.
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
        pdfFeedback.style.display = "block";
        pdfFeedback.innerHTML = "<div>⚠️ Invalid file type. Please select a PDF.</div>";
        pdfFeedback.style.color = "#dc2626";
        setTimeout(() => (pdfFeedback.style.display = "none"), 3000);
        return;
      }

      compressingFeedback(); // Show "Compressing..." message with loader

      try {
        const compressedBlob = await compressPDF(file);
        blob = compressedBlob; // Assign the compressed blob to the 'blob' variable

        const size = (compressedBlob.size / 1024).toFixed(2);

        console.log("[FormEase-Compress-PDF] PDF Compressed Successfully.");
        console.log("[FormEase-Compress-PDF] New PDF : ", compressedBlob);

        // Update message after compression is done, and before the user clicks confirm for injection
        pdfFeedback.innerHTML = `<div>✅ Compressed. Please review!</div><div style="margin-top:1rem;">Size: ${size} kB</div>`;
        pdfFeedback.style.color = "#1d4ed8"; // Keep it blue for the compression success preview
        pdfFeedback.style.boxShadow = "none"; // Remove shadow for this intermediate message

        // Remove the loader from the compressing feedback once compression is done
        const loader = pdfFeedback.querySelector('.loader-spinner');
        if (loader) {
            loader.remove();
        }

        setTimeout(() => {
          pdfFeedback.innerHTML =
            "<div>ℹ️ Click on the <strong><em>Save Changes</em></strong> button below to inject the file in input.</div>";
          pdfFeedback.style.color = "#1d4ed8"; // Blue for the info message
          pdfFeedback.style.boxShadow = "none"; // No shadow
        }, 3000);

      } catch (error) {
        console.error("[FormEase-Compress-PDF] Error during compression:", error);
        errorFeedback("Error during compression. Please try again."); // More specific error message
        confirmBtn.classList.add("hidden"); // Hide confirm button if compression failed
      }
    } else {
      errorFeedback("PDF-lib library not loaded. Cannot compress PDF."); // More specific error
    }
  } else {
    return;
  }
});