/**
 * SignageHub SkyWatch HUD Overlay Plugin
 * Fetches and displays live overhead flights using OpenSky API.
 */

window.SkyWatchHUD = window.SkyWatchHUD || {};

window.SkyWatchHUD._instances = window.SkyWatchHUD._instances || {};

window.SkyWatchHUD._getInstance = function(containerSelector) {
  var selector = containerSelector || (window.SkyWatchHUD._state && window.SkyWatchHUD._state.containerSelector) || '#hud-container';
  window.SkyWatchHUD._instances = window.SkyWatchHUD._instances || {};
  if (!window.SkyWatchHUD._instances[selector]) {
    var defaultSettings = {
      glassOpacity: 0.8,
      scale: 1.0,
      customTitle: 'LIVE OVERHEAD',
      screenLat: 55.6761,
      screenLng: 12.5683,
      fitBehavior: 'auto'
    };
    window.SkyWatchHUD._instances[selector] = {
      containerSelector: selector,
      settings: defaultSettings,
      context: null,
      flightsData: [],
      overlayElement: null,
      fetchIntervalId: null,
      fetchSuccess: false
    };
  }
  return window.SkyWatchHUD._instances[selector];
};

window.SkyWatchHUD._resolveCoords = function(instance) {
  var lat = 55.6761;
  var lng = 12.5683;
  
  if (instance.context && instance.context.coordinates) {
    var c = instance.context.coordinates;
    var parsedLat = parseFloat(c.latitude);
    var parsedLng = parseFloat(c.longitude);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      lat = parsedLat;
      lng = parsedLng;
    }
  } else if (instance.settings) {
    var parsedLat = parseFloat(instance.settings.screenLat);
    var parsedLng = parseFloat(instance.settings.screenLng);
    if (!isNaN(parsedLat)) lat = parsedLat;
    if (!isNaN(parsedLng)) lng = parsedLng;
  }
  
  return { latitude: lat, longitude: lng };
};

window.SkyWatchHUD.init = function(options) {
  try {
    options = options || {};
    var containerSelector = options.container || '#hud-container';
    
    var defaultSettings = {
      glassOpacity: 0.8,
      scale: 1.0,
      customTitle: 'LIVE OVERHEAD',
      screenLat: 55.6761,
      screenLng: 12.5683,
      fitBehavior: 'auto'
    };
    
    var instance = {
      containerSelector: containerSelector,
      context: options.context || null,
      settings: Object.assign({}, defaultSettings, options.settings || {}),
      flightsData: [],
      overlayElement: null,
      fetchIntervalId: null,
      fetchSuccess: false
    };
    
    window.SkyWatchHUD._instances = window.SkyWatchHUD._instances || {};
    window.SkyWatchHUD._instances[containerSelector] = instance;
    window.SkyWatchHUD._state = instance;
    
    console.log("SkyWatch HUD: Initialized for " + containerSelector);
  } catch (err) {
    console.error("SkyWatch HUD Init Error:", err);
  }
};

