window.WeatherHUD = window.WeatherHUD || {};

// Expose standard lifecycle API on window
window.WeatherHUD.init = function(options) {
  try {
    options = options || {};
    var state = window.WeatherHUD._state;
    state.containerSelector = options.container || '#hud-container';
    
    var defaultSettings = {
      displayType: 'standard',
      cities: [
        { name: 'Copenhagen', lat: 55.6761, lon: 12.5683 },
        { name: 'Tokyo', lat: 35.6895, lon: 139.6917 },
        { name: 'New York', lat: 40.7128, lon: -74.0060 }
      ],
      sector: 5,
      glassOpacity: 0.8,
      scale: 1.0
    };
    
    state.settings = Object.assign({}, defaultSettings, options.settings || {});
    state.weatherData = [];
    console.log("Weather HUD: Initialized");
  } catch (err) {
    console.error("Weather HUD Init Error:", err);
  }
};

window.WeatherHUD.mount = function() {
  try {
    var state = window.WeatherHUD._state;
    var containerSelector = state.containerSelector || '#hud-container';
    var container = document.querySelector(containerSelector) || document.body;
    
    if (!container) {
      throw new Error("Target container not found: " + containerSelector);
    }

    // Clean up any existing overlay to prevent duplicates
    var existingOverlay = container.querySelector('#sh-weather-hud');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // Set container to absolute positioning wrapper safely
    if (container !== document.body) {
      Object.assign(container.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        minWidth: '100vw',
        minHeight: '100vh',
        zIndex: '500',
        pointerEvents: 'none',
        boxSizing: 'border-box'
      });
    }

    // Inject global CSS themes style tag
    var styleTag = document.getElementById('sh-weather-theme-styles');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'sh-weather-theme-styles';
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = `
      /* 1. Standard Dark Glass Mode */
      .weather-panel.theme-standard {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }

      /* 2. Aviation ICAO/METAR Mode */
      .weather-panel.theme-aviation {
        font-family: 'SF Mono', Consolas, Monaco, monospace !important;
        border: 1px solid rgba(0, 229, 229, 0.35) !important;
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6) !important;
      }
      .weather-panel.theme-aviation .panel-header {
        background: rgba(0, 229, 229, 0.1) !important;
        border-color: rgba(0, 229, 229, 0.35) !important;
        color: #00e5e5 !important;
        font-family: monospace !important;
        letter-spacing: 0.3em !important;
      }

      /* 3. Ambient Glow Mode */
      .weather-panel.theme-ambient {
        font-family: system-ui, -apple-system, sans-serif !important;
        border-radius: 24px !important;
      }

      /* 4. Severe Weather Alert Mode */
      @keyframes alert-border-pulse {
        0% { border-color: rgba(255, 59, 48, 0.3) !important; box-shadow: 0 0 10px rgba(255, 59, 48, 0.1), 0 20px 50px rgba(0,0,0,0.5) !important; }
        50% { border-color: rgba(255, 59, 48, 0.85) !important; box-shadow: 0 0 20px rgba(255, 59, 48, 0.35), 0 20px 50px rgba(0,0,0,0.5) !important; }
        100% { border-color: rgba(255, 59, 48, 0.3) !important; box-shadow: 0 0 10px rgba(255, 59, 48, 0.1), 0 20px 50px rgba(0,0,0,0.5) !important; }
      }
      .weather-panel.theme-alert {
        animation: alert-border-pulse 2s infinite ease-in-out !important;
        background: rgba(18, 12, 12, 0.9) !important;
        border: 1px solid rgba(255, 59, 48, 0.45) !important;
      }
      .weather-panel.theme-alert .panel-header {
        background: rgba(255, 59, 48, 0.12) !important;
        border-color: rgba(255, 59, 48, 0.4) !important;
        color: #ff3b30 !important;
      }
      .weather-panel.theme-alert .weather-item {
        background: rgba(26, 16, 16, 0.95) !important;
        border: 1px solid rgba(255, 59, 48, 0.15) !important;
      }
      .weather-panel.theme-alert .weather-temp {
        color: #ff3b30 !important;
      }

      /* 5. Executive Boardroom Mode */
      .weather-panel.theme-boardroom {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 4px !important;
        background: rgba(20, 22, 26, 0.96) !important;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4) !important;
      }
      .weather-panel.theme-boardroom .panel-header {
        background: transparent !important;
        border: none !important;
        color: #a0a0a5 !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 0 !important;
        padding-bottom: 12px !important;
        width: 100% !important;
        letter-spacing: 0.1em !important;
      }
      .weather-panel.theme-boardroom .weather-item {
        background: rgba(28, 30, 36, 0.85) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        border-radius: 2px !important;
      }

      /* 6. Luxury Hotel Mode */
      @keyframes hotel-glow {
        0%, 100% { text-shadow: 0 0 4px rgba(212, 175, 55, 0.2); }
        50% { text-shadow: 0 0 10px rgba(212, 175, 55, 0.55); }
      }
      .weather-panel.theme-hotel {
        font-family: Georgia, serif !important;
        background: rgba(24, 20, 16, 0.92) !important;
        border: 1px solid rgba(212, 175, 55, 0.3) !important;
        border-radius: 16px !important;
        box-shadow: 0 20px 50px rgba(212, 175, 55, 0.15) !important;
      }
      .weather-panel.theme-hotel .panel-header {
        background: rgba(212, 175, 55, 0.08) !important;
        border-color: rgba(212, 175, 55, 0.25) !important;
        color: #d4af37 !important;
        font-style: italic !important;
        animation: hotel-glow 4s infinite ease-in-out !important;
      }
      .weather-panel.theme-hotel .weather-item {
        background: rgba(36, 30, 24, 0.85) !important;
        border: 1px solid rgba(212, 175, 55, 0.15) !important;
        border-radius: 8px !important;
      }
      .weather-panel.theme-hotel .weather-temp {
        color: #e5c158 !important;
        animation: hotel-glow 4s infinite ease-in-out !important;
      }

      /* 7. Metro Transit Mode */
      .weather-panel.theme-metro {
        font-family: 'Arial Black', Impact, sans-serif !important;
        background: rgba(10, 10, 10, 0.98) !important;
        border: none !important;
        border-top: 6px solid #ffcc00 !important;
        border-radius: 2px !important;
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.7) !important;
      }
      .weather-panel.theme-metro .panel-header {
        background: #111 !important;
        color: #ffcc00 !important;
        border: 1px solid #ffcc00 !important;
        border-radius: 0px !important;
        font-size: 13px !important;
        letter-spacing: 0.05em !important;
        width: 100% !important;
      }
      .weather-panel.theme-metro .weather-item {
        background: #151515 !important;
        border-radius: 0px !important;
        min-width: 180px !important;
      }

      /* 8. Retro CRT Mode */
      @keyframes crt-flicker {
        0% { opacity: 0.975; }
        50% { opacity: 1; }
        100% { opacity: 0.985; }
      }
      .weather-panel.theme-crt {
        font-family: 'Courier New', Courier, monospace !important;
        background: rgba(5, 15, 5, 0.94) !important;
        border: 2px solid #33ff33 !important;
        border-radius: 12px !important;
        box-shadow: 0 0 20px rgba(51, 255, 51, 0.2), inset 0 0 10px rgba(51, 255, 51, 0.15) !important;
        animation: crt-flicker 0.15s infinite !important;
        color: #33ff33 !important;
        position: relative !important;
        overflow: hidden !important;
      }
      .weather-panel.theme-crt::before {
        content: " " !important;
        display: block !important;
        position: absolute !important;
        top: 0; left: 0; bottom: 0; right: 0 !important;
        background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.3) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.04), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.04)) !important;
        background-size: 100% 4px, 6px 100% !important;
        z-index: 200 !important;
        pointer-events: none !important;
      }
      .weather-panel.theme-crt .panel-header {
        background: rgba(51, 255, 51, 0.1) !important;
        border-color: #33ff33 !important;
        color: #33ff33 !important;
        font-size: 13px !important;
      }
      .weather-panel.theme-crt .weather-item {
        background: rgba(0, 10, 0, 0.85) !important;
        border: 1px solid rgba(51, 255, 51, 0.3) !important;
        border-radius: 4px !important;
      }

      /* 9. Observatory Mode */
      .weather-panel.theme-observatory {
        font-family: 'Georgia', serif !important;
        background: rgba(10, 10, 22, 0.95) !important;
        border: 1px solid rgba(138, 180, 248, 0.35) !important;
        border-radius: 30px !important;
        box-shadow: 0 0 30px rgba(138, 180, 248, 0.15) !important;
      }
      .weather-panel.theme-observatory .panel-header {
        background: rgba(138, 180, 248, 0.1) !important;
        border-color: rgba(138, 180, 248, 0.3) !important;
        color: #8ab4f8 !important;
        letter-spacing: 0.25em !important;
      }

      /* 10. Maritime Chronometer Mode */
      .weather-panel.theme-maritime {
        font-family: 'Consolas', 'Courier New', monospace !important;
        background: rgba(6, 12, 22, 0.98) !important;
        border: 2px solid #00ff66 !important;
        border-radius: 8px !important;
        box-shadow: 0 0 25px rgba(0, 255, 102, 0.12) !important;
      }
      .weather-panel.theme-maritime .panel-header {
        background: rgba(0, 255, 102, 0.1) !important;
        border-color: #00ff66 !important;
        color: #00ff66 !important;
      }

      /* 11. Noir Cinema Mode */
      .weather-panel.theme-noir {
        font-family: 'Times New Roman', Times, serif !important;
        background: rgba(18, 18, 18, 0.98) !important;
        border: 1px solid #ffffff !important;
        border-radius: 0px !important;
        box-shadow: 0 30px 60px rgba(0, 0, 0, 0.85) !important;
      }
      .weather-panel.theme-noir .panel-header {
        background: transparent !important;
        border: none !important;
        border-bottom: 2px solid #ffffff !important;
        border-radius: 0 !important;
        color: #ffffff !important;
        font-weight: 700 !important;
        letter-spacing: 0.15em !important;
        padding-bottom: 10px !important;
        width: 100% !important;
      }
      .weather-panel.theme-noir .weather-item {
        background: #1a1a1a !important;
        border: 1px solid #333333 !important;
        border-radius: 0px !important;
      }

      /* 12. Minimal Zen Mode */
      .weather-panel.theme-zen {
        font-family: system-ui, -apple-system, sans-serif !important;
        background: transparent !important;
        border: 1px solid rgba(255, 255, 255, 0.22) !important;
        border-radius: 0px !important;
        box-shadow: none !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      .weather-panel.theme-zen .panel-header {
        background: transparent !important;
        border: none !important;
        color: rgba(255, 255, 255, 0.7) !important;
        font-weight: 200 !important;
      }

      /* 13. AI Core Mode */
      .weather-panel.theme-aicore {
        font-family: system-ui, -apple-system, sans-serif !important;
        background: rgba(8, 12, 20, 0.94) !important;
        border: 1px solid #00f0ff !important;
        border-radius: 8px !important;
        box-shadow: 0 0 25px rgba(0, 240, 255, 0.15) !important;
        position: relative !important;
      }
      .weather-panel.theme-aicore::after {
        content: "SYS_STATUS: NOMINAL" !important;
        position: absolute !important;
        bottom: 8px !important;
        right: 12px !important;
        font-size: 8px !important;
        font-family: monospace !important;
        color: rgba(0, 240, 255, 0.6) !important;
        letter-spacing: 0.1em !important;
      }
      .weather-panel.theme-aicore .panel-header {
        background: rgba(0, 240, 255, 0.08) !important;
        border-color: rgba(0, 240, 255, 0.3) !important;
        color: #00f0ff !important;
        letter-spacing: 0.15em !important;
      }
      .weather-panel.theme-aicore .weather-item {
        background: rgba(12, 18, 30, 0.9) !important;
        border: 1px solid rgba(0, 240, 255, 0.2) !important;
        border-radius: 4px !important;
      }
    `;

    // Create full-screen overlay wrapper
    var overlay = document.createElement('div');
    overlay.id = 'sh-weather-hud';
    overlay.style.cssText = "position: absolute !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; display: grid !important; grid-template-columns: repeat(3, 1fr) !important; grid-template-rows: repeat(3, 1fr) !important; pointer-events: none !important; z-index: 9999 !important; padding: 24px !important; box-sizing: border-box !important;";
    
    // Create weather panel card
    var panel = document.createElement('div');
    panel.className = 'weather-panel';
    
    // Premium dark-glassmorphic style
    Object.assign(panel.style, {
      pointerEvents: 'auto',
      backdropFilter: 'blur(20px) saturate(120%)',
      WebkitBackdropFilter: 'blur(20px) saturate(120%)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '24px',
      padding: '24px 36px',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
      width: '740px',
      minHeight: '240px',
      boxSizing: 'border-box',
      transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
    });

    // Defensive visibility styling to prevent grid collapse
    panel.style.setProperty('display', 'flex', 'important');
    panel.style.setProperty('visibility', 'visible', 'important');
    panel.style.setProperty('opacity', '1', 'important');
    panel.style.setProperty('max-width', '100%', 'important');
    panel.style.setProperty('z-index', '9999', 'important');
    panel.style.flexDirection = 'column';
    panel.style.alignItems = 'center';

    panel.innerHTML = `
      <div class="panel-header" style="
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: #ffffff;
        background: rgba(255, 255, 255, 0.12);
        padding: 6px 16px;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
        text-align: center;
        margin-bottom: 20px;
        box-sizing: border-box;
      ">
        METEOROLOGICAL REPORT
      </div>
      <div class="weather-list" style="
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 20px;
        width: 100%;
        box-sizing: border-box;
      ">
        <!-- Rendered Weather Cards -->
      </div>
    `;

    overlay.appendChild(panel);
    container.appendChild(overlay);
    state.overlayElement = overlay;

    // Apply positioning & glass styles
    window.WeatherHUD._updatePositionAndGlass();
    
    // Draw initial skeleton loaders
    window.WeatherHUD._updateDOM();
    
    // Fetch data asynchronously and draw
    window.WeatherHUD._fetchWeatherData();

    // Start background fetch ticker (5 minutes interval)
    window.WeatherHUD._startFetchTicker();

  } catch (err) {
    console.error("Weather HUD Mount Error:", err);
    var errDiv = document.createElement('div');
    errDiv.style.cssText = "position:absolute; top:20px; left:20px; background:red; color:white; z-index:99999; padding:20px; font-family:monospace;";
    errDiv.innerText = "Weather HUD Mount Crash: " + err.message;
    document.body.appendChild(errDiv);
  }
};

