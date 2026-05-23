window.WorldClockHUD = window.WorldClockHUD || {};

window.WorldClockHUD.init = function(options) {
  try {
    options = options || {};
    var state = window.WorldClockHUD._state;
    state.containerSelector = options.container || '#hud-container';
    
    var defaultSettings = {
      displayType: 'digital',
      capitals: ['Copenhagen', 'Tokyo', 'New York'],
      sector: 5,
      glassOpacity: 0.8,
      scale: 1.0,
      locale: 'en-US'
    };
    state.settings = Object.assign({}, defaultSettings, options.settings || {});
    
    window.WorldClockHUD._resolveTimezones();
    console.log("HUD: Initialized");
  } catch (err) {
    console.error("HUD Init Error:", err);
  }
};

window.WorldClockHUD.mount = function() {
  try {
    var state = window.WorldClockHUD._state;
    var containerSelector = state.containerSelector || '#hud-container';
    var container = document.querySelector(containerSelector) || document.body;
    
    if (!container) {
      throw new Error("Target container not found: " + containerSelector);
    }

    // Clean up any existing overlay to prevent duplicates
    var existingOverlay = container.querySelector('#sh-world-clock-hud');
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
    var styleTag = document.getElementById('sh-hud-theme-styles');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'sh-hud-theme-styles';
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = `
      /* Common Theme overrides */
      .clocks-panel.theme-digital {
        font-family: 'SF Mono', Consolas, monospace !important;
      }
      
      /* 4. Executive Boardroom */
      .clocks-panel.theme-boardroom {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        box-shadow: 0 30px 70px rgba(0, 0, 0, 0.7) !important;
        letter-spacing: -0.02em;
      }
      .clocks-panel.theme-boardroom .panel-header {
        background: rgba(255, 255, 255, 0.05) !important;
        border-color: rgba(255, 255, 255, 0.1) !important;
        color: rgba(255, 255, 255, 0.7) !important;
        font-weight: 300 !important;
      }
      .clocks-panel.theme-boardroom .clock-item {
        background: rgba(18, 22, 28, 0.95) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        border-radius: 8px !important;
      }

      /* 5. Luxury Hotel */
      .clocks-panel.theme-hotel {
        font-family: 'Georgia', 'Times New Roman', serif !important;
        border: 1px solid rgba(212, 175, 55, 0.4) !important;
        box-shadow: 0 20px 50px rgba(35, 25, 15, 0.6), inset 0 0 30px rgba(212, 175, 55, 0.08) !important;
      }
      .clocks-panel.theme-hotel .panel-header {
        background: rgba(212, 175, 55, 0.12) !important;
        border-color: rgba(212, 175, 55, 0.4) !important;
        color: #e5c158 !important;
        font-weight: 400 !important;
        letter-spacing: 0.25em !important;
        text-shadow: 0 1px 4px rgba(0,0,0,0.5);
      }
      .clocks-panel.theme-hotel .clock-item {
        background: rgba(36, 30, 24, 0.96) !important;
        border: 1px solid rgba(212, 175, 55, 0.18) !important;
        border-radius: 6px !important;
        box-shadow: 0 6px 20px rgba(0,0,0,0.3) !important;
      }
      .clocks-panel.theme-hotel .clock-item div {
        color: #f3e5ab !important;
      }

      /* 6. Trading Floor */
      .clocks-panel.theme-trading {
        font-family: 'SF Mono', Consolas, monospace !important;
        border: 1px solid rgba(0, 255, 150, 0.3) !important;
      }
      .clocks-panel.theme-trading .panel-header {
        background: rgba(0, 255, 100, 0.08) !important;
        border-color: rgba(0, 255, 100, 0.25) !important;
        color: #00ff66 !important;
        text-shadow: 0 0 10px rgba(0, 255, 100, 0.4);
      }
      .clocks-panel.theme-trading .clock-item {
        background: #090c09 !important;
        border: 1px solid rgba(0, 255, 100, 0.15) !important;
        border-radius: 0px !important;
      }

      /* 7. Mission Control */
      .clocks-panel.theme-mission {
        font-family: 'Courier New', Courier, monospace !important;
        border: 1px solid rgba(0, 190, 255, 0.35) !important;
        border-radius: 6px !important;
        position: relative;
      }
      .clocks-panel.theme-mission::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: radial-gradient(rgba(0,190,255,0.02) 1px, transparent 1px);
        background-size: 16px 16px;
        pointer-events: none;
        border-radius: 6px;
      }
      .clocks-panel.theme-mission .panel-header {
        background: rgba(0, 150, 255, 0.1) !important;
        border-color: rgba(0, 150, 255, 0.3) !important;
        color: #33b5ff !important;
        font-family: 'Courier New', Courier, monospace !important;
      }
      .clocks-panel.theme-mission .clock-item {
        background: rgba(10, 16, 24, 0.95) !important;
        border: 1px solid rgba(0, 150, 255, 0.2) !important;
        border-radius: 3px !important;
      }

      /* 8. Maritime Chronometer */
      .clocks-panel.theme-maritime {
        font-family: system-ui, sans-serif !important;
        border: 2px solid rgba(0, 220, 220, 0.35) !important;
        border-radius: 30px !important;
      }
      .clocks-panel.theme-maritime .panel-header {
        background: rgba(0, 220, 220, 0.1) !important;
        border-color: rgba(0, 220, 220, 0.3) !important;
        color: #00e5e5 !important;
      }
      .clocks-panel.theme-maritime .clock-item {
        background: rgba(8, 20, 22, 0.96) !important;
        border: 1px solid rgba(0, 220, 220, 0.2) !important;
        border-radius: 16px !important;
        color: #00ffff !important;
        position: relative;
      }

      /* 9. Metro Transit */
      .clocks-panel.theme-metro {
        font-family: 'Impact', 'Helvetica Neue', Arial, sans-serif !important;
        border: 4px solid #ffcc00 !important;
        border-radius: 0px !important;
      }
      .clocks-panel.theme-metro .panel-header {
        background: #ffcc00 !important;
        border-color: #ffcc00 !important;
        color: #000000 !important;
        border-radius: 0px !important;
        letter-spacing: 0.1em !important;
      }
      .clocks-panel.theme-metro .clock-item {
        background: #111111 !important;
        border: 1px solid #333333 !important;
        border-radius: 0px !important;
        position: relative;
        overflow: hidden;
        padding-top: 24px !important;
      }
      .clocks-panel.theme-metro .metro-route-bar {
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 8px;
      }

      /* 10. Noir Cinema */
      .clocks-panel.theme-noir {
        font-family: 'Georgia', serif !important;
        border: 1px solid rgba(255, 170, 51, 0.15) !important;
        box-shadow: 0 40px 80px rgba(0, 0, 0, 0.9) !important;
      }
      .clocks-panel.theme-noir .panel-header {
        background: rgba(255, 170, 51, 0.08) !important;
        border-color: rgba(255, 170, 51, 0.2) !important;
        color: #ffaa33 !important;
        text-shadow: 0 2px 8px rgba(255, 170, 51, 0.4);
      }
      .clocks-panel.theme-noir .clock-item {
        background: rgba(18, 18, 18, 0.97) !important;
        border: 1px solid rgba(255, 170, 51, 0.08) !important;
        color: #ffaa33 !important;
      }
      
      /* 11. Retro CRT */
      .clocks-panel.theme-crt {
        font-family: 'Courier New', Courier, monospace !important;
        border: 2px solid #33ff33 !important;
        box-shadow: 0 0 25px rgba(51, 255, 51, 0.3), inset 0 0 25px rgba(51, 255, 51, 0.1) !important;
        position: relative;
        overflow: hidden;
      }
      .clocks-panel.theme-crt::after {
        content: " ";
        display: block;
        position: absolute;
        top: 0; left: 0; bottom: 0; right: 0;
        background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.2) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
        background-size: 100% 4px, 3px 100%;
        pointer-events: none;
        z-index: 999;
      }
      .clocks-panel.theme-crt .panel-header {
        background: rgba(51, 255, 51, 0.1) !important;
        border-color: rgba(51, 255, 51, 0.3) !important;
        color: #33ff33 !important;
        text-shadow: 0 0 6px rgba(51, 255, 51, 0.6) !important;
      }
      .clocks-panel.theme-crt .clock-item {
        background: rgba(6, 20, 6, 0.95) !important;
        border: 1px solid rgba(51, 255, 51, 0.25) !important;
        color: #33ff33 !important;
        text-shadow: 0 0 8px rgba(51, 255, 51, 0.7) !important;
      }

      /* 12. Observatory */
      .clocks-panel.theme-observatory {
        font-family: 'Times New Roman', Times, serif !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        border-radius: 40px !important;
        box-shadow: 0 20px 60px rgba(0,0,0,0.6) !important;
      }
      .clocks-panel.theme-observatory .panel-header {
        background: rgba(255, 255, 255, 0.06) !important;
        border-color: rgba(255, 255, 255, 0.15) !important;
        color: #e0e0ff !important;
      }
      .clocks-panel.theme-observatory .clock-item {
        background: rgba(14, 18, 28, 0.94) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 50% / 15px !important;
        color: #d0d0ff !important;
      }

      /* 13. Minimal Zen */
      .clocks-panel.theme-zen {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        background: rgba(255, 255, 255, 0.02) !important;
        backdrop-filter: blur(4px) saturate(100%) !important;
        -webkit-backdrop-filter: blur(4px) saturate(100%) !important;
        border: 1px solid rgba(255, 255, 255, 0.04) !important;
        box-shadow: none !important;
      }
      .clocks-panel.theme-zen .panel-header {
        background: transparent !important;
        border: none !important;
        color: rgba(255, 255, 255, 0.4) !important;
        font-weight: 200 !important;
        letter-spacing: 0.3em !important;
      }
      .clocks-panel.theme-zen .clock-item {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        color: rgba(255, 255, 255, 0.85) !important;
      }
    `;

    // Create full-screen overlay wrapper
    var overlay = document.createElement('div');
    overlay.id = 'sh-world-clock-hud';
    overlay.style.cssText = "position: absolute !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; display: grid !important; grid-template-columns: repeat(3, 1fr) !important; grid-template-rows: repeat(3, 1fr) !important; pointer-events: none !important; z-index: 9999 !important; padding: 24px !important; box-sizing: border-box !important;";
    
    // Create clocks panel
    var panel = document.createElement('div');
    panel.className = 'clocks-panel';
    
    // Premium dark-glassmorphic style defaults
    Object.assign(panel.style, {
      pointerEvents: 'auto',
      backdropFilter: 'blur(20px) saturate(120%)',
      WebkitBackdropFilter: 'blur(20px) saturate(120%)',
      webkitBackdropFilter: 'blur(20px) saturate(120%)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '24px',
      padding: '24px 36px',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
      minHeight: '200px',
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
      ">
        WORLD TIME MONITOR
      </div>
      <div class="clocks-list" style="
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 20px;
        width: 100%;
      ">
        <!-- Rendered Clocks -->
      </div>
    `;

    // Explicitly verify the panel is being appended correctly to the overlay wrapper
    overlay.appendChild(panel);
    if (!overlay.contains(panel)) {
      console.error('HUD: Failed to append clocks panel to overlay wrapper.');
    }

    container.appendChild(overlay);
    state.overlayElement = overlay;

    // Apply positioning & glass styles
    window.WorldClockHUD._updatePositionAndGlass();
    
    // Draw initial clocks DOM structure
    window.WorldClockHUD._updateDOM();
    
    // Start interval
    window.WorldClockHUD._startTicker();

    var currentSector = state.settings ? state.settings.sector : 5;
    console.log("HUD: Mounted to sector", currentSector);
  } catch (err) {
    console.error("HUD Mount Error:", err);
    // Emergency visible error block
    var errDiv = document.createElement('div');
    errDiv.style.cssText = "position:absolute; top:20px; left:20px; background:red; color:white; z-index:99999; padding:20px; font-family:monospace;";
    errDiv.innerText = "HUD Mount Crash: " + err.message;
    document.body.appendChild(errDiv);
  }
};

window.WorldClockHUD.update = function(newSettings) {
  var state = window.WorldClockHUD._state;
  if (!state.settings) return;
  
  var requiresRebuild = newSettings && (
    newSettings.capitals !== undefined || 
    newSettings.timezones !== undefined || 
    newSettings.displayType !== undefined
  );

  state.settings = Object.assign({}, state.settings, newSettings || {});
  window.WorldClockHUD._resolveTimezones();

  if (requiresRebuild && state.overlayElement) {
    var listContainer = state.overlayElement.querySelector('.clocks-list');
    if (listContainer) {
      listContainer.innerHTML = '';
    }
  }

  // Adjust timing rate if operational modes are selected
  if (requiresRebuild) {
    window.WorldClockHUD._startTicker();
  }

  window.WorldClockHUD._updatePositionAndGlass();
  window.WorldClockHUD._updateDOM();
  console.log("HUD: Updated settings:", newSettings);
};

window.WorldClockHUD.unmount = function() {
  window.WorldClockHUD._stopTicker();
  var state = window.WorldClockHUD._state;
  if (state.overlayElement) {
    state.overlayElement.remove();
    state.overlayElement = null;
  }
  console.log("HUD: Unmounted");
};

window.WorldClockHUD.destroy = function() {
  window.WorldClockHUD.unmount();
  var state = window.WorldClockHUD._state;
  state.containerSelector = null;
  state.settings = null;
  state.timezones = [];
  console.log("HUD: Destroyed");
};

// Module internal state stored under the global namespace
window.WorldClockHUD._state = {
  containerSelector: null,
  settings: null,
  timezones: [],
  overlayElement: null,
  updateIntervalId: null
};

// 3x3 Grid positioning style map (Sectors 1-3 top, Sectors 4-6 middle, Sectors 7-9 bottom)
window.WorldClockHUD._sectorStyles = {
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

window.WorldClockHUD._capitalTimezones = {
  'Copenhagen': 'Europe/Copenhagen',
  'Tokyo': 'Asia/Tokyo',
  'New York': 'America/New_York',
  'London': 'Europe/London',
  'Singapore': 'Asia/Singapore',
  'Sydney': 'Australia/Sydney',
  'Los Angeles': 'America/Los_Angeles',
  'Dubai': 'Asia/Dubai',
  'Paris': 'Europe/Paris',
  'Berlin': 'Europe/Berlin'
};

window.WorldClockHUD._resolveTimezones = function() {
  var state = window.WorldClockHUD._state;
  var dict = window.WorldClockHUD._capitalTimezones;
  var capitals = Array.isArray(state.settings.capitals) ? state.settings.capitals : [];
  
  // Clamp length to 1-9
  if (capitals.length > 9) {
    capitals = capitals.slice(0, 9);
  }
  
  if (capitals.length > 0) {
    state.timezones = capitals.map(function(cap) {
      return {
        label: cap,
        zone: dict[cap] || 'UTC'
      };
    });
  } else if (Array.isArray(state.settings.timezones)) {
    state.timezones = state.settings.timezones.slice(0, 9);
  } else {
    state.timezones = [
      { label: 'Copenhagen', zone: 'Europe/Copenhagen' },
      { label: 'Tokyo', zone: 'Asia/Tokyo' },
      { label: 'New York', zone: 'America/New_York' }
    ];
  }
};

window.WorldClockHUD._updatePositionAndGlass = function() {
  var state = window.WorldClockHUD._state;
  var styles = window.WorldClockHUD._sectorStyles;
  if (!state.overlayElement || !state.settings) return;
  
  var panel = state.overlayElement.querySelector('.clocks-panel');
  if (!panel) return;

  var sector = (state.settings.sector >= 1 && state.settings.sector <= 9) ? Math.floor(state.settings.sector) : 5;
  var pos = styles[sector] || styles[5];

  panel.style.gridRow = pos.gridRow;
  panel.style.gridColumn = pos.gridColumn;
  panel.style.justifySelf = pos.justifySelf;
  panel.style.alignSelf = pos.alignSelf;

  // Apply glassOpacity Floor (True 0% fixes)
  var opacity = parseFloat(state.settings.glassOpacity);
  if (opacity === 0) {
    panel.style.setProperty('background', 'rgba(15, 18, 25, 0)', 'important');
    panel.style.setProperty('backdrop-filter', 'none', 'important');
    panel.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
    panel.style.setProperty('border-color', 'transparent', 'important');
    panel.style.setProperty('box-shadow', 'none', 'important');
  } else {
    panel.style.setProperty('background', 'rgba(15, 18, 25, ' + opacity + ')', 'important');
    panel.style.removeProperty('backdrop-filter');
    panel.style.removeProperty('-webkit-backdrop-filter');
    panel.style.removeProperty('border-color');
    panel.style.removeProperty('box-shadow');
  }
  panel.style.setProperty('color', '#ffffff', 'important');

  // Dynamic sizing based on clock counts
  var count = state.timezones ? state.timezones.length : 3;
  var maxWidth = '680px';
  if (count === 1) {
    maxWidth = '250px';
  } else if (count === 2) {
    maxWidth = '460px';
  } else {
    maxWidth = '680px';
  }
  panel.style.width = '100%';
  panel.style.maxWidth = maxWidth;

  // Set transform scales
  var scale = (state.settings.scale !== undefined) ? parseFloat(state.settings.scale) : 1.0;
  panel.style.transform = 'scale(' + scale + ')';
  panel.style.transformOrigin = 'center';

  // Dynamic theme class assignment
  panel.classList.forEach(function(cls) {
    if (cls.startsWith('theme-')) {
      panel.classList.remove(cls);
    }
  });
  var theme = state.settings.displayType || 'digital';
  panel.classList.add('theme-' + theme);
};

window.WorldClockHUD._startTicker = function() {
  window.WorldClockHUD._stopTicker();
  var state = window.WorldClockHUD._state;
  var interval = 1000;
  
  // Fast 50ms ticker for operational/smooth sweep updates
  if (state.settings && (state.settings.displayType === 'trading' || state.settings.displayType === 'analog')) {
    interval = 50;
  }
  
  state.updateIntervalId = setInterval(function() {
    window.WorldClockHUD._updateDOM();
  }, interval);
};

window.WorldClockHUD._stopTicker = function() {
  var state = window.WorldClockHUD._state;
  if (state.updateIntervalId) {
    clearInterval(state.updateIntervalId);
    state.updateIntervalId = null;
  }
};

window.WorldClockHUD._updateDOM = function() {
  var state = window.WorldClockHUD._state;
  if (!state.overlayElement || !state.settings) return;
  
  var listContainer = state.overlayElement.querySelector('.clocks-list');
  if (!listContainer) return;

  var now = new Date();
  var displayType = state.settings.displayType || 'digital';

  var currentCount = listContainer.children.length;
  if (currentCount !== state.timezones.length) {
    listContainer.innerHTML = '';
    state.timezones.forEach(function(tz, index) {
      var clockItem = document.createElement('div');
      clockItem.className = 'clock-item';
      clockItem.setAttribute('data-index', index);
      
      Object.assign(clockItem.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minWidth: '170px',
        maxWidth: '220px',
        flex: '1 1 170px',
        padding: '16px',
        background: 'rgba(12, 14, 20, 0.88)', 
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        color: '#ffffff',
        boxSizing: 'border-box',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
      });

      clockItem.innerHTML = `
        <div class="clock-label" style="font-size: 11px; font-weight: 700; color: rgba(255, 255, 255, 0.65); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">
          ${tz.label}
        </div>
        <div class="clock-display-wrapper" style="
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100px;
          width: 100%;
        ">
          <!-- Rendered Display -->
        </div>
        <div class="clock-date" style="font-size: 10px; font-weight: 600; color: rgba(255, 255, 255, 0.45); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 8px;">
          --
        </div>
      `;
      listContainer.appendChild(clockItem);
    });
  }

  state.timezones.forEach(function(tz, index) {
    var clockItem = listContainer.querySelector('.clock-item[data-index="' + index + '"]');
    if (!clockItem) return;

    var displayWrapper = clockItem.querySelector('.clock-display-wrapper');
    var dateEl = clockItem.querySelector('.clock-date');

    var timeParts = null;
    try {
      var formatter = new Intl.DateTimeFormat(state.settings.locale || 'en-US', {
        timeZone: tz.zone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: 'short',
        weekday: 'short',
        hour12: false
      });

      var parts = formatter.formatToParts(now);
      timeParts = parts.reduce(function(acc, part) {
        acc[part.type] = part.value;
        return acc;
      }, {});
    } catch (err) {
      if (displayWrapper) {
        displayWrapper.innerHTML = '<span style="color: #ff453a; font-size: 11px;">TIMEZONE ERR</span>';
      }
      return;
    }

    if (!timeParts) return;

    if (dateEl) {
      dateEl.textContent = timeParts.weekday + ', ' + timeParts.month + ' ' + timeParts.day;
    }

    var hrs = parseInt(timeParts.hour, 10);
    var mins = parseInt(timeParts.minute, 10);
    var secs = parseInt(timeParts.second, 10);
    var ms = now.getMilliseconds();

    // Clean up theme-specific injects if not in transit mode
    var routeBar = clockItem.querySelector('.metro-route-bar');
    if (displayType === 'metro') {
      if (!routeBar) {
        routeBar = document.createElement('div');
        routeBar.className = 'metro-route-bar';
        clockItem.appendChild(routeBar);
      }
      var metroColors = ['#ff2d55', '#007aff', '#4cd964', '#ffcc00', '#5856d6', '#ff9500', '#5ac8fa', '#8e8e93', '#34aadc'];
      routeBar.style.background = metroColors[index % metroColors.length];
    } else {
      if (routeBar) {
        routeBar.remove();
      }
    }

    // 1. Analog Sweep Mode
    if (displayType === 'analog') {
      var svg = displayWrapper.querySelector('svg');
      if (!svg) {
        displayWrapper.innerHTML = `
          <svg viewBox="0 0 100 100" width="90" height="90" style="display: block;">
            <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(255, 255, 255, 0.15)" stroke-width="2" />
            <circle cx="50" cy="50" r="44" fill="rgba(0, 0, 0, 0.2)" />
            <line x1="50" y1="8" x2="50" y2="13" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
            <line x1="92" y1="50" x2="87" y2="50" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
            <line x1="50" y1="92" x2="50" y2="87" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
            <line x1="8" y1="50" x2="13" y2="50" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
            <line class="h-hand" x1="50" y1="50" x2="50" y2="28" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
            <line class="m-hand" x1="50" y1="50" x2="50" y2="18" stroke="rgba(255, 255, 255, 0.85)" stroke-width="2" stroke-linecap="round" />
            <line class="s-hand" x1="50" y1="50" x2="50" y2="12" stroke="#ff453a" stroke-width="1.2" stroke-linecap="round" />
            <circle cx="50" cy="50" r="3.5" fill="#ffffff" />
          </svg>
        `;
        svg = displayWrapper.querySelector('svg');
      }

      var hHand = svg.querySelector('.h-hand');
      var mHand = svg.querySelector('.m-hand');
      var sHand = svg.querySelector('.s-hand');

      // True smooth sweep math
      var sAngle = (secs + ms / 1000) * 6;
      var mAngle = mins * 6 + secs * 0.1;
      var hAngle = (hrs % 12) * 30 + mins * 0.5;

      hHand.setAttribute('transform', 'rotate(' + hAngle + ', 50, 50)');
      mHand.setAttribute('transform', 'rotate(' + mAngle + ', 50, 50)');
      sHand.setAttribute('transform', 'rotate(' + sAngle + ', 50, 50)');

    // 2. Airport Flip Mode (Refactored non-overlapping layout)
    } else if (displayType === 'flip') {
      var hStr = timeParts.hour;
      var mStr = timeParts.minute;
      var sStr = timeParts.second;

      if (!displayWrapper.querySelector('.flip-clock-wrapper')) {
        displayWrapper.innerHTML = `
          <div class="flip-clock-wrapper" style="display: flex; flex-direction: row; flex-wrap: nowrap; justify-content: center; align-items: center;">
            <div class="flap f-h1">0</div>
            <div class="flap f-h2">0</div>
            <div style="font-size: 20px; font-weight: bold; color: rgba(255, 255, 255, 0.4); padding: 0 4px; display: inline-flex; align-items: center; justify-content: center;">:</div>
            <div class="flap f-m1">0</div>
            <div class="flap f-m2">0</div>
            <div style="font-size: 20px; font-weight: bold; color: rgba(255, 255, 255, 0.4); padding: 0 4px; display: inline-flex; align-items: center; justify-content: center;">:</div>
            <div class="flap f-s1">0</div>
            <div class="flap f-s2">0</div>
          </div>
          <style>
            .flap {
              display: inline-flex !important;
              justify-content: center !important;
              align-items: center !important;
              min-width: 28px !important;
              height: 45px !important;
              position: relative !important;
              margin: 0 2px !important;
              font-family: 'SF Mono', Consolas, monospace !important;
              font-size: 24px !important;
              font-weight: bold !important;
              background: #111 !important;
              color: #fff !important;
              border-radius: 4px !important;
              border: 1px solid rgba(255, 255, 255, 0.15) !important;
              box-shadow: inset 0 -12px 12px rgba(0, 0, 0, 0.7), 0 3px 6px rgba(0, 0, 0, 0.5) !important;
              overflow: hidden !important;
              white-space: nowrap !important;
            }
            .flap::after {
              content: '';
              position: absolute;
              left: 0;
              top: 50%;
              width: 100%;
              height: 1px;
              background: rgba(0, 0, 0, 0.85);
              box-shadow: 0 1px 0 rgba(255, 255, 255, 0.1);
              z-index: 2;
            }
          </style>
        `;
      }

      var fH1 = displayWrapper.querySelector('.f-h1');
      var fH2 = displayWrapper.querySelector('.f-h2');
      var fM1 = displayWrapper.querySelector('.f-m1');
      var fM2 = displayWrapper.querySelector('.f-m2');
      var fS1 = displayWrapper.querySelector('.f-s1');
      var fS2 = displayWrapper.querySelector('.f-s2');

      if (fH1.textContent !== hStr[0]) fH1.textContent = hStr[0];
      if (fH2.textContent !== hStr[1]) fH2.textContent = hStr[1];
      if (fM1.textContent !== mStr[0]) fM1.textContent = mStr[0];
      if (fM2.textContent !== mStr[1]) fM2.textContent = mStr[1];
      if (fS1.textContent !== sStr[0]) fS1.textContent = sStr[0];
      if (fS2.textContent !== sStr[1]) fS2.textContent = sStr[1];

    // 3. Trading Floor Mode (millisecond sweep + accent markers)
    } else if (displayType === 'trading') {
      var msStr = String(ms).padStart(3, '0');
      var accentColor = (secs % 2 === 0) ? '#00ff66' : '#ff453a';
      var direction = (secs % 2 === 0) ? '▲' : '▼';
      displayWrapper.innerHTML = `
        <div style="
          font-family: 'SF Mono', Consolas, monospace;
          font-size: 24px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: #ffffff;
          letter-spacing: 0.05em;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        ">
          <div>
            ${timeParts.hour}:${timeParts.minute}:${timeParts.second}<span style="font-size: 16px; color: rgba(255,255,255,0.5);">.${msStr}</span>
          </div>
          <div style="font-size: 10px; color: ${accentColor}; font-weight: 800; letter-spacing: 0.05em;">
            TICK: ${direction} SEC_SYNC
          </div>
        </div>
      `;

    // 4. Mission Control Mode (NASA telemetry metadata)
    } else if (displayType === 'mission') {
      var gridSectors = ['A-1', 'B-3', 'C-2', 'D-4', 'A-3', 'B-1', 'C-4', 'D-2', 'E-5'];
      var chosenSector = gridSectors[index % gridSectors.length];
      var hexSequence = '0x' + (Math.floor(now.getTime() / 1000) % 65536).toString(16).toUpperCase().padStart(4, '0');
      var telemetryText = `SYS_OK // SEQ ${hexSequence} // GRID ${chosenSector}`;

      displayWrapper.innerHTML = `
        <div style="
          font-family: 'Courier New', Courier, monospace;
          font-size: 26px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: #33b5ff;
          letter-spacing: 0.08em;
          text-align: center;
        ">
          ${timeParts.hour}:${timeParts.minute}:${timeParts.second}
          <div style="font-size: 9px; color: rgba(51, 181, 255, 0.55); font-weight: 600; letter-spacing: 0.05em; margin-top: 6px; font-family: monospace;">
            ${telemetryText}
          </div>
        </div>
      `;

    // 5. Maritime Chronometer Mode (radar-green + head heading degrees)
    } else if (displayType === 'maritime') {
      displayWrapper.innerHTML = `
        <div style="
          font-family: 'Courier New', Courier, monospace;
          font-size: 24px;
          color: #00ffff;
          text-shadow: 0 0 6px rgba(0, 255, 255, 0.6);
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100px;
          height: 100px;
        ">
          <svg viewBox="0 0 100 100" width="90" height="90" style="position: absolute; pointer-events: none; opacity: 0.2;">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#00ffff" stroke-width="1" />
            <line x1="50" y1="5" x2="50" y2="10" stroke="#00ffff" stroke-width="1" />
            <line x1="95" y1="50" x2="90" y2="50" stroke="#00ffff" stroke-width="1" />
            <line x1="50" y1="95" x2="50" y2="90" stroke="#00ffff" stroke-width="1" />
            <line x1="5" y1="50" x2="10" y2="50" stroke="#00ffff" stroke-width="1" />
          </svg>
          <div style="font-weight: bold; position: relative; z-index: 10;">
            ${timeParts.hour}:${timeParts.minute}:${timeParts.second}
          </div>
          <div style="font-size: 8px; color: rgba(0, 255, 255, 0.55); font-weight: bold; margin-top: 4px; z-index: 10;">
            HDG: ${(index * 45 + secs) % 360}°
          </div>
        </div>
      `;

    // 6. Metro Transit Mode (heavy Compressed transit style)
    } else if (displayType === 'metro') {
      var routeLetter = String.fromCharCode(65 + index);
      var colors = ['#ff2d55', '#007aff', '#4cd964', '#ffcc00', '#5856d6', '#ff9500'];
      var transitColor = colors[index % colors.length];
      displayWrapper.innerHTML = `
        <div style="
          font-family: 'Impact', 'Arial Black', sans-serif;
          font-size: 34px;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: 0.02em;
          text-align: center;
          line-height: 1;
        ">
          ${timeParts.hour}:${timeParts.minute}:${timeParts.second}
          <div style="font-size: 10px; color: ${transitColor}; font-weight: 900; letter-spacing: 0.1em; margin-top: 4px;">
            ROUTE ${routeLetter} EXP
          </div>
        </div>
      `;

    // 7. Observatory Mode (silver circular star rings)
    } else if (displayType === 'observatory') {
      displayWrapper.innerHTML = `
        <div style="
          font-family: 'Times New Roman', Times, serif;
          font-size: 26px;
          color: #e0e0ff;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100px;
          height: 100px;
        ">
          <svg viewBox="0 0 100 100" width="90" height="90" style="position: absolute; pointer-events: none; opacity: 0.15;">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#ffffff" stroke-width="0.5" />
            <circle cx="50" cy="50" r="30" fill="none" stroke="#ffffff" stroke-width="0.5" />
            <line x1="50" y1="5" x2="50" y2="95" stroke="#ffffff" stroke-width="0.5" />
            <line x1="5" y1="50" x2="95" y2="50" stroke="#ffffff" stroke-width="0.5" />
            <path d="M 15 30 A 40 40 0 0 1 85 30" fill="none" stroke="#ffffff" stroke-width="0.5" stroke-dasharray="1 1" />
          </svg>
          <span style="position: relative; z-index: 10; font-weight: bold; letter-spacing: 0.05em;">
            ${timeParts.hour}:${timeParts.minute}<span style="font-size: 16px; color: rgba(224, 224, 255, 0.55);">${timeParts.second}</span>
          </span>
        </div>
      `;

    // 8. Retro CRT Mode
    } else if (displayType === 'crt') {
      displayWrapper.innerHTML = `
        <div style="
          font-family: 'Courier New', Courier, monospace;
          font-size: 28px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: #33ff33;
          letter-spacing: 0.08em;
        ">
          ${timeParts.hour}:${timeParts.minute}:${timeParts.second}
        </div>
      `;

    // 9. Minimal Zen Mode
    } else if (displayType === 'zen') {
      displayWrapper.innerHTML = `
        <div style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 32px;
          font-weight: 100;
          color: rgba(255, 255, 255, 0.85);
          letter-spacing: 0.08em;
        ">
          ${timeParts.hour}:${timeParts.minute}:${timeParts.second}
        </div>
      `;

    // 10. Executive Boardroom Mode
    } else if (displayType === 'boardroom') {
      displayWrapper.innerHTML = `
        <div style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 30px;
          font-weight: 200;
          color: #ffffff;
          letter-spacing: -0.01em;
        ">
          ${timeParts.hour}:${timeParts.minute}:${timeParts.second}
        </div>
      `;

    // 11. Luxury Hotel Mode
    } else if (displayType === 'hotel') {
      displayWrapper.innerHTML = `
        <div style="
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 28px;
          color: #f3e5ab;
          text-shadow: 0 1px 6px rgba(212, 175, 55, 0.4);
          letter-spacing: 0.05em;
        ">
          ${timeParts.hour}:${timeParts.minute}:${timeParts.second}
        </div>
      `;

    // 12. Noir Cinema Mode
    } else if (displayType === 'noir') {
      displayWrapper.innerHTML = `
        <div style="
          font-family: 'Georgia', serif;
          font-size: 28px;
          color: #ffaa33;
          text-shadow: 0 2px 10px rgba(255, 170, 51, 0.5);
        ">
          ${timeParts.hour}:${timeParts.minute}:${timeParts.second}
        </div>
      `;

    // 13. Digital Standard (Default fallback)
    } else {
      displayWrapper.innerHTML = `
        <div style="
          font-family: 'SF Mono', Consolas, monospace;
          font-size: 30px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: #ffffff;
          letter-spacing: 0.08em;
          text-shadow: 0 0 10px rgba(255,255,255,0.2);
        ">
          ${timeParts.hour}:${timeParts.minute}:${timeParts.second}
        </div>
      `;
    }
  });
};
