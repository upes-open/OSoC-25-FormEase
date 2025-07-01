function injectScript(filePath) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(filePath);
  (document.head || document.documentElement).appendChild(script);
}

injectScript('scripts/pica.min.js');
injectScript('scripts/resize.js');
injectScript('scripts/compress.js');
injectScript('scripts/convert.js');

document.querySelectorAll('input[type="file"]').forEach(input => {
  const toolbox = document.createElement('div');
  fetch(chrome.runtime.getURL('toolbox.html'))
    .then(response => response.text())
    .then(data => {
      toolbox.innerHTML = data;
      input.parentNode.insertBefore(toolbox, input.nextSibling);
      
      const resizeSlider = toolbox.querySelector('#resize');
      resizeSlider.addEventListener('input', (e) => {
        const scale = e.target.value;
        if (input.files && input.files[0]) {
          window.postMessage({ type: 'resize', file: input.files[0], scale: scale }, '*');
        }
      });

      const compressBtn = toolbox.querySelector('#compressBtn');
      compressBtn.addEventListener('click', () => {
        if (input.files && input.files[0]) {
          window.postMessage({ type: 'compress', file: input.files[0], quality: 0.7 }, '*');
        }
      });

      const convertBtn = toolbox.querySelector('#convertBtn');
      convertBtn.addEventListener('click', () => {
        if (input.files && input.files[0]) {
          window.postMessage({ type: 'convert', file: input.files[0], format: 'jpeg' }, '*');
        }
      });
    });

  window.addEventListener('message', (event) => {
    if (event.source === window && event.data.type === 'fileProcessed') {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(event.data.file);
      input.files = dataTransfer.files;
    }
  });
});
