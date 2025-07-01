window.addEventListener('message', (event) => {
  if (event.source === window && event.data.type === 'convert') {
    const inputId = event.data.inputId;
    convertImage(event.data.file, event.data.format, (convertedFile) => {
      window.postMessage({ type: 'fileProcessed', file: convertedFile, inputId: inputId }, '*');
    });
  }
});

function convertImage(file, format, callback) {
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
        const newFileName = file.name.substring(0, file.name.lastIndexOf('.')) + '.' + format;
        const convertedFile = new File([blob], newFileName, {
          type: 'image/' + format,
          lastModified: Date.now()
        });
        callback(convertedFile);
      }, 'image/' + format);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}