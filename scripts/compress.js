
/**
 * FormEase Compress Script
 * Handles image compression to reduce file size while maintaining reasonable quality
 * Communicates with the main content script via postMessage API
 */

window.addEventListener('message', (event) => {
  // Only process compress requests from the same window
  if (event.source === window && event.data.type === 'compress') {
    const { inputId, file, quality, timeoutId } = event.data;
    
    console.log(`[FormEase-Compress] Processing compress request for input ${inputId}, quality: ${quality}`);
    
    // Call the compress function with enhanced callback
    compressImage(file, quality, (compressedFile, error) => {
      if (error) {
        console.error(`[FormEase-Compress] Compression failed for input ${inputId}:`, error);
        window.postMessage({ 
          type: 'fileProcessingError', 
          error: error.message, 
          inputId: inputId, 
          operation: 'compress',
          timeoutId: timeoutId
        }, '*');
      } else {
        const compressionRatio = ((file.size - compressedFile.size) / file.size * 100).toFixed(1);
        console.log(`[FormEase-Compress] Compression completed for input ${inputId}. Size reduced by ${compressionRatio}%`);
        window.postMessage({ 
          type: 'fileProcessed', 
          file: compressedFile, 
          inputId: inputId, 
          originalOperation: 'compress',
          originalSize: file.size,
          newSize: compressedFile.size,
          compressionRatio: compressionRatio,
          timeoutId: timeoutId
        }, '*');
      }
    });
  }
});

/**
 * Compress an image file to reduce file size
 * @param {File} file - The original image file
 * @param {number} quality - Compression quality (0.1-1.0)
 * @param {Function} callback - Callback function (compressedFile, error)
 */
function compressImage(file, quality, callback) {
  // Validate input parameters
  if (!file || !file.type.startsWith('image/')) {
    callback(null, new Error('Invalid file type. Only image files are supported.'));
    return;
  }
  
  if (quality < 0.1 || quality > 1.0) {
    callback(null, new Error('Quality must be between 0.1 and 1.0'));
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
        console.log(`[FormEase-Compress] Compressing image: ${img.width}x${img.height}, quality: ${quality}`);
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        
        // Set background color for images with transparency
        // This ensures consistent compression results
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the image onto canvas
        ctx.drawImage(img, 0, 0);
        
        // Convert to blob with specified quality
        canvas.toBlob((blob) => {
          if (!blob) {
            callback(null, new Error('Failed to compress the image'));
            return;
          }
          
          // Generate filename with appropriate extension
          let fileName = file.name;
          const lastDotIndex = fileName.lastIndexOf('.');
          if (lastDotIndex !== -1) {
            fileName = fileName.substring(0, lastDotIndex) + '.jpg';
          } else {
            fileName = fileName + '.jpg';
          }
          
          // Create new File object with compressed data
          const compressedFile = new File([blob], fileName, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          
          // Check if compression was effective
          if (compressedFile.size >= file.size) {
            console.warn(`[FormEase-Compress] Compressed file is not smaller than original. Original: ${file.size}, Compressed: ${compressedFile.size}`);
          }
          
          console.log(`[FormEase-Compress] Compression successful. Original: ${file.size} bytes, Compressed: ${blob.size} bytes`);
          callback(compressedFile, null);
          
        }, 'image/jpeg', quality);
        
      } catch (error) {
        console.error('[FormEase-Compress] Unexpected error during compression:', error);
        callback(null, new Error(`Unexpected error: ${error.message}`));
      }
    };
    
    img.src = event.target.result;
  };
  
  reader.readAsDataURL(file);
}
