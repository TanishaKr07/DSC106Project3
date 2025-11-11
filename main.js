// Global variables
let data = [];
let currentYear = 2015;
let sliderPosition = 50;
let isDragging = false;
const years = [2015, 2020, 2025, 2030, 2035, 2040, 2045, 2050, 2055, 2060, 2065, 2070, 2075, 2080, 2085, 2090, 2095, 2100];

// DOM elements
let canvasLeft, canvasRight, mapContainer, sliderLine, rightMapContainer;
let yearSlider, yearDisplay, prevYearBtn, nextYearBtn, colorScale;

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    
    // Get DOM elements
    canvasLeft = document.getElementById('canvasLeft');
    canvasRight = document.getElementById('canvasRight');
    mapContainer = document.getElementById('mapContainer');
    sliderLine = document.getElementById('sliderLine');
    rightMapContainer = document.getElementById('rightMapContainer');
    yearSlider = document.getElementById('yearSlider');
    yearDisplay = document.getElementById('yearDisplay');
    prevYearBtn = document.getElementById('prevYear');
    nextYearBtn = document.getElementById('nextYear');
    colorScale = document.getElementById('colorScale');
    
    // Initialize
    init();
});

function init() {
    console.log('Initializing application...');
    
    // Set canvas sizes
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Generate data
    generateSampleData();
    console.log('Data generated:', data.length, 'points');
    
    // Setup event listeners
    setupEventListeners();
    
    // Draw color scale
    drawColorScale();
    
    // Update maps
    updateMaps();
    
    console.log('Initialization complete');
}

function resizeCanvas() {
    const container = mapContainer;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Set canvas resolution
    canvasLeft.width = width;
    canvasLeft.height = height;
    canvasRight.width = width;
    canvasRight.height = height;
    
    console.log('Canvas resized to:', width, 'x', height);
    
    // Redraw if data exists
    if (data.length > 0) {
        updateMaps();
    }
}

// Generate sample data
function generateSampleData() {
    data = [];
    const scenarios = ['ssp126', 'ssp245'];
    
    years.forEach(year => {
        scenarios.forEach(scenario => {
            for (let lat = -90; lat <= 90; lat += 5) {
                for (let lon = -180; lon < 180; lon += 5) {
                    const baseValue = 0.17 + (Math.sin(lat * Math.PI / 180) + 1) * 0.3;
                    const yearFactor = scenario === 'ssp245' ? (year - 2015) / 850 : (year - 2015) / 1700;
                    const lonFactor = Math.cos(lon * Math.PI / 180) * 0.1;
                    const value = baseValue + yearFactor + lonFactor + Math.random() * 0.05;
                    data.push({ year, lat, lon, pr_mm_day: value, scenario });
                }
            }
        });
    });
}

// Load CSV file (uncomment and use this when you have your actual data file)
/*
async function loadCSV(filePath) {
    try {
        console.log('Loading CSV from:', filePath);
        const response = await fetch(filePath);
        const csvText = await response.text();
        const lines = csvText.trim().split('\n');
        
        data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length >= 5) {
                data.push({
                    year: parseInt(values[0]),
                    lat: parseFloat(values[1]),
                    lon: parseFloat(values[2]),
                    pr_mm_day: parseFloat(values[3]),
                    scenario: values[4].trim()
                });
            }
        }
        
        console.log('CSV loaded:', data.length, 'rows');
        updateMaps();
    } catch (error) {
        console.error('Error loading CSV:', error);
    }
}
// Uncomment to use: loadCSV('your-data.csv');
*/

function setupEventListeners() {
    // Year controls
    yearSlider.addEventListener('input', (e) => {
        currentYear = years[parseInt(e.target.value)];
        yearDisplay.textContent = currentYear;
        updateMaps();
        updateYearButtons();
    });

    prevYearBtn.addEventListener('click', () => {
        const idx = years.indexOf(currentYear);
        if (idx > 0) {
            currentYear = years[idx - 1];
            yearSlider.value = idx - 1;
            yearDisplay.textContent = currentYear;
            updateMaps();
            updateYearButtons();
        }
    });

    nextYearBtn.addEventListener('click', () => {
        const idx = years.indexOf(currentYear);
        if (idx < years.length - 1) {
            currentYear = years[idx + 1];
            yearSlider.value = idx + 1;
            yearDisplay.textContent = currentYear;
            updateMaps();
            updateYearButtons();
        }
    });

    // Map slider
    mapContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateSliderPosition(e);
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            updateSliderPosition(e);
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Touch events
    mapContainer.addEventListener('touchstart', (e) => {
        isDragging = true;
        updateSliderPosition(e.touches[0]);
        e.preventDefault();
    });

    document.addEventListener('touchmove', (e) => {
        if (isDragging) {
            updateSliderPosition(e.touches[0]);
            e.preventDefault();
        }
    });

    document.addEventListener('touchend', () => {
        isDragging = false;
    });
}

function updateSliderPosition(e) {
    const rect = mapContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    sliderPosition = Math.max(0, Math.min(100, (x / rect.width) * 100));
    
    sliderLine.style.left = `${sliderPosition}%`;
    rightMapContainer.style.clipPath = `inset(0 0 0 ${sliderPosition}%)`;
}

function updateYearButtons() {
    const idx = years.indexOf(currentYear);
    prevYearBtn.disabled = idx === 0;
    nextYearBtn.disabled = idx === years.length - 1;
}

function getColor(value) {
    const min = 0.1;
    const max = 1.5;
    const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
    
    const r = Math.floor(normalized * 255);
    const b = Math.floor((1 - normalized) * 255);
    const g = Math.floor(128 * (1 - Math.abs(normalized - 0.5) * 2));
    
    return `rgb(${r}, ${g}, ${b})`;
}

function drawMap(canvas, scenario) {
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    // Filter data
    const filteredData = data.filter(d => d.year === currentYear && d.scenario === scenario);
    console.log(`Drawing ${scenario}:`, filteredData.length, 'points');
    
    if (filteredData.length === 0) {
        console.warn('No data to display for', scenario, currentYear);
        return;
    }
    
    // Draw data points
    filteredData.forEach(point => {
        const x = ((point.lon + 180) / 360) * width;
        const y = ((90 - point.lat) / 180) * height;
        const size = Math.max(2, width / 72);
        
        ctx.fillStyle = getColor(point.pr_mm_day);
        ctx.fillRect(x - size/2, y - size/2, size, size);
    });
    
    // Draw scenario label
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(scenario.toUpperCase(), 20, 40);
    ctx.shadowBlur = 0;
}

function updateMaps() {
    console.log('Updating maps for year:', currentYear);
    drawMap(canvasLeft, 'ssp126');
    drawMap(canvasRight, 'ssp245');
}

function drawColorScale() {
    for (let i = 0; i < 50; i++) {
        const div = document.createElement('div');
        div.style.flex = '1';
        div.style.backgroundColor = getColor(0.1 + (i / 50) * 1.4);
        colorScale.appendChild(div);
    }
}

// Initialize year buttons
if (prevYearBtn && nextYearBtn) {
    updateYearButtons();
}
