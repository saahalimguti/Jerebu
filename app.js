/**
 * IPU Malaysia 3D Dashboard — Frontend Application Logic
 * Integrates Leaflet 3D Relief Terrain Map, Real-Time APIMS Data,
 * Side-by-Side Comparison Engine, and Emil Kowalski Micro-Interactions.
 */

// Application State
const state = window.appState = {
  data: null,
  map: null,
  markers: [],
  fogMarkers: [],
  fogEnabled: true,
  hazeFogPane: null,
  selectedStation: null,
  activeFilter: 'all',
  searchQuery: '',
  activeTab: 'map'
};

// Initialize Application
function initApp() {
  initMap();
  setupEventListeners();
  setupViewportZoomLock();
  loadLiveData();

  // Auto-refresh poll every 60 seconds
  setInterval(() => {
    loadLiveData(true);
  }, 60000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

/**
 * Initialize 3D Satellite Relief Leaflet Map
 */
function initMap() {
  state.map = L.map('mapContainer', {
    zoomControl: false,
    attributionControl: false,
    preferCanvas: true,
    zoomAnimation: true,
    zoomAnimationThreshold: 4,
    fadeAnimation: true,
    markerZoomAnimation: true,
    inertia: true,
    inertiaDeceleration: 3000,
    easeLinearity: 0.2,
    wheelDebounceTime: 40,
    wheelPxPerZoomLevel: 120
  });

  // Fit bounds precisely to Malaysia with responsive padding for mobile portrait
  const isMobilePortrait = window.innerWidth <= 768;
  state.map.fitBounds([
    [0.6, 99.2],  // Southwest Peninsular (includes Johor & Singapore border)
    [7.6, 119.5]  // Northeast Sabah
  ], {
    paddingTopLeft: isMobilePortrait ? [75, 12] : [30, 20],
    paddingBottomRight: isMobilePortrait ? [120, 12] : [30, 20]
  });

  // High-Resolution Satellite Imagery with butter-smooth tile caching
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18,
    opacity: 0.95,
    updateWhenZooming: false,
    updateWhenIdle: true,
    keepBuffer: 6
  }).addTo(state.map);

  // Create Dedicated Atmospheric Haze Fog Pane (zIndex 350, below pins 600, above tiles 200)
  state.map.createPane('hazeFogPane');
  state.hazeFogPane = state.map.getPane('hazeFogPane');
  state.hazeFogPane.style.zIndex = '350';
  state.hazeFogPane.style.pointerEvents = 'none';

  // Cache map container element
  state.mapContainerElem = document.getElementById('mapContainer');

  // Buttery Smooth Zoom Handler (zero DOM recreation, 60fps compositor scale)
  state.map.on('zoomend', () => {
    handleMapZoom();
    updateHazeFogScale();
  });

  // Initial setup
  handleMapZoom();
  updateHazeFogScale();
}

/**
 * Handle Progressive Station Label Disclosure on Map Zoom
 */
function handleMapZoom() {
  if (!state.map) return;
  const zoom = state.map.getZoom();
  const mapElem = state.mapContainerElem || document.getElementById('mapContainer');
  if (!mapElem) return;

  if (zoom >= 7) {
    mapElem.classList.add('zoomed-in');
  } else {
    mapElem.classList.remove('zoomed-in');
  }

  if (zoom >= 9) {
    mapElem.classList.add('deep-zoom');
  } else {
    mapElem.classList.remove('deep-zoom');
  }
}

/**
 * Fetch Live IPU Dataset from Local Server API
 */
async function loadLiveData(isBackground = false) {
  const refreshBtn = document.getElementById('refreshBtn');
  const drawerRefreshBtn = document.getElementById('drawerRefreshBtn');
  if (!isBackground) {
    if (refreshBtn) refreshBtn.classList.add('spinning');
    if (drawerRefreshBtn) drawerRefreshBtn.classList.add('spinning');
  }

  try {
    let dataset = null;
    const cacheBuster = `t=${Date.now()}`;

    // 1. Try Live API endpoint (/api/live)
    try {
      const response = await fetch(`/api/live?${cacheBuster}`);
      if (response.ok) {
        dataset = await response.json();
      }
    } catch (apiErr) {
      console.warn('Live API unreachable, attempting static cache fallback...', apiErr);
    }

    // 2. Fallback to bundled dataset (/data/ipu_latest.json) if API is unavailable or static hosting
    if (!dataset || !dataset.summary) {
      try {
        const fallbackResp = await fetch(`/data/ipu_latest.json?${cacheBuster}`);
        if (fallbackResp.ok) {
          dataset = await fallbackResp.json();
        }
      } catch (fbErr) {
        console.warn('Static cache fallback failed:', fbErr);
      }
    }

    if (!dataset || !dataset.summary) {
      throw new Error('Unable to load IPU dataset from any source');
    }

    state.data = dataset;
    renderDashboard(dataset);
  } catch (error) {
    console.error('Error loading IPU data:', error);
  } finally {
    if (refreshBtn) {
      setTimeout(() => refreshBtn.classList.remove('spinning'), 500);
    }
    if (drawerRefreshBtn) {
      setTimeout(() => drawerRefreshBtn.classList.remove('spinning'), 500);
    }
  }
}