window.SkyWatchHUD.mount = function(containerSelector) {
  try {
    var instance = window.SkyWatchHUD._getInstance(containerSelector);
    var container = document.querySelector(instance.containerSelector) || document.body;
    
    if (!container) {
      throw new Error("Target container not found: " + instance.containerSelector);
    }

    var existingPanel = container.querySelector('.skywatch-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    // Inject global CSS themes style tag
    var styleTag = document.getElementById('sh-skywatch-styles');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'sh-skywatch-styles';
      document.head.appendChild(styleTag);
    }
    
    styleTag.textContent = `
      @keyframes radar-pulse {
        0% {
          transform: translate(-50%, -50%) scale(0.6);
          opacity: 0.25;
        }
        50% {
          opacity: 0.45;
        }
        100% {
          transform: translate(-50%, -50%) scale(1.4);
          opacity: 0;
        }
      }

      .skywatch-panel {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: flex-start !important;
        width: 100% !important;
        height: 100% !important;
        box-sizing: border-box !important;
        padding: calc(18px * var(--widget-zoom, 1.0)) !important;
        position: relative !important;
        overflow: hidden !important;
        font-family: 'SF Mono', Consolas, Monaco, 'Andale Mono', monospace !important;
        color: #ffffff !important;
        user-select: none !important;
        transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }

      .skywatch-panel .radar-pulse-ring {
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        width: calc(240px * var(--widget-zoom, 1.0)) !important;
        height: calc(240px * var(--widget-zoom, 1.0)) !important;
        border: calc(1.5px * var(--widget-zoom, 1.0)) solid rgba(0, 240, 255, 0.15) !important;
        border-radius: 50% !important;
        transform: translate(-50%, -50%) scale(0.6) !important;
        pointer-events: none !important;
        z-index: 0 !important;
        animation: radar-pulse 8s cubic-bezier(0.2, 0.8, 0.4, 1) infinite !important;
      }

      .skywatch-panel .panel-header {
        font-size: calc(11px * var(--widget-zoom, 1.0)) !important;
        line-height: calc(14px * var(--widget-zoom, 1.0)) !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: calc(0.25em * var(--widget-zoom, 1.0)) !important;
        color: #00f0ff !important;
        border: calc(1px * var(--widget-zoom, 1.0)) solid rgba(0, 240, 255, 0.25) !important;
        border-radius: calc(20px * var(--widget-zoom, 1.0)) !important;
        padding: calc(4px * var(--widget-zoom, 1.0)) calc(12px * var(--widget-zoom, 1.0)) !important;
        margin-bottom: calc(16px * var(--widget-zoom, 1.0)) !important;
        z-index: 1 !important;
        text-align: center !important;
      }

      .skywatch-panel .flights-list {
        display: flex !important;
        flex-direction: column !important;
        gap: calc(8px * var(--widget-zoom, 1.0)) !important;
        width: 100% !important;
        z-index: 1 !important;
        flex: 1 !important;
        justify-content: center !important;
      }

      .skywatch-panel .flight-item {
        display: grid !important;
        grid-template-columns: 2fr 1.5fr 1.5fr !important;
        align-items: center !important;
        padding: calc(8px * var(--widget-zoom, 1.0)) calc(12px * var(--widget-zoom, 1.0)) !important;
        background: rgba(255, 255, 255, 0.02) !important;
        border-left: calc(2px * var(--widget-zoom, 1.0)) solid #00f0ff !important;
        font-size: calc(11px * var(--widget-zoom, 1.0)) !important;
        letter-spacing: 0.05em !important;
        white-space: nowrap !important;
        opacity: var(--widget-opacity, 1.0) !important;
      }

      .skywatch-panel .flight-callsign {
        font-weight: 700 !important;
        color: #ffffff !important;
        text-align: left !important;
      }

      .skywatch-panel .flight-altitude {
        color: #00f0ff !important;
        text-align: right !important;
      }

      .skywatch-panel .flight-speed {
        color: #ffb700 !important;
        text-align: right !important;
      }

      .skywatch-panel .clear-skies-state {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: calc(6px * var(--widget-zoom, 1.0)) !important;
        flex: 1 !important;
        z-index: 1 !important;
        color: rgba(255, 255, 255, 0.6) !important;
        font-size: calc(11px * var(--widget-zoom, 1.0)) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.1em !important;
      }

      .skywatch-panel .clear-skies-icon {
        font-size: calc(18px * var(--widget-zoom, 1.0)) !important;
        color: rgba(0, 240, 255, 0.6) !important;
        margin-bottom: calc(4px * var(--widget-zoom, 1.0)) !important;
      }
    `;

    var panel = document.createElement('div');
    panel.className = 'skywatch-panel';
    
    Object.assign(panel.style, {
      pointerEvents: 'auto',
      boxSizing: 'border-box',
      background: 'transparent',
      border: 'none',
      borderRadius: '0',
      padding: '0',
      boxShadow: 'none',
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      width: 'fit-content',
      maxWidth: '100%',
      margin: '0 auto'
    });

    panel.innerHTML = `
      <div class="radar-pulse-ring"></div>
      <div class="panel-header">LIVE OVERHEAD</div>
      <div class="flights-list"></div>
    `;

    container.appendChild(panel);
    instance.overlayElement = panel;

    window.SkyWatchHUD._updatePositionAndGlass(instance.containerSelector);
    window.SkyWatchHUD._updateDOM(instance.containerSelector);
    window.SkyWatchHUD._startTicker(instance.containerSelector);

    console.log("SkyWatch HUD: Mounted to " + instance.containerSelector);
  } catch (err) {
    console.error("SkyWatch HUD Mount Error:", err);
  }
};

