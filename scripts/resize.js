
/**
 * FormEase Resize Script
 * Handles image resizing operations using the Pica library for high-quality resizing
 * Communicates with the main content script via postMessage API
 */

window.addEventListener('message', (event) => {
  // Only process resize requests from the same window
  if (event.source === window && event.data.type === 'resize') {
    const { inputId, file, scale, timeoutId } = event.data;
    
    console.log(`[FormEase-Resize] Processing resize request for input ${inputId}, scale: ${scale}%`);
    
    // Call the resize function with enhanced callback
    resizeImage(file, scale, (resizedFile, error) => {
      if (error) {
        console.error(`[FormEase-Resize] Resize failed for input ${inputId}:`, error);
        window.postMessage({ 
          type: 'fileProcessingError', 
          error: error.message, 
          inputId: inputId, 
          operation: 'resize',
          timeoutId: timeoutId
        }, '*');
      } else {
        console.log(`[FormEase-Resize] Resize completed for input ${inputId}. Original: ${file.size} bytes, Resized: ${resizedFile.size} bytes`);
        window.postMessage({ 
          type: 'fileProcessed', 
          file: resizedFile, 
          inputId: inputId, 
          originalOperation: 'resize',
          originalSize: file.size,
          newSize: resizedFile.size,
          timeoutId: timeoutId
        }, '*');
      }
    });
  }
});

/**
 * Resize an image file using the Pica library for high-quality resizing
 * @param {File} file - The original image file
 * @param {number} scale - Scale percentage (10-100)
 * @param {Function} callback - Callback function (resizedFile, error)
 */
function resizeImage(file, scale, callback) {
  // Validate input parameters
  if (!file || !file.type.startsWith('image/')) {
    callback(null, new Error('Invalid file type. Only image files are supported.'));
    return;
  }
  
  if (scale < 1 || scale > 100) {
    callback(null, new Error('Scale must be between 1% and 100%'));
    return;
  }
  
  const reader = new FileReader();
  
  // Handle file reading errors
  reader.onerror = function() {
    callback(null, new Error('Failed to read the file'));
  };
  
  reader.onload = function(event) {
    const img = new Image();
    
    // Handle image loading errors
    img.onerror = function() {
      callback(null, new Error('Failed to load the image. The file may be corrupted.'));
    };
    
    img.onload = function() {
      try {
        // Calculate new dimensions
        const targetWidth = Math.round(img.width * (scale / 100));
        const targetHeight = Math.round(img.height * (scale / 100));
        
        // Validate dimensions
        if (targetWidth < 1 || targetHeight < 1) {
          callback(null, new Error('Resulting image dimensions would be too small'));
          return;
        }
        
        if (targetWidth > 32767 || targetHeight > 32767) {
          callback(null, new Error('Resulting image dimensions would be too large'));
          return;
        }
        
        console.log(`[FormEase-Resize] Resizing from ${img.width}x${img.height} to ${targetWidth}x${targetHeight}`);
        
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        // Use Pica for high-quality resizing
        const picaInstance = pica();
        
        picaInstance.resize(img, canvas, {
          // Use Lanczos filter for best quality
          filter: 'lanczos',
          // Enable alpha channel support
          alpha: true
        })
        .then(result => {
          // Convert to blob with same quality and format as original
          return picaInstance.toBlob(result, file.type, 0.92);
        })
        .then(blob => {
          // Create new File object with processed data
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          
          console.log(`[FormEase-Resize] Resize successful. Size reduced from ${file.size} to ${blob.size} bytes`);
          callback(resizedFile, null);
        })
        .catch(error => {
          console.error('[FormEase-Resize] Pica processing error:', error);
          callback(null, new Error(`Image processing failed: ${error.message}`));
        });
        
      } catch (error) {
        console.error('[FormEase-Resize] Unexpected error during resize:', error);
        callback(null, new Error(`Unexpected error: ${error.message}`));
      }
    };
    
    img.src = event.target.result;
  };
  
  reader.readAsDataURL(file);
}
