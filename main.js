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
    
    // Setup event listeners
    setupEventListeners();
    
    // Draw color scale
    drawColorScale();
    
    // Load the actual CSV file
    loadCSV('precip_5yr_cesm2waccm_ncar.csv');
    
    console.log('Initialization started, loading data...');
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

// Load CSV file
async function loadCSV(filePath) {
    try {
        console.log('Loading CSV from:', filePath);
        
        // Show loading message
        const ctxLeft = canvasLeft.getContext('2d');
        const ctxRight = canvasRight.getContext('2d');
        
        ctxLeft.fillStyle = '#1a1a2e';
        ctxLeft.fillRect(0, 0, canvasLeft.width, canvasLeft.height);
        ctxLeft.fillStyle = 'white';
        ctxLeft.font = '20px Arial';
        ctxLeft.fillText('Loading data...', 20, 40);
        
        ctxRight.fillStyle = '#1a1a2e';
        ctxRight.fillRect(0, 0, canvasRight.width, canvasRight.height);
        ctxRight.fillStyle = 'white';
        ctxRight.font = '20px Arial';
        ctxRight.fillText('Loading data...', 20, 40);
        
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        const lines = csvText.trim().split('\n');
        
        console.log('CSV loaded, parsing', lines.length, 'lines...');
        
        data = [];
        // Skip header line (index 0)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(',');
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
        
        console.log('CSV parsed successfully:', data.length, 'data points');
        
        // Log sample data to verify
        console.log('Sample data point:', data[0]);
        console.log('Unique years:', [...new Set(data.map(d => d.year))]);
        console.log('Unique scenarios:', [...new Set(data.map(d => d.scenario))]);
        
        updateMaps();
    } catch (error) {
        console.error('Error loading CSV:', error);
        
        // Show error message on canvas
        const ctxLeft = canvasLeft.getContext('2d');
        const ctxRight = canvasRight.getContext('2d');
        
        ctxLeft.fillStyle = '#1a1a2e';
        ctxLeft.fillRect(0, 0, canvasLeft.width, canvasLeft.height);
        ctxLeft.fillStyle = 'red';
        ctxLeft.font = '16px Arial';
        ctxLeft.fillText('Error loading data file!', 20, 40);
        ctxLeft.fillText('Check console for details', 20, 65);
        
        ctxRight.fillStyle = '#1a1a2e';
        ctxRight.fillRect(0, 0, canvasRight.width, canvasRight.height);
        ctxRight.fillStyle = 'red';
        ctxRight.font = '16px Arial';
        ctxRight.fillText('Error loading data file!', 20, 40);
        ctxRight.fillText('Check console for details', 20, 65);
    }
}

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
    
    // White (255, 255, 255) to Blue (0, 0, 255)
    const r = Math.floor(255 * (1 - normalized));
    const g = Math.floor(255 * (1 - normalized));
    const b = 255; // Always full blue
    
    return `rgb(${r}, ${g}, ${b})`;
}

function drawWorldMap(ctx, width, height) {
    // Draw oceans
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, width, height);
    
    // Draw continents in a simple style
    ctx.fillStyle = '#34495e';
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 1;
    
    // Simple continent outlines (approximate shapes)
    // North America
    drawContinent(ctx, width, height, [
        [-170, 70], [-140, 70], [-120, 50], [-110, 40], [-100, 30], 
        [-90, 25], [-80, 25], [-75, 45], [-60, 50], [-50, 60], 
        [-80, 80], [-120, 75], [-170, 70]
    ]);
    
    // South America
    drawContinent(ctx, width, height, [
        [-80, 10], [-75, 5], [-70, -10], [-65, -20], [-60, -35], 
        [-70, -55], [-75, -50], [-80, -40], [-85, -20], [-85, 0], [-80, 10]
    ]);
    
    // Europe
    drawContinent(ctx, width, height, [
        [-10, 60], [0, 55], [10, 55], [20, 60], [30, 65], [40, 60], 
        [30, 50], [20, 45], [10, 40], [0, 45], [-10, 50], [-10, 60]
    ]);
    
    // Africa
    drawContinent(ctx, width, height, [
        [-15, 35], [0, 30], [10, 30], [20, 25], [35, 10], [40, 0], 
        [40, -10], [35, -25], [20, -35], [15, -30], [10, -20], 
        [0, -10], [-10, 0], [-15, 15], [-15, 35]
    ]);
    
    // Asia
    drawContinent(ctx, width, height, [
        [40, 70], [60, 75], [80, 75], [100, 70], [120, 65], [140, 60], 
        [145, 50], [140, 40], [130, 35], [120, 25], [110, 20], 
        [100, 15], [90, 10], [80, 15], [70, 20], [60, 30], 
        [50, 40], [40, 50], [40, 70]
    ]);
    
    // Australia
    drawContinent(ctx, width, height, [
        [115, -10], [125, -12], [135, -15], [145, -20], [150, -30], 
        [145, -38], [135, -35], [125, -30], [115, -25], [115, -10]
    ]);
    
    // Antarctica
    drawContinent(ctx, width, height, [
        [-180, -70], [180, -70], [180, -90], [-180, -90], [-180, -70]
    ]);
    
    // Draw latitude/longitude grid lines
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 0.5;
    
    // Latitude lines
    for (let lat = -80; lat <= 80; lat += 20) {
        const y = ((90 - lat) / 180) * height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Longitude lines
    for (let lon = 0; lon < 360; lon += 30) {
        const x = (lon / 360) * width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
}

function drawContinent(ctx, width, height, coords) {
    ctx.beginPath();
    coords.forEach((coord, i) => {
        const x = ((coord[0] + 180) / 360) * width;
        const y = ((90 - coord[1]) / 180) * height;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
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
    
    // Draw world map background
    drawWorldMap(ctx, width, height);
    
    // Filter data
    const filteredData = data.filter(d => d.year === currentYear && d.scenario === scenario);
    console.log(`Drawing ${scenario} for ${currentYear}:`, filteredData.length, 'points');
    
    if (filteredData.length === 0) {
        console.warn('No data to display for', scenario, currentYear);
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText(`No data for ${scenario} ${currentYear}`, 20, 60);
        return;
    }
    
    // Draw data points with transparency
    filteredData.forEach(point => {
        const x = (point.lon / 360) * width;
        const y = ((90 - point.lat) / 180) * height;
        const size = Math.max(2, width / 144);
        
        const color = getColor(point.pr_mm_day);
        // Add transparency (0.6 = 60% opacity)
        const transparentColor = color.replace('rgb', 'rgba').replace(')', ', 0.6)');
        
        ctx.fillStyle = transparentColor;
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
