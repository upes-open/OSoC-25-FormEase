
window.addEventListener('message', (event) => {
  if (event.source === window && event.data.type === 'compress') {
    const inputId = event.data.inputId;
    compressImage(event.data.file, event.data.quality, (compressedFile) => {
      window.postMessage({ type: 'fileProcessed', file: compressedFile, inputId: inputId }, '*');
    });
  }
});

function compressImage(file, quality, callback) {
  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        const compressedFile = new File([blob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        callback(compressedFile);
      }, 'image/jpeg', quality);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}