window.WeatherHUD.update = function(newSettings) {
  try {
    var state = window.WeatherHUD._state;
    if (!state.settings) return;
    
    var requiresRefetch = newSettings && newSettings.cities !== undefined;

    state.settings = Object.assign({}, state.settings, newSettings || {});
    
    if (requiresRefetch) {
      state.weatherData = [];
      window.WeatherHUD._fetchWeatherData();
    }

    window.WeatherHUD._updatePositionAndGlass();
    window.WeatherHUD._updateDOM();
  } catch (err) {
    console.error("Weather HUD Update Error:", err);
  }
};

window.WeatherHUD.unmount = function() {
  window.WeatherHUD._stopFetchTicker();
  var state = window.WeatherHUD._state;
  if (state.overlayElement) {
    state.overlayElement.remove();
    state.overlayElement = null;
  }
  console.log("Weather HUD: Unmounted");
};

window.WeatherHUD.destroy = function() {
  window.WeatherHUD.unmount();
  var state = window.WeatherHUD._state;
  state.containerSelector = null;
  state.settings = null;
  state.weatherData = [];
  console.log("Weather HUD: Destroyed");
};

// Internal State
window.WeatherHUD._state = {
  containerSelector: null,
  settings: null,
  weatherData: [],
  overlayElement: null,
  fetchIntervalId: null
};

