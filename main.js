const width = 900;
const height = 500;

const canvasBottom = document.getElementById('map-bottom');
const canvasTop = document.getElementById('map-top');
canvasBottom.width = width;
canvasBottom.height = height;
canvasTop.width = width;
canvasTop.height = height;

const ctxBottom = canvasBottom.getContext('2d');
const ctxTop = canvasTop.getContext('2d');

const projection = d3.geoNaturalEarth1().fitSize([width, height], { type: 'Sphere' });

const scenarioASelect = document.getElementById('scenarioA');
const scenarioBSelect = document.getElementById('scenarioB');
const yearSlider = document.getElementById('yearSlider');
const yearLabel = document.getElementById('yearLabel');
const swipe = document.getElementById('swipe');
const handle = document.getElementById('swipe-handle');
const playBtn = document.getElementById('play');
const statusEl = document.getElementById('status');
const loadBar = document.getElementById('load-bar');
const loadLabel = document.getElementById('load-label');
const loadContainer = document.getElementById('load-container');

let dataByScenarioYear;
let years;
let playId = null;

function updateSwipe() {
  const p = +swipe.value;
  canvasTop.style.clipPath = 'inset(0 ' + (100 - p) + '% 0 0)';
  handle.style.left = p + '%';
}

function drawScenario(ctx, scenario, year) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#202020';
  ctx.fillRect(0, 0, width, height);

  const spherePath = d3.geoPath(projection, ctx);
  ctx.beginPath();
  spherePath({ type: 'Sphere' });
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  const m1 = dataByScenarioYear.get(scenario);
  if (!m1) return;
  const arr = m1.get(year);
  if (!arr) return;

  const maxVal = d3.max(arr, d => d.pr_mm_day) || 1;
  const color = d3.scaleLinear().domain([0, maxVal]).range(['#f7fbff', '#08306b']);

  arr.forEach(d => {
    const p = projection([d.lon, d.lat]);
    if (!p) return;
    ctx.fillStyle = color(d.pr_mm_day);
    ctx.fillRect(p[0], p[1], 2, 2);
  });
}

function redraw() {
  const year = +yearSlider.value;
  const scenarioA = scenarioASelect.value;
  const scenarioB = scenarioBSelect.value;
  yearLabel.textContent = year;
  drawScenario(ctxBottom, scenarioA, year);
  drawScenario(ctxTop, scenarioB, year);
}

function togglePlay() {
  if (playId) {
    clearInterval(playId);
    playId = null;
    playBtn.textContent = 'Play';
    return;
  }
  playBtn.textContent = 'Pause';
  playId = setInterval(() => {
    const y = +yearSlider.value;
    const idx = years.indexOf(y);
    const next = years[(idx + 1) % years.length];
    yearSlider.value = next;
    redraw();
  }, 800);
}

function loadCsvWithProgress(url) {
  return fetch(url).then(resp => {
    if (!resp.ok) throw new Error('Network error');
    const len = +resp.headers.get('Content-Length') || 0;
    if (!resp.body || !len) {
      loadBar.style.width = '100%';
      loadLabel.textContent = 'Parsing...';
      return resp.text();
    }
    const reader = resp.body.getReader();
    const chunks = [];
    let received = 0;
    function pump() {
      return reader.read().then(result => {
        if (result.done) return;
        chunks.push(result.value);
        received += result.value.length;
        const pct = Math.max(0, Math.min(100, Math.round((received / len) * 100)));
        loadBar.style.width = pct + '%';
        loadLabel.textContent = 'Loading ' + pct + '%';
        return pump();
      });
    }
    return pump().then(() => {
      const decoder = new TextDecoder('utf-8');
      let text = '';
      chunks.forEach(c => {
        text += decoder.decode(c, { stream: true });
      });
      text += decoder.decode();
      loadBar.style.width = '100%';
      loadLabel.textContent = 'Parsing...';
      return text;
    });
  });
}

swipe.addEventListener('input', updateSwipe);
scenarioASelect.addEventListener('change', redraw);
scenarioBSelect.addEventListener('change', redraw);
yearSlider.addEventListener('input', redraw);
playBtn.addEventListener('click', togglePlay);

updateSwipe();
statusEl.textContent = 'Loading full dataset...';

loadCsvWithProgress('precip_5yr_cesm2waccm_ncar.csv')
  .then(text => {
    const raw = d3.csvParse(text);
    raw.forEach(d => {
      d.year = +d.year;
      d.lat = +d.lat;
      d.lon = +d.lon;
      d.pr_mm_day = +d.pr_mm_day;
    });

    dataByScenarioYear = d3.group(raw, d => d.scenario, d => d.year);
    years = Array.from(new Set(raw.map(d => d.year))).sort((a, b) => a - b);

    yearSlider.min = years[0];
    yearSlider.max = years[years.length - 1];
    yearSlider.step = years[1] - years[0];
    yearSlider.value = years[0];
    yearLabel.textContent = years[0];

    statusEl.textContent =
      'Loaded ' + raw.length + ' rows, ' +
      years.length + ' years, ' +
      Array.from(dataByScenarioYear.keys()).join(', ') + '.';

    loadContainer.style.display = 'none';

    redraw();
  })
  .catch(err => {
    console.error(err);
    statusEl.textContent = 'Error loading data (see console).';
    loadLabel.textContent = 'Error';
  });
