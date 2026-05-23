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

    // Create full-screen overlay wrapper
    var overlay = document.createElement('div');
    overlay.id = 'sh-world-clock-hud';
    overlay.style.cssText = "position: absolute !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; display: grid !important; grid-template-columns: repeat(3, 1fr) !important; grid-template-rows: repeat(3, 1fr) !important; pointer-events: none !important; z-index: 9999 !important; padding: 24px !important; box-sizing: border-box !important;";
    
    // Create clocks panel
    var panel = document.createElement('div');
    panel.className = 'clocks-panel';
    
    // Premium dark-glassmorphic style
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

  panel.style.setProperty('background', 'rgba(15, 18, 25, ' + state.settings.glassOpacity + ')', 'important');
  panel.style.setProperty('color', '#ffffff', 'important');

  // Dynamically size based on number of clocks
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
};

window.WorldClockHUD._startTicker = function() {
  window.WorldClockHUD._stopTicker();
  var state = window.WorldClockHUD._state;
  state.updateIntervalId = setInterval(function() {
    window.WorldClockHUD._updateDOM();
  }, 1000);
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
  var displayType = state.settings.displayType;

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
        <div style="font-size: 11px; font-weight: 700; color: rgba(255, 255, 255, 0.65); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">
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

      var sAngle = secs * 6;
      var mAngle = mins * 6 + secs * 0.1;
      var hAngle = (hrs % 12) * 30 + mins * 0.5;

      hHand.setAttribute('transform', 'rotate(' + hAngle + ', 50, 50)');
      mHand.setAttribute('transform', 'rotate(' + mAngle + ', 50, 50)');
      sHand.setAttribute('transform', 'rotate(' + sAngle + ', 50, 50)');

    } else if (displayType === 'flip') {
      var hStr = timeParts.hour;
      var mStr = timeParts.minute;
      var sStr = timeParts.second;

      if (!displayWrapper.querySelector('.flip-clock-wrapper')) {
        displayWrapper.innerHTML = `
          <div class="flip-clock-wrapper" style="display: flex; align-items: center; gap: 3px;">
            <div class="flap f-h1">0</div>
            <div class="flap f-h2">0</div>
            <div style="font-size: 20px; font-weight: bold; color: rgba(255, 255, 255, 0.4); padding: 0 2px;">:</div>
            <div class="flap f-m1">0</div>
            <div class="flap f-m2">0</div>
            <div style="font-size: 20px; font-weight: bold; color: rgba(255, 255, 255, 0.4); padding: 0 2px;">:</div>
            <div class="flap f-s1">0</div>
            <div class="flap f-s2">0</div>
          </div>
          <style>
            .flap {
              position: relative;
              background: #0f1015;
              border: 1px solid rgba(255, 255, 255, 0.15);
              border-radius: 4px;
              width: 26px;
              height: 38px;
              display: flex;
              justify-content: center;
              align-items: center;
              font-family: 'SF Mono', Consolas, monospace;
              font-size: 22px;
              font-weight: 700;
              color: #ff9500;
              box-shadow: inset 0 -10px 10px rgba(0, 0, 0, 0.6), 0 3px 6px rgba(0, 0, 0, 0.5);
              overflow: hidden;
            }
            .flap::after {
              content: '';
              position: absolute;
              left: 0;
              top: 50%;
              width: 100%;
              height: 1px;
              background: rgba(0, 0, 0, 0.85);
              box-shadow: 0 1px 0 rgba(255, 255, 255, 0.15);
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

    } else {
      var timeStr = timeParts.hour + ':' + timeParts.minute + ':' + timeParts.second;
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
          ${timeStr}
        </div>
      `;
    }
  });
};