// 3x3 Grid Positioning Matrix
window.WeatherHUD._sectorStyles = {
  1: { gridRow: '1', gridColumn: '1', justifySelf: 'start', alignSelf: 'start' },
  2: { gridRow: '1', gridColumn: '2', justifySelf: 'center', alignSelf: 'start' },
  3: { gridRow: '1', gridColumn: '3', justifySelf: 'end', alignSelf: 'start' },
  4: { gridRow: '2', gridColumn: '1', justifySelf: 'start', alignSelf: 'center' },
  5: { gridRow: '2', gridColumn: '2', justifySelf: 'center', alignSelf: 'center' },
  6: { gridRow: '2', gridColumn: '3', justifySelf: 'end', alignSelf: 'center' },
  7: { gridRow: '3', gridColumn: '1', justifySelf: 'start', alignSelf: 'end' },
  8: { gridRow: '3', gridColumn: '2', justifySelf: 'center', alignSelf: 'end' },
  9: { gridRow: '3', gridColumn: '3', justifySelf: 'end', alignSelf: 'end' }
};

// Open-Meteo Weather Code Mappings
window.WeatherHUD._resolveCondition = function(code) {
  if (code === 0) return { label: 'Clear', state: 'clear' };
  if (code >= 1 && code <= 3) return { label: 'Cloudy', state: 'cloudy' };
  if (code === 45 || code === 48) return { label: 'Fog', state: 'fog' };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { label: 'Rain', state: 'rain' };
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return { label: 'Snow', state: 'snow' };
  if (code >= 95 && code <= 99) return { label: 'Storm', state: 'storm' };
  return { label: 'Cloudy', state: 'cloudy' }; // Fallback
};

