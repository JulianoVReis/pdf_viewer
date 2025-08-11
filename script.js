const url = './pdf/asdasdsad.pdf';
const container = document.getElementById('pdf-container');
const navInfo = document.getElementById('page-info');
const lockBtn = document.getElementById('lock-btn');

let pdfDoc = null;
let scale = 1;
const scaleStep = 0.1;
const minScale = 0.5;
const maxScale = 3;
let zoomLocked = false;
let baseScale = 1;

const savedScale = localStorage.getItem('pdf-scale');
const savedScrollTop = localStorage.getItem('pdf-scrollTop');
const savedLock = localStorage.getItem('pdf-zoom-locked');

if(savedScale) scale = parseFloat(savedScale);
if(savedLock) zoomLocked = savedLock === 'true';
lockBtn.textContent = zoomLocked ? '🔒' : '🔓';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.15.349/pdf.worker.min.js';

let pagePositions = [];

function waitNextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

async function renderAllPages() {
  container.innerHTML = '';
  pagePositions = [];
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

  const firstPage = await pdfDoc.getPage(1);
  const unscaledViewport = firstPage.getViewport({ scale: 1 });
  const containerWidth = container.clientWidth || window.innerWidth;

  baseScale = containerWidth / unscaledViewport.width;

  const renderScale = baseScale * scale;

  for(let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = viewport.width * pixelRatio;
    canvas.height = viewport.height * pixelRatio;
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    container.appendChild(canvas);

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    pagePositions.push(canvas.offsetTop);
  }

  navInfo.textContent = `Página 1 / ${pdfDoc.numPages}`;
}

function updateCurrentPage() {
  const scrollTop = container.scrollTop;
  let currentPage = 1;

  for(let i = 0; i < pagePositions.length; i++) {
    if(scrollTop + 50 >= pagePositions[i]) {
      currentPage = i + 1;
    } else {
      break;
    }
  }

  navInfo.textContent = `Página ${currentPage} / ${pdfDoc.numPages}`;
}

async function loadPdf() {
  pdfDoc = await pdfjsLib.getDocument(url).promise;
  await renderAllPages();

  await waitNextFrame();
  await waitNextFrame();

  if(savedScrollTop) {
    container.scrollTop = parseInt(savedScrollTop);
  }
}

loadPdf();

container.addEventListener('scroll', () => {
  localStorage.setItem('pdf-scrollTop', container.scrollTop);
  updateCurrentPage();
});

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

lockBtn.addEventListener('click', () => {
  zoomLocked = !zoomLocked;
  lockBtn.textContent = zoomLocked ? '🔒' : '🔓';
  localStorage.setItem('pdf-zoom-locked', zoomLocked);
});

let lastDist = null;
container.addEventListener('touchmove', (e) => {
  if(zoomLocked) return;
  if(e.touches.length === 2) {
    e.preventDefault();
    const dist = Math.hypot(
      e.touches[0].pageX - e.touches[1].pageX,
      e.touches[0].pageY - e.touches[1].pageY
    );
    if(lastDist) {
      const diff = dist - lastDist;
      if(Math.abs(diff) > 5) {
        if(diff > 0) {
          scale = clamp(scale + scaleStep, minScale, maxScale);
        } else {
          scale = clamp(scale - scaleStep, minScale, maxScale);
        }
        localStorage.setItem('pdf-scale', scale);
        loadPdf();
      }
    }
    lastDist = dist;
  }
});
container.addEventListener('touchend', (e) => {
  if(e.touches.length < 2) lastDist = null;
});