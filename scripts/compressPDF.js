// Compress PDF Script

console.log("[FormEase-Compress-PDF] ✅ compressPDF.js loaded.");

if (typeof PDFLib !== "undefined" && PDFLib.PDFDocument) {
  console.log("✅ pdf-lib is loaded and ready.");
} else {
  console.error(
    "❌ pdf-lib is not available. Check if pdf-lib.min.js was loaded."
  );
}