// Pure local mathematical moon phase calculator
window.WeatherHUD._getMoonPhase = function(localTimeStr) {
  if (!localTimeStr) return { label: 'New Moon', phase: 0 };
  try {
    var parts = localTimeStr.split('T');
    var dateParts = parts[0].split('-');
    var timeParts = parts[1].split(':');
    var year = parseInt(dateParts[0], 10);
    var month = parseInt(dateParts[1], 10);
    var day = parseInt(dateParts[2], 10);
    var hour = parseInt(timeParts[0], 10);
    var minute = parseInt(timeParts[1], 10);
    
    // Elapsed milliseconds since New Moon Epoch: Jan 6, 2000 18:14 UTC
    var dateMs = Date.UTC(year, month - 1, day, hour, minute);
    var epochMs = Date.UTC(2000, 0, 6, 18, 14, 0);
    var diffMs = dateMs - epochMs;
    var diffDays = diffMs / (1000 * 60 * 60 * 24);
    var phase = (diffDays / 29.530588853) % 1;
    if (phase < 0) phase += 1;
    
    var label = 'New Moon';
    if (phase < 0.03 || phase >= 0.97) label = 'New Moon';
    else if (phase < 0.22) label = 'Waxing Crescent';
    else if (phase < 0.28) label = 'First Quarter';
    else if (phase < 0.47) label = 'Waxing Gibbous';
    else if (phase < 0.53) label = 'Full Moon';
    else if (phase < 0.72) label = 'Waning Gibbous';
    else if (phase < 0.78) label = 'Last Quarter';
    else label = 'Waning Crescent';
    
    return { label: label, phase: phase };
  } catch (err) {
    return { label: 'New Moon', phase: 0 };
  }
};

// Inline SVGs for Moon Phases
window.WeatherHUD._getMoonPhaseIcon = function(label, strokeColor) {
  var fill = strokeColor || '#ffffff';
  var stroke = strokeColor || '#ffffff';
  
  if (label === 'New Moon') {
    return `<svg viewBox="0 0 24 24" width="36" height="36" stroke="${stroke}" stroke-width="2" fill="none" opacity="0.35" stroke-dasharray="2 2">
      <circle cx="12" cy="12" r="9"/>
    </svg>`;
  }
  if (label === 'Waxing Crescent') {
    return `<svg viewBox="0 0 24 24" width="36" height="36" fill="${fill}">
      <path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9 9 9 0 0 0 4-9 9 9 0 0 0-4-9z"/>
    </svg>`;
  }
  if (label === 'First Quarter') {
    return `<svg viewBox="0 0 24 24" width="36" height="36" fill="${fill}">
      <path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9z"/>
      <circle cx="12" cy="12" r="9" stroke="${stroke}" stroke-width="2" fill="none"/>
    </svg>`;
  }
  if (label === 'Waxing Gibbous') {
    return `<svg viewBox="0 0 24 24" width="36" height="36" fill="${fill}">
      <path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9 9 9 0 0 1-4-9 9 9 0 0 1 4-9z"/>
    </svg>`;
  }
  if (label === 'Full Moon') {
    return `<svg viewBox="0 0 24 24" width="36" height="36" fill="${fill}">
      <circle cx="12" cy="12" r="9"/>
    </svg>`;
  }
  if (label === 'Waning Gibbous') {
    return `<svg viewBox="0 0 24 24" width="36" height="36" fill="${fill}">
      <path d="M12 3a9 9 0 0 0-9 9 9 9 0 0 0 9 9 9 9 0 0 0 4-9 9 9 0 0 0-4-9z"/>
    </svg>`;
  }
  if (label === 'Last Quarter') {
    return `<svg viewBox="0 0 24 24" width="36" height="36" fill="${fill}">
      <path d="M12 3a9 9 0 0 0-9 9 9 9 0 0 0 9 9z"/>
      <circle cx="12" cy="12" r="9" stroke="${stroke}" stroke-width="2" fill="none"/>
    </svg>`;
  }
  if (label === 'Waning Crescent') {
    return `<svg viewBox="0 0 24 24" width="36" height="36" fill="${fill}">
      <path d="M12 3a9 9 0 0 0-9 9 9 9 0 0 0 9 9 9 9 0 0 1-4-9 9 9 0 0 1 4-9z"/>
    </svg>`;
  }
  return '';
};

// Weather SVGs
window.WeatherHUD._getWeatherIcon = function(state, isDay, moonPhase) {
  var stroke = '#ffffff';
  
  var activeTheme = window.WeatherHUD._state.settings ? window.WeatherHUD._state.settings.displayType : 'standard';
  if (activeTheme === 'crt') stroke = '#33ff33';
  if (activeTheme === 'aviation') stroke = '#00e5e5';
  if (activeTheme === 'aicore') stroke = '#00f0ff';
  
  if (state === 'clear') {
    if (isDay) {
      return `<svg viewBox="0 0 24 24" width="36" height="36" stroke="${stroke}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>`;
    } else {
      return window.WeatherHUD._getMoonPhaseIcon(moonPhase, stroke);
    }
  }
  if (state === 'cloudy') {
    return `<svg viewBox="0 0 24 24" width="36" height="36" stroke="${stroke}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
    </svg>`;
  }
  if (state === 'fog') {
    return `<svg viewBox="0 0 24 24" width="36" height="36" stroke="${stroke}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <line x1="5" y1="10" x2="19" y2="10"></line>
      <line x1="3" y1="14" x2="21" y2="14"></line>
      <line x1="7" y1="18" x2="17" y2="18"></line>
      <line x1="9" y1="6" x2="15" y2="6"></line>
    </svg>`;
  }
  if (state === 'rain') {
    return `<svg viewBox="0 0 24 24" width="36" height="36" stroke="${stroke}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 18.66A6 6 0 1 1 10.1 7.2a8 8 0 0 1 14.9 4.04 6 6 0 0 1-8 7.42z"></path>
      <line x1="12" y1="18" x2="10" y2="22"></line>
      <line x1="16" y1="18" x2="14" y2="22"></line>
    </svg>`;
  }
  if (state === 'snow') {
    return `<svg viewBox="0 0 24 24" width="36" height="36" stroke="${stroke}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="2" x2="12" y2="22"></line>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
      <line x1="19.07" y1="4.93" x2="4.93" y2="19.07"></line>
    </svg>`;
  }
  if (state === 'storm') {
    return `<svg viewBox="0 0 24 24" width="36" height="36" stroke="${stroke}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 8.58"></path>
      <polyline points="13 11 9 17 12 17 11 23"></polyline>
    </svg>`;
  }
  return '';
};