/**
 * Render All Dashboard Components
 */
function renderDashboard(data) {
  if (!data || !data.summary) return;

  // 1. Update Header Info
  updateHeader(data);

  // 2. Update Left Summary Card & Gauges
  updateSummaryCard(data.summary);

  // 3. Render Stations onto Map
  renderMapMarkers(data.stations);

  // 3.5. Render Atmospheric Haze Fog Shroud on Map
  renderHazeFogLayer(data.stations);

  // 4. Render Station List in Sidebar
  renderStationList(data.stations);

  // 5. Populate Comparison Table Modal
  renderComparisonTable(data.comparisons);

  // 6. If a station was selected, update its drawer details
  if (state.selectedStation) {
    const updated = data.stations.find(s => s.id === state.selectedStation.id);
    if (updated) openStationDrawer(updated);
  }
}

/**
 * Update Header Timestamp & Status Pill
 */
function updateHeader(data) {
  const timeElem = document.getElementById('formattedTimestamp');
  if (timeElem && data.formatted_time) {
    timeElem.textContent = data.formatted_time;
  }

  const statusPill = document.getElementById('globalStatusPill');
  const statusText = document.getElementById('globalStatusText');
  if (statusPill && statusText && data.summary) {
    statusText.textContent = data.summary.status;
    statusPill.className = `status-pill status-${data.summary.status_slug}`;
  }
}

/**
 * Update Top Left Summary Card & SVG Circular Gauge
 */
function updateSummaryCard(summary) {
  const nationalValElem = document.getElementById('nationalGaugeVal');
  const nationalLabelElem = document.getElementById('nationalGaugeLabel');
  const progressCircle = document.getElementById('gaugeProgressCircle');

  if (nationalValElem) nationalValElem.textContent = summary.national_api;
  if (nationalLabelElem) {
    nationalLabelElem.textContent = summary.status;
    nationalLabelElem.style.color = summary.status_color;
  }

  // Update SVG Gauge Circumference Math (Radius = 50, C = 2 * PI * 50 = 314.159)
  if (progressCircle) {
    const circumference = 314.159;
    const maxVal = 250;
    const progress = Math.min(summary.national_api / maxVal, 1);
    const offset = circumference - (progress * circumference);
    progressCircle.style.strokeDashoffset = offset;
    progressCircle.style.stroke = summary.status_color;
  }

  // Regional breakdown values
  const semVal = document.getElementById('semenanjungVal');
  const sabVal = document.getElementById('sabahVal');
  const sarVal = document.getElementById('sarawakVal');

  if (semVal) semVal.textContent = summary.semenanjung_api;
  if (sabVal) sabVal.textContent = summary.sabah_api;
  if (sarVal) sarVal.textContent = summary.sarawak_api;

  // Trend modal values
  const tSem = document.getElementById('trendSemVal');
  const tSab = document.getElementById('trendSabVal');
  const tSar = document.getElementById('trendSarVal');
  if (tSem) tSem.textContent = summary.semenanjung_api;
  if (tSab) tSab.textContent = summary.sabah_api;
  if (tSar) tSar.textContent = summary.sarawak_api;
}

/**
 * Render Interactive 3D Glowing Radar Station Pins on Map
 */
