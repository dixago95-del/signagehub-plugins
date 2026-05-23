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
      /* Standard theme overrides */
      .weather-panel.theme-standard {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }

      /* Aviation Theme (ICAO minimal METAR style) */
      .weather-panel.theme-aviation {
        font-family: 'SF Mono', Consolas, Monaco, monospace !important;
        border: 1px solid rgba(0, 229, 229, 0.3) !important;
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6) !important;
      }
      .weather-panel.theme-aviation .panel-header {
        background: rgba(0, 229, 229, 0.1) !important;
        border-color: rgba(0, 229, 229, 0.3) !important;
        color: #00e5e5 !important;
        font-family: monospace !important;
        letter-spacing: 0.3em !important;
      }

      /* Severe Weather Alert Mode */
      @keyframes alert-border-pulse {
        0% { border-color: rgba(255, 59, 48, 0.3) !important; box-shadow: 0 0 10px rgba(255, 59, 48, 0.1), 0 20px 50px rgba(0,0,0,0.5) !important; }
        50% { border-color: rgba(255, 59, 48, 0.85) !important; box-shadow: 0 0 20px rgba(255, 59, 48, 0.3), 0 20px 50px rgba(0,0,0,0.5) !important; }
        100% { border-color: rgba(255, 59, 48, 0.3) !important; box-shadow: 0 0 10px rgba(255, 59, 48, 0.1), 0 20px 50px rgba(0,0,0,0.5) !important; }
      }
      .weather-panel.theme-alert {
        animation: alert-border-pulse 2s infinite ease-in-out !important;
        background: rgba(18, 12, 12, 0.9) !important;
        border: 1px solid rgba(255, 59, 48, 0.4) !important;
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
      width: '680px',
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

// Minimal, white inline weather SVGs
window.WeatherHUD._getWeatherIcon = function(state) {
  var stroke = '#ffffff';
  if (state === 'clear') {
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
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + city.lat + "&longitude=" + city.lon + "&current=temperature_2m,weather_code&timezone=auto";
    return fetch(url)
      .then(function(res) {
        if (!res.ok) throw new Error("Fetch failed");
        return res.json();
      })
      .then(function(data) {
        var current = data.current || {};
        var cond = window.WeatherHUD._resolveCondition(current.weather_code);
        
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
    // Dynamic theme styling mappings
    var theme = state.settings.displayType || 'standard';
    
    if (theme === 'ambient' && state.weatherData && state.weatherData.length > 0 && !state.weatherData[0].error) {
      // Dynamic ambient climate styling based on the first city weather state
      var firstCityState = state.weatherData[0].conditionState;
      if (firstCityState === 'clear') {
        // Amber golden glow
        panel.style.setProperty('background', 'rgba(45, 30, 20, ' + opacity + ')', 'important');
        panel.style.setProperty('border-color', 'rgba(255, 170, 51, 0.4)', 'important');
        panel.style.setProperty('box-shadow', '0 20px 50px rgba(255, 170, 51, 0.25)', 'important');
      } else if (firstCityState === 'rain' || firstCityState === 'storm') {
        // Rain/storm soft blue bloom
        panel.style.setProperty('background', 'rgba(15, 20, 30, ' + opacity + ')', 'important');
        panel.style.setProperty('border-color', 'rgba(51, 153, 255, 0.4)', 'important');
        panel.style.setProperty('box-shadow', '0 20px 50px rgba(51, 153, 255, 0.25)', 'important');
      } else {
        // Standard grey graphite
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
  panel.style.setProperty('color', '#ffffff', 'important');

  // Dynamic Scale engine
  var scale = (state.settings.scale !== undefined) ? parseFloat(state.settings.scale) : 1.0;
  panel.style.transform = 'scale(' + scale + ')';
  panel.style.transformOrigin = 'center';

  // Apply active theme class
  panel.classList.forEach(function(cls) {
    if (cls.startsWith('theme-')) {
      panel.classList.remove(cls);
    }
  });
  panel.classList.add('theme-' + (state.settings.displayType || 'standard'));
};

window.WeatherHUD._startFetchTicker = function() {
  window.WeatherHUD._stopFetchTicker();
  var state = window.WeatherHUD._state;
  state.fetchIntervalId = setInterval(function() {
    window.WeatherHUD._fetchWeatherData();
  }, 300000); // 5 minutes interval to prevent API spamming
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
        skeletonItem.innerHTML = `<span>LOADING</span> <span>//</span> <span>--</span> <span>//</span> <span>--C</span> <span>//</span> <span>UTC--</span>`;
      } else {
        skeletonItem.style.cssText = "display: flex; flex-direction: column; align-items: center; min-width: 160px; padding: 16px; background: rgba(12, 14, 20, 0.5); border: 1px solid rgba(255,255,255,0.04); border-radius: 16px;";
        skeletonItem.innerHTML = `
          <div style="width: 80px; height: 14px; background: rgba(255,255,255,0.1); border-radius: 4px; margin-bottom: 12px; animation: pulse 1.5s infinite ease-in-out;"></div>
          <div style="width: 36px; height: 36px; background: rgba(255,255,255,0.1); border-radius: 50%; margin-bottom: 12px; animation: pulse 1.5s infinite ease-in-out;"></div>
          <div style="width: 50px; height: 20px; background: rgba(255,255,255,0.1); border-radius: 4px; animation: pulse 1.5s infinite ease-in-out;"></div>
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
    
    if (theme === 'aviation') {
      // 2. Aviation WX Mode METAR style layout
      card.className = 'weather-item';
      card.style.cssText = "display: inline-flex; align-items: center; gap: 12px; font-family: monospace; font-size: 14px; color: #00e5e5; padding: 10px 20px; border: 1px solid rgba(0, 229, 229, 0.3); background: rgba(10,20,20,0.9); border-radius: 4px; font-weight: bold; text-transform: uppercase;";
      
      var aviationName = city.name.substring(0, 3).toUpperCase();
      var aviationCond = city.conditionLabel.replace(/\s+/g, '_').toUpperCase();
      var aviationTemp = city.temp !== null ? city.temp + "C" : "--C";
      
      card.innerHTML = `
        <span>${aviationName}</span>
        <span>//</span>
        <span>${aviationCond}</span>
        <span>//</span>
        <span>${aviationTemp}</span>
        <span>//</span>
        <span>${city.offsetLabel}</span>
      `;
    } else {
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

      var iconHtml = window.WeatherHUD._getWeatherIcon(city.conditionState);
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