// Async data fetcher (with Open-Meteo Integration)
window.WeatherHUD._fetchWeatherData = function() {
  var state = window.WeatherHUD._state;
  if (!state.settings || !Array.isArray(state.settings.cities)) return;

  var cities = state.settings.cities;
  var promises = cities.map(function(city) {
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + city.lat + "&longitude=" + city.lon + "&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,precipitation&daily=sunrise,sunset&timezone=auto";
    return fetch(url)
      .then(function(res) {
        if (!res.ok) throw new Error("Fetch failed");
        return res.json();
      })
      .then(function(data) {
        var current = data.current || {};
        var daily = data.daily || {};
        var cond = window.WeatherHUD._resolveCondition(current.weather_code);
        
        // Day/Night classification
        var currentLocalTimeStr = current.time || "";
        var sunriseStr = (daily.sunrise && daily.sunrise[0]) ? daily.sunrise[0] : "";
        var sunsetStr = (daily.sunset && daily.sunset[0]) ? daily.sunset[0] : "";
        var isDay = true;
        if (currentLocalTimeStr && sunriseStr && sunsetStr) {
          isDay = (currentLocalTimeStr >= sunriseStr && currentLocalTimeStr < sunsetStr);
        } else if (currentLocalTimeStr) {
          var parts = currentLocalTimeStr.split('T');
          if (parts[1]) {
            var hour = parseInt(parts[1].split(':')[0], 10);
            isDay = (hour >= 6 && hour < 18);
          }
        }

        // Mathematical Lunar phase computation
        var moon = window.WeatherHUD._getMoonPhase(currentLocalTimeStr);

        // ICAO timezone offset solver for Aviation WX style
        var offsetSeconds = data.utc_offset_seconds || 0;
        var offsetHours = offsetSeconds / 3600;
        var offsetLabel = "UTC" + (offsetHours >= 0 ? "+" + offsetHours : offsetHours);

        return {
          name: city.name,
          temp: current.temperature_2m !== undefined ? Math.round(current.temperature_2m) : null,
          code: current.weather_code,
          conditionLabel: cond.label,
          conditionState: cond.state,
          humidity: current.relative_humidity_2m !== undefined ? current.relative_humidity_2m : null,
          windSpeed: current.wind_speed_10m !== undefined ? current.wind_speed_10m : null,
          precipitation: current.precipitation !== undefined ? current.precipitation : null,
          sunrise: sunriseStr ? sunriseStr.split('T')[1] : "--:--",
          sunset: sunsetStr ? sunsetStr.split('T')[1] : "--:--",
          isDay: isDay,
          moonPhase: moon.label,
          offsetLabel: offsetLabel,
          error: false
        };
      })
      .catch(function(err) {
        console.error("Weather HUD Fetch Err for " + city.name + ":", err);
        return {
          name: city.name,
          temp: null,
          code: null,
          conditionLabel: 'ERR',
          conditionState: 'cloudy',
          humidity: null,
          windSpeed: null,
          precipitation: null,
          sunrise: "--:--",
          sunset: "--:--",
          isDay: true,
          moonPhase: 'New Moon',
          offsetLabel: 'UTC+0',
          error: true
        };
      });
  });

  Promise.all(promises).then(function(results) {
    state.weatherData = results;
    
    // Refresh background shading after fetch (for Ambient Climate mode)
    window.WeatherHUD._updatePositionAndGlass();
    
    // Refresh display DOM
    window.WeatherHUD._updateDOM();
  });
};

window.WeatherHUD._updatePositionAndGlass = function() {
  var state = window.WeatherHUD._state;
  var styles = window.WeatherHUD._sectorStyles;
  if (!state.overlayElement || !state.settings) return;
  
  var panel = state.overlayElement.querySelector('.weather-panel');
  if (!panel) return;

  var sector = (state.settings.sector >= 1 && state.settings.sector <= 9) ? Math.floor(state.settings.sector) : 5;
  var pos = styles[sector] || styles[5];

  panel.style.gridRow = pos.gridRow;
  panel.style.gridColumn = pos.gridColumn;
  panel.style.justifySelf = pos.justifySelf;
  panel.style.alignSelf = pos.alignSelf;

  // Opacity floor settings (True 0% fixes)
  var opacity = parseFloat(state.settings.glassOpacity);
  if (opacity === 0) {
    panel.style.setProperty('background', 'rgba(15, 18, 25, 0)', 'important');
    panel.style.setProperty('backdrop-filter', 'none', 'important');
    panel.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
    panel.style.setProperty('border-color', 'transparent', 'important');
    panel.style.setProperty('box-shadow', 'none', 'important');
  } else {
    var theme = state.settings.displayType || 'standard';
    
    if (theme === 'ambient' && state.weatherData && state.weatherData.length > 0 && !state.weatherData[0].error) {
      var firstCityState = state.weatherData[0].conditionState;
      if (firstCityState === 'clear') {
        panel.style.setProperty('background', 'rgba(45, 30, 20, ' + opacity + ')', 'important');
        panel.style.setProperty('border-color', 'rgba(255, 170, 51, 0.4)', 'important');
        panel.style.setProperty('box-shadow', '0 20px 50px rgba(255, 170, 51, 0.25)', 'important');
      } else if (firstCityState === 'rain' || firstCityState === 'storm') {
        panel.style.setProperty('background', 'rgba(15, 20, 30, ' + opacity + ')', 'important');
        panel.style.setProperty('border-color', 'rgba(51, 153, 255, 0.4)', 'important');
        panel.style.setProperty('box-shadow', '0 20px 50px rgba(51, 153, 255, 0.25)', 'important');
      } else if (firstCityState === 'fog' || firstCityState === 'snow') {
        panel.style.setProperty('background', 'rgba(25, 28, 35, ' + opacity + ')', 'important');
        panel.style.setProperty('border-color', 'rgba(200, 210, 230, 0.4)', 'important');
        panel.style.setProperty('box-shadow', '0 20px 50px rgba(200, 210, 230, 0.2)', 'important');
      } else {
        panel.style.setProperty('background', 'rgba(20, 24, 30, ' + opacity + ')', 'important');
        panel.style.setProperty('border-color', 'rgba(255, 255, 255, 0.15)', 'important');
        panel.style.setProperty('box-shadow', '0 20px 50px rgba(255, 255, 255, 0.08)', 'important');
      }
    } else {
      panel.style.setProperty('background', 'rgba(15, 18, 25, ' + opacity + ')', 'important');
      panel.style.removeProperty('border-color');
      panel.style.removeProperty('box-shadow');
    }
    
    panel.style.removeProperty('backdrop-filter');
    panel.style.removeProperty('-webkit-backdrop-filter');
  }
  
  var themeVal = state.settings.displayType || 'standard';
  if (themeVal !== 'crt' && themeVal !== 'aviation' && themeVal !== 'maritime' && themeVal !== 'aicore') {
    panel.style.setProperty('color', '#ffffff', 'important');
  } else {
    panel.style.removeProperty('color');
  }

  // Dynamic Scale engine
  var scale = (state.settings.scale !== undefined) ? parseFloat(state.settings.scale) : 1.0;
  panel.style.transform = 'scale(' + scale + ')';
  panel.style.transformOrigin = 'center';

  // Apply active theme class safely
  var themeStr = state.settings.displayType || 'standard';
  var classesToRemove = [];
  for (var i = 0; i < panel.classList.length; i++) {
    var cls = panel.classList.item(i);
    if (cls && cls.indexOf('theme-') === 0) {
      classesToRemove.push(cls);
    }
  }
  classesToRemove.forEach(function(c) { panel.classList.remove(c); });
  panel.classList.add('theme-' + themeStr);
};