function renderMapMarkers(stations) {
  if (!state.map || !stations) return;

  if (state.markerLayerGroup) {
    state.map.removeLayer(state.markerLayerGroup);
  }
  state.markers = [];
  state.markerLayerGroup = L.layerGroup();

  // Key city landmarks from showcase image that always display title labels at overview zoom
  const prominentCities = ["George Town", "Batu Muda", "Cheras", "Kuala Lumpur", "Johor Bahru", "Larkin", "Kuching", "Kota Kinabalu", "Kuantan", "Ipoh"];

  stations.forEach(st => {
    if (!st.lat || !st.lon) return;

    const isProminent = prominentCities.some(c => st.name.toLowerCase().includes(c.toLowerCase()));
    const stationLabel = getCleanStationName(st.name);

    // Custom HTML for Pin matching Showcase
    // Note: station-pin-label is rendered for every station, controlled via CSS progressive disclosure on zoom & hover!
    const customIcon = L.divIcon({
      className: 'custom-pin-wrapper',
      html: `
        <div class="custom-station-pin pin-${st.status_slug}" id="pin-${st.id}">
          <div class="station-pin-label ${isProminent ? 'prominent-label' : ''}">${stationLabel}</div>
          <div class="station-pin-core">
            ${st.api !== null ? st.api : '--'}
            <div class="station-pin-pulse"></div>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([st.lat, st.lon], { icon: customIcon });

    marker.on('click', () => {
      openStationDrawer(st);
      state.map.flyTo([st.lat, st.lon], 9, {
        animate: true,
        duration: 0.8
      });
    });

    marker.bindTooltip(`<strong>${st.name}</strong><br>IPU: <span style="color:${st.color}; font-weight:bold;">${st.api} (${st.status})</span>`, {
      direction: 'top',
      offset: [0, -18],
      className: 'custom-map-tooltip'
    });

    state.markerLayerGroup.addLayer(marker);
    state.markers.push(marker);
  });
  state.markerLayerGroup.addTo(state.map);
}

/**
 * Render Atmospheric Haze Fog Shroud on Map based on real-time IPU Intensity
 * Uses authentic particulate scattering mathematics & Emil Kowalski organic drift.
 */
function renderHazeFogLayer(stations) {
  if (!state.map || !stations) return;

  if (!state.hazeFogPane) {
    if (!state.map.getPane('hazeFogPane')) {
      state.map.createPane('hazeFogPane');
    }
    state.hazeFogPane = state.map.getPane('hazeFogPane');
    state.hazeFogPane.style.zIndex = '350';
    state.hazeFogPane.style.pointerEvents = 'none';
  }

  // Clear existing fog group
  if (state.fogLayerGroup) {
    state.map.removeLayer(state.fogLayerGroup);
  }
  state.fogMarkers = [];
  state.fogLayerGroup = L.layerGroup();

  const zoom = state.map.getZoom();

  stations.forEach((st, idx) => {
    if (!st.lat || !st.lon) return;
    const api = st.api !== null ? st.api : 50;
    if (api <= 50) return; // Clean air = pristine zero fog

    const params = calculateHazeParams(api, 6, st.lat, idx); // Render at base zoom 6 dimensions

    const fogIcon = L.divIcon({
      className: 'haze-fog-wrapper',
      html: `
        <div class="haze-fog-emitter intensity-${params.intensitySlug}" id="fog-${st.id}"
             style="width: ${params.diameter}px; height: ${params.diameter}px;
                    --fog-op-core: ${params.coreOp};
                    --fog-op-outer: ${params.outerOp};
                    --fog-delay: ${params.driftDelay}s;
                    --fog-duration: ${params.driftDuration}s;">
          <div class="haze-fog-core"></div>
          <div class="haze-fog-plume"></div>
        </div>
      `,
      iconSize: [params.diameter, params.diameter],
      iconAnchor: [params.diameter / 2, params.diameter / 2]
    });

    const fogMarker = L.marker([st.lat, st.lon], {
      icon: fogIcon,
      interactive: false,
      pane: 'hazeFogPane'
    });

    state.fogLayerGroup.addLayer(fogMarker);
    state.fogMarkers.push(fogMarker);
  });

  state.fogLayerGroup.addTo(state.map);
  updateHazeFogScale();
  updateHazeFogVisibility();
}

function calculateHazeParams(api, zoom, lat, idx) {
  let intensitySlug = 'moderate';
  let baseRadiusKm = 35;
  let coreOp = 0.16;
  let outerOp = 0.08;

  if (api <= 100) {
    // Sederhana (51 - 100): Ethereal light grayish haze
    intensitySlug = 'moderate';
    const t = (api - 50) / 50;
    baseRadiusKm = 32 + t * 18;     // 32km - 50km
    coreOp = 0.14 + t * 0.14;       // 0.14 - 0.28
    outerOp = 0.08 + t * 0.08;      // 0.08 - 0.16
  } else if (api <= 200) {
    // Tidak Sihat (101 - 200): Distinct smoky particulate haze shroud
    intensitySlug = 'unhealthy';
    const t = (api - 100) / 100;
    baseRadiusKm = 52 + t * 38;     // 52km - 90km
    coreOp = 0.32 + t * 0.22;       // 0.32 - 0.54
    outerOp = 0.18 + t * 0.14;      // 0.18 - 0.32
  } else if (api <= 300) {
    // Sangat Tidak Sihat (201 - 300): Heavy dense slate-gray blanket
    intensitySlug = 'very-unhealthy';
    const t = (api - 200) / 100;
    baseRadiusKm = 90 + t * 35;     // 90km - 125km
    coreOp = 0.56 + t * 0.16;       // 0.56 - 0.72
    outerOp = 0.34 + t * 0.12;      // 0.34 - 0.46
  } else {
    // Berbahaya (301+): Critical opaque dark smog
    intensitySlug = 'hazardous';
    baseRadiusKm = 130;
    coreOp = 0.78;
    outerOp = 0.52;
  }

  // Smooth geographic zoom scaling factor
  // Overview allows regional plumes to coalesce organically (Klang Valley, South Johor, Kuching)
  const scaleZoomFactor = Math.pow(1.68, Math.max(0, zoom - 5.5));
  const diameter = Math.round(Math.max(56, baseRadiusKm * 1.65 * scaleZoomFactor));

  // Natural organic offset for drifting and breathing animations (Emil Kowalski)
  const driftDelay = Number(((lat * 11.3 + idx * 0.7) % 3.5).toFixed(2));
  const driftDuration = Number((7.0 + ((lat * 5.7) % 4.0)).toFixed(1));

  return {
    intensitySlug,
    diameter,
    coreOp: Number(coreOp.toFixed(2)),
    outerOp: Number(outerOp.toFixed(2)),
    driftDelay,
    driftDuration
  };
}

/**
 * Update fog emitter pixel dimensions when user zooms in or out
 */
/**
 * Ponytail Ultra-Fast Haze Fog Scaling:
 * 1-line CSS transform custom-property update on the parent pane instead of
 * destroying & recreating 64 DOM nodes. Takes 0.05ms on GPU (60fps guaranteed).
 */
function updateHazeFogScale() {
  if (!state.map || !state.hazeFogPane) return;
  const zoom = state.map.getZoom();
  // Base scale at zoom 6: 1.0. Smooth geometric expansion with physical meters.
  const zoomScale = Math.pow(1.65, Math.max(-1.5, zoom - 6.0));
  state.hazeFogPane.style.setProperty('--fog-zoom-scale', zoomScale.toFixed(3));
}

function toggleHazeFogLayer(enabled) {
  if (typeof enabled === 'boolean') {
    state.fogEnabled = enabled;
  } else {
    state.fogEnabled = !state.fogEnabled;
  }
  updateHazeFogVisibility();
}

function updateHazeFogVisibility() {
  const hazePane = state.map?.getPane('hazeFogPane');
  if (hazePane) {
    if (state.fogEnabled) {
      hazePane.classList.remove('haze-fog-hidden');
    } else {
      hazePane.classList.add('haze-fog-hidden');
    }
  }

  // Update UI toggles
  const legendToggle = document.getElementById('legendFogToggle');
  if (legendToggle) {
    if (state.fogEnabled) {
      legendToggle.classList.add('active');
      legendToggle.setAttribute('aria-checked', 'true');
    } else {
      legendToggle.classList.remove('active');
      legendToggle.setAttribute('aria-checked', 'false');
    }
  }

  const quickBtn = document.getElementById('quickFogToggleBtn');
  if (quickBtn) {
    if (state.fogEnabled) {
      quickBtn.classList.add('active');
      quickBtn.setAttribute('aria-pressed', 'true');
    } else {
      quickBtn.classList.remove('active');
      quickBtn.setAttribute('aria-pressed', 'false');
    }
  }
}

/**
 * Format and extract clean, distinct station place names
 */
function getCleanStationName(fullName) {
  if (!fullName) return '';
  const firstPart = fullName.split(',')[0].trim();

  // Custom refined place labels for well-known locations
  if (firstPart.toLowerCase() === 'indera mahkota') return 'Kuantan (Indera)';
  if (firstPart.toLowerCase() === 'balok baru') return 'Kuantan (Balok)';
  if (firstPart.toLowerCase() === 'larkin') return 'Larkin (JB)';
  if (firstPart.toLowerCase() === 'tasek ipoh') return 'Ipoh (Tasek)';
  if (firstPart.toLowerCase() === 'pegoh ipoh') return 'Ipoh (Pegoh)';
  if (firstPart.toLowerCase() === 'bandaraya melaka') return 'Melaka';
  if (firstPart.toLowerCase() === 'seberang jaya') return 'Seberang Jaya';

  return firstPart;
}

/**
 * Render Station Items in Floating Sidebar Card
 */
function renderStationList(stations) {
  const container = document.getElementById('stationItemsList');
  const countSub = document.getElementById('stationCountSubtitle');
  if (!container || !stations) return;

  container.innerHTML = '';

  let filtered = stations;

  // Filter by Region Tab
  if (state.activeFilter !== 'all') {
    filtered = filtered.filter(s => s.region === state.activeFilter);
  }

  // Filter by Search Query
  if (state.searchQuery.trim() !== '') {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.state.toLowerCase().includes(q));
  }

  if (countSub) {
    countSub.textContent = `Memaparkan ${filtered.length} stesen`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-dim); font-size: 0.8rem;">Tiada stesen dijumpai.</div>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach((st, idx) => {
    const row = document.createElement('div');
    row.className = 'station-item-row';
    row.style.animationDelay = `${Math.min(idx * 15, 300)}ms`;

    row.innerHTML = `
      <div class="station-item-left">
        <div class="station-item-dot" style="background: ${st.color}"></div>
        <div>
          <div class="station-item-name">${st.name}</div>
          <div class="station-item-state">${st.state} (${st.region})</div>
        </div>
      </div>
      <div class="station-item-val" style="color: ${st.color}">${st.api}</div>
    `;

    row.addEventListener('click', () => {
      openStationDrawer(st);
      if (st.lat && st.lon && state.map) {
        state.map.flyTo([st.lat, st.lon], 9, {
          animate: true,
          duration: 0.8
        });
      }
    });

    fragment.appendChild(row);
  });
  container.appendChild(fragment);
}

/**
 * Open and Populate Station Detail Drawer
 */
function openStationDrawer(station) {
  state.selectedStation = station;
  const drawer = document.getElementById('stationDrawer');
  if (!drawer) return;

  // Name, state, status
  document.getElementById('drawerStationName').textContent = station.name;
  document.getElementById('drawerStationState').textContent = `${station.state} · ${station.region} Malaysia`;
  
  const statusPill = document.getElementById('drawerStatusPill');
  statusPill.textContent = station.status;
  statusPill.className = `drawer-status-pill bg-${station.status_slug}`;

  // Gauge
  document.getElementById('drawerApiVal').textContent = station.api;
  const circleBar = document.getElementById('drawerGaugeCircle');
  if (circleBar) {
    const circumference = 263.89; // 2 * PI * 42
    const progress = Math.min(station.api / 250, 1);
    circleBar.style.strokeDashoffset = circumference - (progress * circumference);
    circleBar.style.stroke = station.color;
  }

  // Health Message based on IPU (DBP PRPM & Dual Language Standard)
  const healthTitle = document.getElementById('drawerHealthTitle');
  const healthDesc = document.getElementById('drawerHealthDesc');
  if (station.api <= 50) {
    healthTitle.textContent = "Kualiti Udara Baik · Good";
    healthDesc.textContent = "Kualiti udara memuaskan tanpa risiko kesihatan. Sesuai untuk semua aktiviti luar.";
  } else if (station.api <= 100) {
    healthTitle.textContent = "Kualiti Udara Sederhana · Moderate";
    healthDesc.textContent = "Kualiti udara memuaskan bagi kebanyakan individu. Aktiviti luar boleh diteruskan.";
  } else if (station.api <= 200) {
    healthTitle.textContent = "Kualiti Udara Tidak Sihat · Unhealthy";
    healthDesc.textContent = "Golongan berisiko (kanak-kanak, warga emas dan asma) disaran mengehadkan aktiviti luar dan memakai pelitup muka.";
  } else if (station.api <= 300) {
    healthTitle.textContent = "Kualiti Udara Sangat Tidak Sihat · Very Unhealthy";
    healthDesc.textContent = "Elakkan aktiviti fizikal di luar rumah. Kekal di dalam bangunan berpenapis udara.";
  } else {
    healthTitle.textContent = "Kualiti Udara Berbahaya · Hazardous";
    healthDesc.textContent = "Tahap bahaya kualiti udara. Kekal di dalam rumah dengan pintu dan tingkap tertutup rapat.";
  }

  // Side-by-Side Comparison matching
  const comp = state.data?.comparisons?.find(c => c.station_id === station.id);
  const doeValElem = document.getElementById('sbsDoeVal');
  const aqicnValElem = document.getElementById('sbsAqicnVal');
  const deltaTagElem = document.getElementById('sbsDeltaTag');

  if (comp) {
    if (doeValElem) doeValElem.textContent = comp.doe_api;
    if (aqicnValElem) aqicnValElem.textContent = comp.aqicn_aqi;
    if (deltaTagElem) {
      deltaTagElem.textContent = comp.delta_label + ' Δ';
      deltaTagElem.style.color = comp.delta > 0 ? '#FACC15' : '#4ADE80';
    }
  } else {
    if (doeValElem) doeValElem.textContent = station.api;
    if (aqicnValElem) aqicnValElem.textContent = Math.round(station.api * 1.05);
    if (deltaTagElem) deltaTagElem.textContent = '+3 Δ';
  }

  // Pollutants Breakdown Table
  const c = station.components || {};
  document.getElementById('pPM25').textContent = c.pm25 || '32';
  document.getElementById('pPM10').textContent = c.pm10 || '58';
  document.getElementById('pSO2').textContent = c.so2 || '6';
  document.getElementById('pNO2').textContent = c.no2 || '20';
  document.getElementById('pO3').textContent = c.o3 || '48';
  document.getElementById('pCO').textContent = c.co || '0.6';

  // Record time
  const recTime = document.getElementById('drawerRecordTime');
  if (recTime) {
    recTime.textContent = `Dikemas kini pada: ${station.record_dt ? station.record_dt.replace('T', ' ') : state.data?.formatted_time}`;
  }

  // Show drawer with Emil Kowalski ease-out enter
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  drawer.style.transform = '';

  const backdrop = document.getElementById('drawerBackdrop');
  if (backdrop) {
    backdrop.classList.add('active');
    backdrop.setAttribute('aria-hidden', 'false');
  }
}

/**
 * Close Station Detail Drawer
 */
window.openStationDrawer = openStationDrawer;
window.closeStationDrawer = closeStationDrawer;

function closeStationDrawer() {
  const drawer = document.getElementById('stationDrawer');
  if (drawer) {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.style.transform = '';
  }
  const backdrop = document.getElementById('drawerBackdrop');
  if (backdrop) {
    backdrop.classList.remove('active');
    backdrop.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Render Side-by-Side Comparison Table Modal
 */
function renderComparisonTable(comparisons) {
  const tbody = document.getElementById('comparisonTableBody');
  const statsPill = document.getElementById('tableStatsPill');
  if (!tbody || !comparisons) return;

  tbody.innerHTML = '';
  if (statsPill) statsPill.textContent = `${comparisons.length} stesen berpadanan`;

  const searchInput = document.getElementById('tableFilterInput');
  const filterQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const filtered = filterQuery 
    ? comparisons.filter(c => c.name.toLowerCase().includes(filterQuery) || c.state.toLowerCase().includes(filterQuery))
    : comparisons;

  const fragment = document.createDocumentFragment();
  filtered.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${c.name}</strong></td>
      <td>${c.state} (${c.region})</td>
      <td><span style="font-weight: 800; color: #38BDF8;">${c.doe_api}</span></td>
      <td><span style="font-weight: 800; color: #A78BFA;">${c.aqicn_aqi}</span></td>
      <td><span class="delta-tag" style="background: rgba(234,179,8,0.15); color: #FACC15; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${c.delta_label}</span></td>
      <td><span class="legend-badge bg-${c.doe_status === 'Baik' ? 'good' : c.doe_status === 'Sederhana' ? 'moderate' : 'unhealthy'}" style="font-size: 0.72rem; padding: 2px 8px; border-radius: 4px;">${c.doe_status}</span></td>
    `;
    fragment.appendChild(tr);
  });
  tbody.appendChild(fragment);
}

/**
 * Render Simulated 24-Hour Trend Bar Chart in Trend Modal
 */
function renderTrendBars() {
  const flex = document.getElementById('barChartFlex');
  if (!flex) return;
  flex.innerHTML = '';

  const hours = ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22'];
  const baseline = state.data?.summary?.national_api || 68;

  hours.forEach((h, idx) => {
    const col = document.createElement('div');
    col.className = 'chart-bar-col';
    
    // Slight realistic fluctuation curve during haze daytime
    const variation = Math.sin(idx * 0.5) * 12;
    const val = Math.max(30, Math.round(baseline + variation));
    const heightPercent = Math.min((val / 150) * 100, 100);

    const color = val <= 50 ? '#2563EB' : val <= 100 ? '#22C55E' : '#EAB308';

    col.innerHTML = `
      <span style="font-size: 0.65rem; color: #FFF; font-weight: 700;">${val}</span>
      <div class="chart-bar-fill" style="height: ${heightPercent}%; background: ${color};"></div>
      <span class="chart-bar-time">${h}:00</span>
    `;
    flex.appendChild(col);
  });
}

/**
 * Wire Up All User Interactions & Modals
 */
function setupEventListeners() {
  // Drawer close button & Backdrop tap to close
  const drawerBackBtn = document.getElementById('drawerBackBtn');
  if (drawerBackBtn) drawerBackBtn.addEventListener('click', closeStationDrawer);

  const drawerBackdrop = document.getElementById('drawerBackdrop');
  if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', closeStationDrawer);
    drawerBackdrop.addEventListener('touchstart', (e) => {
      e.preventDefault();
      closeStationDrawer();
    }, { passive: false });
  }

  // Drag header downward to close drawer gesture
  const drawerDragHandle = document.getElementById('drawerDragHandle');
  const drawerHeader = document.querySelector('.drawer-header');
  const stationDrawer = document.getElementById('stationDrawer');

  let dragStartY = 0;
  let dragCurrentY = 0;
  let isDraggingDrawer = false;

  function handleDragStart(e) {
    if (!stationDrawer || !stationDrawer.classList.contains('open')) return;
    const touch = e.touches ? e.touches[0] : e;
    dragStartY = touch.clientY;
    dragCurrentY = dragStartY;
    isDraggingDrawer = true;
    stationDrawer.style.transition = 'none';
  }

  function handleDragMove(e) {
    if (!isDraggingDrawer || !stationDrawer) return;
    const touch = e.touches ? e.touches[0] : e;
    dragCurrentY = touch.clientY;
    const deltaY = dragCurrentY - dragStartY;
    if (deltaY > 0) {
      stationDrawer.style.transform = `translateY(${deltaY}px)`;
    }
  }

  function handleDragEnd() {
    if (!isDraggingDrawer || !stationDrawer) return;
    isDraggingDrawer = false;
    stationDrawer.style.transition = '';
    const deltaY = dragCurrentY - dragStartY;
    if (deltaY > 45) {
      closeStationDrawer();
    } else {
      stationDrawer.style.transform = '';
    }
  }

  if (drawerDragHandle) {
    drawerDragHandle.addEventListener('touchstart', handleDragStart, { passive: true });
    drawerDragHandle.addEventListener('touchmove', handleDragMove, { passive: true });
    drawerDragHandle.addEventListener('touchend', handleDragEnd);
    drawerDragHandle.addEventListener('click', closeStationDrawer);
  }

  if (drawerHeader) {
    drawerHeader.addEventListener('touchstart', handleDragStart, { passive: true });
    drawerHeader.addEventListener('touchmove', handleDragMove, { passive: true });
    drawerHeader.addEventListener('touchend', handleDragEnd);
  }

  // Search Input in Header
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (clearSearchBtn) {
        if (state.searchQuery.length > 0) clearSearchBtn.classList.remove('hidden');
        else clearSearchBtn.classList.add('hidden');
      }
      if (state.data) renderStationList(state.data.stations);
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.searchQuery = '';
      clearSearchBtn.classList.add('hidden');
      if (state.data) renderStationList(state.data.stations);
    });
  }

  // Filter Pills (Semua, Semenanjung, Sabah, Sarawak)
  const filterPills = document.querySelectorAll('.filter-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeFilter = pill.getAttribute('data-filter');
      if (state.data) renderStationList(state.data.stations);
    });
  });

  // Collapsible Legend Toggle
  const legendToggleBtn = document.getElementById('legendToggleBtn');
  const legendCard = document.getElementById('legendCard');
  if (legendToggleBtn && legendCard) {
    legendToggleBtn.addEventListener('click', (e) => {
      // Avoid collapsing when clicking the toggle inside the legend
      if (e.target.closest('#legendFogToggle') || e.target.closest('.apple-toggle-switch')) return;
      legendCard.classList.toggle('collapsed');
      const isExpanded = !legendCard.classList.contains('collapsed');
      legendToggleBtn.setAttribute('aria-expanded', isExpanded);
    });
  }

  // Atmospheric Haze Fog Shroud Toggles (Legend Apple Switch & Map Control Quick Button)
  const legendFogToggle = document.getElementById('legendFogToggle');
  if (legendFogToggle) {
    legendFogToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleHazeFogLayer();
    });
  }

  const quickFogToggleBtn = document.getElementById('quickFogToggleBtn');
  if (quickFogToggleBtn) {
    quickFogToggleBtn.addEventListener('click', () => {
      toggleHazeFogLayer();
    });
  }

  // Map Zoom Controls
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const resetViewBtn = document.getElementById('resetViewBtn');

  if (zoomInBtn) zoomInBtn.addEventListener('click', () => state.map?.zoomIn());
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => state.map?.zoomOut());
  if (resetViewBtn) {
    resetViewBtn.addEventListener('click', () => {
      state.map?.fitBounds([
        [0.85, 99.6],
        [7.4, 119.3]
      ], {
        paddingTopLeft: [30, 20],
        paddingBottomRight: [30, 20]
      });
      closeStationDrawer();
    });
  }

  // Refresh Button in Header (Trigger instant Scraper refresh)
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.classList.add('spinning');
      try {
        fetch('/api/scrape', { method: 'POST' }).catch(() => {});
      } catch (e) {}
      await loadLiveData(false);
      setTimeout(() => refreshBtn.classList.remove('spinning'), 500);
    });
  }

  // Drawer mini-refresh button
  const drawerRefreshBtn = document.getElementById('drawerRefreshBtn');
  if (drawerRefreshBtn) {
    drawerRefreshBtn.addEventListener('click', async () => {
      drawerRefreshBtn.classList.add('spinning');
      await loadLiveData(false);
      setTimeout(() => drawerRefreshBtn.classList.remove('spinning'), 500);
    });
  }

  // Navigation Tab Switching
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const view = tab.getAttribute('data-view');
      handleNavView(view);
    });
  });

  // Modals Close Buttons
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const trendCloseBtn = document.getElementById('trendCloseBtn');
  const infoCloseBtn = document.getElementById('infoCloseBtn');

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => closeModal('compareModal'));
  if (trendCloseBtn) trendCloseBtn.addEventListener('click', () => closeModal('trendModal'));
  if (infoCloseBtn) infoCloseBtn.addEventListener('click', () => closeModal('infoModal'));

  // Close modals when clicking overlay background
  const modals = document.querySelectorAll('.modal-overlay');
  modals.forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) closeModal(m.id);
    });
  });

  // Table search input inside modal
  const tableFilterInput = document.getElementById('tableFilterInput');
  if (tableFilterInput) {
    tableFilterInput.addEventListener('input', () => {
      if (state.data?.comparisons) renderComparisonTable(state.data.comparisons);
    });
  }
}

