
window.addEventListener('message', (event) => {
  if (event.source === window && event.data.type === 'resize') {
    const inputId = event.data.inputId;
    resizeImage(event.data.file, event.data.scale, (resizedFile) => {
      window.postMessage({ type: 'fileProcessed', file: resizedFile, inputId: inputId }, '*');
    });
  }
});

function resizeImage(file, scale, callback) {
  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const picaInstance = pica();
      const targetWidth = img.width * (scale / 100);
      const targetHeight = img.height * (scale / 100);
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      picaInstance.resize(img, canvas)
        .then(result => picaInstance.toBlob(result, file.type))
        .then(blob => {
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          callback(resizedFile);
        });
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}