window.WeatherHUD._startFetchTicker = function() {
  window.WeatherHUD._stopFetchTicker();
  var state = window.WeatherHUD._state;
  state.fetchIntervalId = setInterval(function() {
    window.WeatherHUD._fetchWeatherData();
  }, 300000); // 5 minutes interval
};

window.WeatherHUD._stopFetchTicker = function() {
  var state = window.WeatherHUD._state;
  if (state.fetchIntervalId) {
    clearInterval(state.fetchIntervalId);
    state.fetchIntervalId = null;
  }
};

window.WeatherHUD._updateDOM = function() {
  var state = window.WeatherHUD._state;
  if (!state.overlayElement || !state.settings) return;

  var listContainer = state.overlayElement.querySelector('.weather-list');
  if (!listContainer) return;

  var theme = state.settings.displayType || 'standard';
  
  // 1. Render Skeleton Loading State if there is no weather data yet
  if (!state.weatherData || state.weatherData.length === 0) {
    listContainer.innerHTML = '';
    var count = state.settings.cities ? state.settings.cities.length : 3;
    for (var i = 0; i < count; i++) {
      var skeletonItem = document.createElement('div');
      
      if (theme === 'aviation') {
        skeletonItem.style.cssText = "display: inline-flex; align-items: center; gap: 12px; font-family: monospace; font-size: 14px; color: rgba(0, 229, 229, 0.4); padding: 10px 20px; border: 1px solid rgba(0, 229, 229, 0.15); background: rgba(10,20,20,0.4); border-radius: 4px; font-weight: bold;";
        skeletonItem.innerHTML = `<span>LOADING</span> <span>//</span> <span>--</span> <span>//</span> <span>--C</span> <span>//</span> <span>WIND_--KT</span> <span>//</span> <span>UTC--</span>`;
      } else {
        skeletonItem.style.cssText = "display: flex; flex-direction: column; align-items: center; min-width: 160px; padding: 16px; background: rgba(12, 14, 20, 0.5); border: 1px solid rgba(255,255,255,0.04); border-radius: 16px;";
        skeletonItem.innerHTML = `
          <div style="width: 80px; height: 14px; background: rgba(255,255,255,0.1); border-radius: 4px; margin-bottom: 12px;"></div>
          <div style="width: 36px; height: 36px; background: rgba(255,255,255,0.1); border-radius: 50%; margin-bottom: 12px;"></div>
          <div style="width: 50px; height: 20px; background: rgba(255,255,255,0.1); border-radius: 4px;"></div>
        `;
      }
      listContainer.appendChild(skeletonItem);
    }
    return;
  }

  // 2. Render actual weather metrics
  listContainer.innerHTML = '';
  state.weatherData.forEach(function(city, index) {
    var card = document.createElement('div');
    
    // Dynamic styles and internals for all 13 themes
    if (theme === 'aviation') {
      card.className = 'weather-item';
      card.style.cssText = "display: inline-flex; align-items: center; gap: 12px; font-family: monospace; font-size: 14px; color: #00e5e5; padding: 10px 20px; border: 1px solid rgba(0, 229, 229, 0.35); background: rgba(10,20,20,0.9); border-radius: 4px; font-weight: bold; text-transform: uppercase;";
      
      var aviationName = city.name.substring(0, 3).toUpperCase();
      var aviationCond = city.conditionLabel.replace(/\s+/g, '_').toUpperCase();
      var aviationTemp = city.temp !== null ? city.temp + "C" : "--C";
      var aviationWind = city.windSpeed !== null ? "WIND_" + Math.round(city.windSpeed) + "KT" : "WIND_--KT";
      
      card.innerHTML = `
        <span>${aviationName}</span>
        <span>//</span>
        <span>${aviationCond}</span>
        <span>//</span>
        <span>${aviationTemp}</span>
        <span>//</span>
        <span>${aviationWind}</span>
        <span>//</span>
        <span>${city.offsetLabel}</span>
      `;
    }
    else if (theme === 'observatory') {
      card.className = 'weather-item';
      card.style.cssText = "display: flex; flex-direction: column; align-items: center; padding: 16px; background: rgba(15, 15, 35, 0.85); border: 1px solid rgba(138, 180, 248, 0.2); border-radius: 50%; width: 170px; height: 170px; box-sizing: border-box; justify-content: center; text-align: center; color: #ffffff;";
      
      var moonSvg = window.WeatherHUD._getMoonPhaseIcon(city.moonPhase, '#8ab4f8');
      card.innerHTML = `
        <div class="city-name" style="font-size: 11px; font-weight: 700; color: rgba(138, 180, 248, 0.7); letter-spacing: 0.1em; margin-bottom: 4px;">
          ${city.name.toUpperCase()}
        </div>
        <div class="observatory-orbit" style="margin: 6px 0; display: flex; align-items: center; justify-content: center; position: relative;">
          ${moonSvg}
          <div style="position: absolute; width: 50px; height: 50px; border: 1px dashed rgba(138, 180, 248, 0.25); border-radius: 50%; pointer-events: none;"></div>
        </div>
        <div class="moon-phase-lbl" style="font-size: 9px; font-weight: bold; color: #8ab4f8; text-transform: uppercase;">
          ${city.moonPhase}
        </div>
        <div class="sun-arc-times" style="font-size: 8px; color: rgba(255, 255, 255, 0.45); margin-top: 4px; font-family: monospace;">
          ☼ ${city.sunrise} / ☾ ${city.sunset}
        </div>
      `;
    }
    else if (theme === 'maritime') {
      card.className = 'weather-item';
      card.style.cssText = "display: flex; flex-direction: column; align-items: center; padding: 16px; background: rgba(10, 20, 30, 0.9); border: 1px solid rgba(0, 255, 102, 0.35); border-radius: 4px; width: 180px; box-sizing: border-box; color: #00ff66;";
      
      var windVal = city.windSpeed !== null ? Math.round(city.windSpeed) + " KT" : "-- KT";
      var precipVal = city.precipitation !== null ? city.precipitation + " MM" : "-- MM";
      card.innerHTML = `
        <div class="city-name" style="font-size: 12px; font-weight: bold; color: #00ff66; border-bottom: 1px solid rgba(0, 255, 102, 0.2); width: 100%; text-align: center; padding-bottom: 4px; margin-bottom: 8px;">
          ${city.name.toUpperCase()}
        </div>
        <div class="maritime-gauge" style="display: flex; flex-direction: column; align-items: center; gap: 4px; margin-bottom: 8px;">
          <div style="font-size: 24px; font-weight: 800; color: #00ff66;">
            ${windVal}
          </div>
          <div style="font-size: 9px; color: rgba(0, 255, 102, 0.6); text-transform: uppercase; letter-spacing: 0.1em;">
            WIND SPEED
          </div>
        </div>
        <div class="maritime-details" style="font-size: 10px; color: #ffffff; text-align: center; line-height: 1.4;">
          TEMP: ${city.temp !== null ? city.temp + "°C" : "--°C"} <br>
          PRECIP: ${precipVal}
        </div>
      `;
    }
    else if (theme === 'crt') {
      card.className = 'weather-item';
      card.style.cssText = "display: flex; flex-direction: column; align-items: center; min-width: 170px; padding: 16px; background: rgba(0, 10, 0, 0.85); border: 1px solid rgba(51, 255, 51, 0.3); border-radius: 4px; box-sizing: border-box; color: #33ff33;";
      
      var crtTemp = city.temp !== null ? city.temp + "C" : "--C";
      card.innerHTML = `
        <div class="city-name" style="font-size: 11px; font-weight: bold; letter-spacing: 0.1em; margin-bottom: 6px; color: #33ff33; text-shadow: 0 0 4px rgba(51, 255, 51, 0.5);">
          SYS.LOC // ${city.name.toUpperCase()}
        </div>
        <div class="weather-temp" style="font-size: 20px; font-weight: bold; margin: 4px 0; color: #33ff33; text-shadow: 0 0 4px rgba(51, 255, 51, 0.5);">
          T: ${crtTemp}
        </div>
        <div style="font-size: 9px; line-height: 1.4; text-align: left; opacity: 0.85; width: 100%;">
          HUMIDITY: ${city.humidity !== null ? city.humidity + "%" : "--%"} <br>
          PRECIP: ${city.precipitation !== null ? city.precipitation + "mm" : "--mm"} <br>
          WIND: ${city.windSpeed !== null ? city.windSpeed + "kt" : "--kt"} <br>
          COND: ${city.conditionLabel.toUpperCase()}
        </div>
      `;
    }
    else if (theme === 'aicore') {
      card.className = 'weather-item';
      card.style.cssText = "display: flex; flex-direction: column; align-items: center; min-width: 180px; padding: 16px; background: rgba(12, 18, 30, 0.9); border: 1px solid rgba(0, 240, 255, 0.25); border-radius: 4px; box-sizing: border-box; color: #ffffff;";
      
      var iconHtml = window.WeatherHUD._getWeatherIcon(city.conditionState, city.isDay, city.moonPhase);
      card.innerHTML = `
        <div class="city-name" style="font-size: 11px; font-weight: 800; color: #00f0ff; letter-spacing: 0.1em; margin-bottom: 6px; width: 100%; border-bottom: 1px solid rgba(0, 240, 255, 0.2); padding-bottom: 4px; text-align: left;">
          DATA_NODE // ${city.name.toUpperCase()}
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 6px;">
          <span class="weather-temp" style="font-size: 22px; font-weight: 800; color: #00f0ff;">
            ${city.temp !== null ? city.temp + "°C" : "--°C"}
          </span>
          <span style="height: 24px; display: flex; align-items: center;">
            ${iconHtml}
          </span>
        </div>
        <div style="font-size: 9px; color: rgba(255, 255, 255, 0.55); width: 100%; text-align: left; line-height: 1.35;">
          [RH] REL_HUMIDITY: ${city.humidity !== null ? city.humidity + "%" : "--%"} <br>
          [PR] PRECIPITATION: ${city.precipitation !== null ? city.precipitation + "mm" : "--mm"} <br>
          [WS] WIND_VELOCITY: ${city.windSpeed !== null ? city.windSpeed + "m/s" : "--m/s"}
        </div>
      `;
    }
    else if (theme === 'metro') {
      card.className = 'weather-item';
      
      var lineColors = ['#ff0033', '#0099ff', '#33cc33', '#ffcc00', '#9900cc', '#ff9900'];
      var metroColor = lineColors[index % lineColors.length];
      
      card.style.cssText = "display: flex; flex-direction: column; align-items: center; min-width: 170px; padding: 16px; background: #151515; border-left: 4px solid " + metroColor + " !important; border-top: none; border-right: none; border-bottom: none; border-radius: 0px; box-sizing: border-box; color: #ffffff;";
      
      var iconHtml = window.WeatherHUD._getWeatherIcon(city.conditionState, city.isDay, city.moonPhase);
      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; width: 100%; border-bottom: 2px solid ${metroColor}; padding-bottom: 4px; margin-bottom: 8px;">
          <span style="background: ${metroColor}; color: #000; font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 2px;">
            M${index + 1}
          </span>
          <span style="font-size: 13px; font-weight: 900; color: #ffffff; letter-spacing: -0.02em;">
            ${city.name.toUpperCase()}
          </span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <span style="font-size: 24px; font-weight: 900; color: #ffffff;">
            ${city.temp !== null ? city.temp + "°C" : "--°C"}
          </span>
          <span>
            ${iconHtml}
          </span>
        </div>
        <div style="font-size: 9px; color: #aaaaaa; margin-top: 4px; text-transform: uppercase; width: 100%; text-align: left;">
          STATUS: ON TIME // ${city.conditionLabel}
        </div>
      `;
    }
    else if (theme === 'hotel') {
      card.className = 'weather-item';
      card.style.cssText = "display: flex; flex-direction: column; align-items: center; min-width: 160px; padding: 16px; background: rgba(36, 30, 24, 0.85); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 8px; box-sizing: border-box; color: #e5c158;";
      
      var iconHtml = window.WeatherHUD._getWeatherIcon(city.conditionState, city.isDay, city.moonPhase, '#e5c158');
      card.innerHTML = `
        <div class="city-name" style="font-family: Georgia, serif; font-size: 14px; font-style: italic; color: #d4af37; margin-bottom: 6px;">
          ${city.name}
        </div>
        <div style="margin: 6px 0; display: flex; align-items: center; justify-content: center; height: 40px;">
          ${iconHtml}
        </div>
        <div class="weather-temp" style="font-size: 26px; font-family: Georgia, serif; font-weight: 300; color: #e5c158;">
          ${city.temp !== null ? city.temp + "°C" : "--°C"}
        </div>
        <div style="font-size: 10px; color: rgba(212, 175, 55, 0.6); text-transform: lowercase; font-style: italic; margin-top: 4px;">
          ${city.conditionLabel.toLowerCase()}
        </div>
      `;
    }
    else if (theme === 'noir') {
      card.className = 'weather-item';
      card.style.cssText = "display: flex; flex-direction: column; align-items: center; min-width: 160px; padding: 16px; background: #1a1a1a; border: 1px solid #333333; border-radius: 0px; box-sizing: border-box; color: #ffffff;";
      
      var iconHtml = window.WeatherHUD._getWeatherIcon(city.conditionState, city.isDay, city.moonPhase);
      card.innerHTML = `
        <div class="city-name" style="font-family: 'Times New Roman', serif; font-size: 14px; font-weight: bold; color: #faebd7; margin-bottom: 8px;">
          ${city.name.toUpperCase()}
        </div>
        <div style="margin: 8px 0; display: flex; align-items: center; justify-content: center;">
          ${iconHtml}
        </div>
        <div class="weather-temp" style="font-size: 24px; font-family: 'Times New Roman', serif; font-weight: bold; color: #ffffff;">
          ${city.temp !== null ? city.temp + "°C" : "--°C"}
        </div>
        <div style="font-size: 10px; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px;">
          ${city.conditionLabel}
        </div>
      `;
    }
    else if (theme === 'zen') {
      card.className = 'weather-item';
      card.style.cssText = "display: flex; flex-direction: column; align-items: center; min-width: 160px; padding: 16px; background: transparent; border: 1px solid rgba(255, 255, 255, 0.22); border-radius: 0px; box-sizing: border-box; color: #ffffff;";
      
      card.innerHTML = `
        <div class="city-name" style="font-size: 12px; font-weight: 100; color: rgba(255,255,255,0.7); letter-spacing: 0.15em; margin-bottom: 12px;">
          ${city.name}
        </div>
        <div class="weather-temp" style="font-size: 32px; font-weight: 100; color: #ffffff; margin-bottom: 8px;">
          ${city.temp !== null ? city.temp + "°" : "--°"}
        </div>
        <div style="font-size: 9px; font-weight: 200; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.1em;">
          ${city.conditionLabel}
        </div>
      `;
    }
    else if (theme === 'boardroom') {
      card.className = 'weather-item';
      card.style.cssText = "display: flex; flex-direction: column; align-items: center; min-width: 180px; padding: 16px; background: rgba(28, 30, 36, 0.85); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 2px; box-sizing: border-box; color: #ffffff;";
      
      card.innerHTML = `
        <div class="city-name" style="font-size: 12px; font-weight: 700; color: #ffffff; text-align: left; width: 100%; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 4px; margin-bottom: 6px;">
          ${city.name.toUpperCase()}
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <span class="weather-temp" style="font-size: 20px; font-weight: 700; color: #ffffff;">
            ${city.temp !== null ? city.temp + "°C" : "--°C"}
          </span>
          <span style="font-size: 11px; font-weight: 600; color: #a0a0a5; text-transform: uppercase;">
            ${city.conditionLabel}
          </span>
        </div>
        <div style="font-size: 9px; color: #808085; width: 100%; text-align: left; margin-top: 4px; font-family: monospace; line-height: 1.4;">
          WIND: ${city.windSpeed !== null ? Math.round(city.windSpeed) + " KT" : "-- KT"} <br>
          HUMIDITY: ${city.humidity !== null ? city.humidity + "%" : "--%"}
        </div>
      `;
    }
    else {
      // Standard / Ambient / Alert Weather Card Layouts
      card.className = 'weather-item';
      Object.assign(card.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minWidth: '160px',
        padding: '16px',
        background: 'rgba(12, 14, 20, 0.88)', 
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        color: '#ffffff',
        boxSizing: 'border-box',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        transition: 'all 0.3s ease'
      });

      var iconHtml = window.WeatherHUD._getWeatherIcon(city.conditionState, city.isDay, city.moonPhase);
      var tempHtml = city.temp !== null ? city.temp + "°C" : "--°C";

      card.innerHTML = `
        <div class="city-name" style="font-size: 13px; font-weight: 700; color: rgba(255, 255, 255, 0.65); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">
          ${city.name}
        </div>
        <div class="weather-icon-wrapper" style="height: 48px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
          ${iconHtml}
        </div>
        <div class="weather-temp" style="font-size: 24px; font-weight: 700; color: #ffffff;">
          ${tempHtml}
        </div>
        <div class="weather-desc" style="font-size: 10px; font-weight: 600; color: rgba(255, 255, 255, 0.45); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">
          ${city.conditionLabel}
        </div>
      `;
    }
    listContainer.appendChild(card);
  });
};