window.SkyWatchHUD._updatePositionAndGlass = function(containerSelector) {
  var instance = window.SkyWatchHUD._getInstance(containerSelector);
  if (!instance || !instance.overlayElement || !instance.settings) return;
  
  var panel = instance.overlayElement;
  var fit = instance.settings.fitBehavior || 'auto';
  
  if (fit === 'auto') {
    var baseWidth = 280;
    var baseHeight = 225;
    panel.style.setProperty('width', 'calc(' + baseWidth + 'px * var(--widget-zoom, 1.0))', 'important');
    panel.style.setProperty('height', 'calc(' + baseHeight + 'px * var(--widget-zoom, 1.0))', 'important');
  } else {
    panel.style.setProperty('width', '100%', 'important');
    panel.style.setProperty('height', '100%', 'important');
  }
  
  panel.style.setProperty('background', 'transparent', 'important');
  panel.style.setProperty('border', 'none', 'important');
  panel.style.setProperty('box-shadow', 'none', 'important');
  panel.style.setProperty('backdrop-filter', 'none', 'important');
  panel.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
};

window.SkyWatchHUD._fetchFlights = async function(containerSelector) {
  var instance = window.SkyWatchHUD._getInstance(containerSelector);
  if (!instance) return;

  var coords = window.SkyWatchHUD._resolveCoords(instance);
  var lat = coords.latitude;
  var lng = coords.longitude;
  var lamin = lat - 0.5;
  var lamax = lat + 0.5;
  var lomin = lng - 0.5;
  var lomax = lng + 0.5;
  
  var url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
  
  var controller = new AbortController();
  var timeoutId = setTimeout(() => controller.abort(), 2500); // Strict 2.5s network timeout rule
  
  try {
    var response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`OpenSky API HTTP Error: ${response.status}`);
    }
    var data = await response.json();
    
    var flights = [];
    if (data && Array.isArray(data.states)) {
      var activeStates = data.states.filter(function(st) {
        return st && st[1] && st[1].trim() !== '';
      });
      
      var count = Math.min(activeStates.length, 3);
      for (var i = 0; i < count; i++) {
        var st = activeStates[i];
        var callsign = st[1].trim();
        var altMeters = st[7] !== null ? st[7] : st[13];
        var velocityMs = st[9];
        
        flights.push({
          callsign: callsign,
          altitude: altMeters,
          speed: velocityMs
        });
      }
    }
    
    instance.flightsData = flights;
    instance.fetchSuccess = true;
    window.SkyWatchHUD._updateDOM(containerSelector);
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("[SkyWatch HUD] Failed to fetch live overhead flight data:", err);
    instance.fetchSuccess = false;
    window.SkyWatchHUD._updateDOM(containerSelector);
  }
};

window.SkyWatchHUD._updateDOM = function(containerSelector) {
  var instance = window.SkyWatchHUD._getInstance(containerSelector);
  if (!instance || !instance.overlayElement) return;
  
  var panel = instance.overlayElement;
  var listContainer = panel.querySelector('.flights-list');
  if (!listContainer) return;
  
  var customTitle = instance.settings.customTitle || 'AEROSPACE ACTIVITY';
  var titleEl = panel.querySelector('.panel-header');
  if (titleEl) {
    titleEl.textContent = customTitle;
  }
  
  listContainer.innerHTML = '';
  panel.style.opacity = '1';
  
  if (!instance.fetchSuccess) {
    var offlineEl = document.createElement('div');
    offlineEl.className = 'clear-skies-state';
    offlineEl.innerHTML = `
      <div class="clear-skies-icon">📡</div>
      <div>RADAR OFFLINE</div>
    `;
    listContainer.appendChild(offlineEl);
    return;
  }
  
  var flights = instance.flightsData || [];
  if (flights.length === 0) {
    var clearEl = document.createElement('div');
    clearEl.className = 'clear-skies-state';
    clearEl.innerHTML = `
      <div class="clear-skies-icon">📡</div>
      <div>CLEAR SKIES</div>
    `;
    listContainer.appendChild(clearEl);
  } else {
    flights.forEach(function(fl) {
      var altStr = fl.altitude !== null && fl.altitude !== undefined ? 
        Math.round(fl.altitude).toLocaleString() + 'm' : 'N/A';
      var speedStr = fl.speed !== null && fl.speed !== undefined ? 
        Math.round(fl.speed * 3.6).toLocaleString() + ' km/h' : 'N/A';
        
      var item = document.createElement('div');
      item.className = 'flight-item';
      item.innerHTML = `
        <span class="flight-callsign">${fl.callsign}</span>
        <span class="flight-altitude">${altStr}</span>
        <span class="flight-speed">${speedStr}</span>
      `;
      listContainer.appendChild(item);
    });
  }
};

