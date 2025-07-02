/**
 * FormEase Convert Script
 * Handles image format conversion between different file types
 * Communicates with the main content script via postMessage API
 */

window.addEventListener('message', (event) => {
  // Only process convert requests from the same window
  if (event.source === window && event.data.type === 'convert') {
    const { inputId, file, format, timeoutId } = event.data;
    
    console.log(`[FormEase-Convert] Processing convert request for input ${inputId}, target format: ${format}`);
    
    // Call the convert function with enhanced callback
    convertImage(file, format, (convertedFile, error) => {
      if (error) {
        console.error(`[FormEase-Convert] Conversion failed for input ${inputId}:`, error);
        window.postMessage({ 
          type: 'fileProcessingError', 
          error: error.message, 
          inputId: inputId, 
          operation: 'convert',
          timeoutId: timeoutId
        }, '*');
      } else {
        console.log(`[FormEase-Convert] Conversion completed for input ${inputId}. From ${file.type} to ${convertedFile.type}`);
        window.postMessage({ 
          type: 'fileProcessed', 
          file: convertedFile, 
          inputId: inputId, 
          originalOperation: 'convert',
          originalFormat: file.type,
          newFormat: convertedFile.type,
          originalSize: file.size,
          newSize: convertedFile.size,
          timeoutId: timeoutId
        }, '*');
      }
    });
  }
});

/**
 * Convert an image file to a different format
 * @param {File} file - The original image file
 * @param {string} format - Target format ('jpeg', 'png', 'webp')
 * @param {Function} callback - Callback function (convertedFile, error)
 */
function convertImage(file, format, callback) {
  // Validate input parameters
  if (!file || !file.type.startsWith('image/')) {
    callback(null, new Error('Invalid file type. Only image files are supported.'));
    return;
  }
  
  // Supported formats
  const supportedFormats = ['jpeg', 'jpg', 'png', 'webp'];
  if (!supportedFormats.includes(format.toLowerCase())) {
    callback(null, new Error(`Unsupported format. Supported formats: ${supportedFormats.join(', ')}`));
    return;
  }
  
  // Normalize format
  const targetFormat = format.toLowerCase() === 'jpg' ? 'jpeg' : format.toLowerCase();
  const mimeType = `image/${targetFormat}`;
  
  // Check if conversion is actually needed
  if (file.type === mimeType) {
    console.log(`[FormEase-Convert] File is already in ${targetFormat} format`);
    callback(file, null);
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
        console.log(`[FormEase-Convert] Converting image: ${img.width}x${img.height} from ${file.type} to ${mimeType}`);
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        
        // For JPEG conversion, add white background to handle transparency
        if (targetFormat === 'jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Draw the image onto canvas
        ctx.drawImage(img, 0, 0);
        
        // Convert to blob with appropriate quality
        const quality = targetFormat === 'jpeg' ? 0.92 : undefined;
        
        canvas.toBlob((blob) => {
          if (!blob) {
            callback(null, new Error('Failed to convert the image'));
            return;
          }
          
          // Generate new filename with correct extension
          let newFileName = file.name;
          const lastDotIndex = newFileName.lastIndexOf('.');
          if (lastDotIndex !== -1) {
            newFileName = newFileName.substring(0, lastDotIndex) + '.' + targetFormat;
          } else {
            newFileName = newFileName + '.' + targetFormat;
          }
          
          // Create new File object with converted data
          const convertedFile = new File([blob], newFileName, {
            type: mimeType,
            lastModified: Date.now()
          });
          
          console.log(`[FormEase-Convert] Conversion successful. Size changed from ${file.size} to ${blob.size} bytes`);
          callback(convertedFile, null);
          
        }, mimeType, quality);
        
      } catch (error) {
        console.error('[FormEase-Convert] Unexpected error during conversion:', error);
        callback(null, new Error(`Unexpected error: ${error.message}`));
      }
    };
    
    img.src = event.target.result;
  };
  
  reader.readAsDataURL(file);
}