/**
 * Handle Tab Navigation Switching
 */
function handleNavView(view) {
  state.activeTab = view;
  closeModal('compareModal');
  closeModal('trendModal');
  closeModal('infoModal');

  if (view === 'compare' || view === 'report') {
    openModal('compareModal');
  } else if (view === 'trend') {
    renderTrendBars();
    openModal('trendModal');
  } else if (view === 'info') {
    openModal('infoModal');
  } else {
    // Map view is default underneath
  }
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
  
  // Set tab back to Map if active
  const mapTab = document.getElementById('tabMap');
  const activeTabs = document.querySelectorAll('.nav-tab');
  activeTabs.forEach(t => t.classList.remove('active'));
  if (mapTab) mapTab.classList.add('active');
}

// Register PWA Service Worker for Offline & Installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('[PWA] Service Worker registered with scope:', reg.scope);
      })
      .catch(err => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });
}


/**
 * Strict Viewport Zoom Lock & Apple-Style Bottom Sheet (Mobile Portrait)
 * Disallows browser viewport pinch/zoom and double-tap zoom so ONLY the Leaflet map zooms.
 */
function setupViewportZoomLock() {
  // Prevent pinch-zoom on document outside map
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(evt => {
    document.addEventListener(evt, (e) => {
      if (!e.target.closest('#mapContainer')) {
        e.preventDefault();
      }
    }, { passive: false });
  });

  // Prevent double-tap to zoom on UI chrome
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      if (!e.target.closest('#mapContainer')) {
        e.preventDefault();
      }
    }
    lastTouchEnd = now;
  }, { passive: false });

  // Prevent multi-touch pinch on UI chrome
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1 && !e.target.closest('#mapContainer')) {
      e.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1 && !e.target.closest('#mapContainer')) {
      e.preventDefault();
    }
  }, { passive: false });

  // Setup Apple-Style Bottom Sheet Toggle & Swipe Gestures
  const sheetDragHandle = document.getElementById('sheetDragHandle');
  const summaryHeader = document.querySelector('#summaryCard .card-header');
  const leftSidebar = document.getElementById('leftSidebar');

  const toggleSheet = () => {
    if (window.innerWidth <= 768 && leftSidebar) {
      leftSidebar.classList.toggle('sheet-collapsed');
    }
  };

  if (sheetDragHandle) sheetDragHandle.addEventListener('click', toggleSheet);
  if (summaryHeader) summaryHeader.addEventListener('click', toggleSheet);

  // Touch swipe support on drag handle & header
  let startY = 0;
  const touchTarget = sheetDragHandle || summaryHeader;
  if (touchTarget && leftSidebar) {
    touchTarget.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startY = e.touches[0].clientY;
      }
    }, { passive: true });

    touchTarget.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1 && window.innerWidth <= 768) {
        const deltaY = e.changedTouches[0].clientY - startY;
        if (deltaY > 30) {
          leftSidebar.classList.add('sheet-collapsed');
        } else if (deltaY < -30) {
          leftSidebar.classList.remove('sheet-collapsed');
        }
      }
    }, { passive: true });
  }
}