window.SkyWatchHUD._startTicker = function(containerSelector) {
  var instance = window.SkyWatchHUD._getInstance(containerSelector);
  window.SkyWatchHUD._stopTicker(containerSelector);
  window.SkyWatchHUD._fetchFlights(containerSelector);
  instance.fetchIntervalId = setInterval(function() {
    window.SkyWatchHUD._fetchFlights(containerSelector);
  }, 30000);
};

window.SkyWatchHUD._stopTicker = function(containerSelector) {
  var instance = window.SkyWatchHUD._getInstance(containerSelector);
  if (instance && instance.fetchIntervalId) {
    clearInterval(instance.fetchIntervalId);
    instance.fetchIntervalId = null;
  }
};

window.SkyWatchHUD.update = function(arg1, arg2) {
  var newSettings, containerSelector;
  if (typeof arg1 === 'string') {
    containerSelector = arg1;
    newSettings = arg2;
  } else {
    newSettings = arg1;
    containerSelector = arg2;
  }

  var instance = window.SkyWatchHUD._getInstance(containerSelector);
  if (!instance) return;

  var oldCoords = window.SkyWatchHUD._resolveCoords(instance);

  if (newSettings) {
    if (newSettings.context) {
      instance.context = Object.assign({}, instance.context || {}, newSettings.context);
    }
    if (newSettings.glassOpacity !== undefined) {
      instance.settings.glassOpacity = newSettings.glassOpacity;
    }
    if (newSettings.scale !== undefined) {
      instance.settings.scale = newSettings.scale;
    }
    if (newSettings.customTitle !== undefined) {
      instance.settings.customTitle = newSettings.customTitle;
    }
    if (newSettings.fitBehavior !== undefined) {
      instance.settings.fitBehavior = newSettings.fitBehavior;
    }
  }

  var newCoords = window.SkyWatchHUD._resolveCoords(instance);
  var coordsChanged = oldCoords.latitude !== newCoords.latitude || oldCoords.longitude !== newCoords.longitude;

  window.SkyWatchHUD._updatePositionAndGlass(containerSelector);

  if (coordsChanged) {
    window.SkyWatchHUD._startTicker(containerSelector);
  } else {
    window.SkyWatchHUD._updateDOM(containerSelector);
  }
};

window.SkyWatchHUD.unmount = function(containerSelector) {
  var selector = containerSelector || (window.SkyWatchHUD._state && window.SkyWatchHUD._state.containerSelector) || '#hud-container';
  window.SkyWatchHUD._stopTicker(selector);
  var instance = window.SkyWatchHUD._instances[selector];
  if (instance && instance.overlayElement) {
    instance.overlayElement.remove();
    instance.overlayElement = null;
  }
  console.log("SkyWatch HUD: Unmounted " + selector);
};

window.SkyWatchHUD.destroy = function(containerSelector) {
  var selector = containerSelector || (window.SkyWatchHUD._state && window.SkyWatchHUD._state.containerSelector) || '#hud-container';
  window.SkyWatchHUD.unmount(selector);
  var instance = window.SkyWatchHUD._instances[selector];
  if (instance) {
    instance.containerSelector = null;
    instance.settings = null;
    instance.context = null;
    delete window.SkyWatchHUD._instances[selector];
  }
  console.log("SkyWatch HUD: Destroyed " + selector);
};

window.SkyWatchHUD._state = {
  containerSelector: null,
  settings: null,
  context: null,
  flightsData: [],
  overlayElement: null,
  fetchIntervalId: null,
  fetchSuccess: false
};
