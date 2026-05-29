window.WorldClockHUD = window.WorldClockHUD || {};

window.WorldClockHUD._instances = window.WorldClockHUD._instances || {};

window.WorldClockHUD._drawClock = function(canvas, hrs, mins, secs, ms) {
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var zoom = 1.0;
  try {
    var computedStyle = window.getComputedStyle(canvas);
    var zoomVal = computedStyle.getPropertyValue('--widget-zoom');
    if (zoomVal) {
      var parsed = parseFloat(zoomVal);
      if (!isNaN(parsed) && parsed > 0) {
        zoom = parsed;
      }
    }
  } catch (e) {}

  var dpr = window.devicePixelRatio || 1;
  var displayWidth = 90;
  var displayHeight = 90;

  var scaledWidth = displayWidth * zoom;
  var scaledHeight = displayHeight * zoom;
  var backbufferWidth = Math.round(scaledWidth * dpr);
  var backbufferHeight = Math.round(scaledHeight * dpr);

  if (canvas.width !== backbufferWidth || canvas.height !== backbufferHeight) {
    canvas.width = backbufferWidth;
    canvas.height = backbufferHeight;
    canvas.style.width = scaledWidth + 'px';
    canvas.style.height = scaledHeight + 'px';
  }

  ctx.save();
  ctx.scale(dpr * zoom, dpr * zoom);
  ctx.clearRect(0, 0, displayWidth, displayHeight);

  var cx = displayWidth / 2;
  var cy = displayHeight / 2;

  // Face Background fill
  ctx.beginPath();
  ctx.arc(cx, cy, 44, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fill();

  // Outer circle bezel
  ctx.beginPath();
  ctx.arc(cx, cy, 47, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw major ticks (12, 3, 6, 9)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  // 12 o'clock
  ctx.beginPath();
  ctx.moveTo(cx, 8);
  ctx.lineTo(cx, 13);
  ctx.stroke();

  // 3 o'clock
  ctx.beginPath();
  ctx.moveTo(92, cy);
  ctx.lineTo(87, cy);
  ctx.stroke();

  // 6 o'clock
  ctx.beginPath();
  ctx.moveTo(cx, 92);
  ctx.lineTo(cx, 87);
  ctx.stroke();

  // 9 o'clock
  ctx.beginPath();
  ctx.moveTo(8, cy);
  ctx.lineTo(13, cy);
  ctx.stroke();

  // Ticks for other hours (subtler 5-minute ticks)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  var ticks = [30, 60, 120, 150, 210, 240, 300, 330];
  ticks.forEach(function(angleDeg) {
    var angleRad = angleDeg * Math.PI / 180;
    var startR = 41;
    var endR = 44;
    ctx.beginPath();
    ctx.moveTo(cx + startR * Math.cos(angleRad), cy + startR * Math.sin(angleRad));
    ctx.lineTo(cx + endR * Math.cos(angleRad), cy + endR * Math.sin(angleRad));
    ctx.stroke();
  });

  // Calculate hands rotation angles
  var sAngle = ((secs + ms / 1000) * 6 - 90) * Math.PI / 180;
  var mAngle = ((mins * 6 + secs * 0.1) - 90) * Math.PI / 180;
  var hAngle = (((hrs % 12) * 30 + mins * 0.5) - 90) * Math.PI / 180;

  // Hour hand
  ctx.beginPath();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + 22 * Math.cos(hAngle), cy + 22 * Math.sin(hAngle));
  ctx.stroke();

  // Minute hand
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2;
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + 32 * Math.cos(mAngle), cy + 32 * Math.sin(mAngle));
  ctx.stroke();

  // Second hand (smooth sweep)
  ctx.beginPath();
  ctx.strokeStyle = '#ff453a';
  ctx.lineWidth = 1.2;
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + 38 * Math.cos(sAngle), cy + 38 * Math.sin(sAngle));
  ctx.stroke();

  // Center pin
  ctx.beginPath();
  ctx.arc(cx, cy, 3.5, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.restore();
};

window.WorldClockHUD._getInstance = function(containerSelector) {
  var selector = containerSelector || (window.WorldClockHUD._state && window.WorldClockHUD._state.containerSelector) || '#hud-container';
  window.WorldClockHUD._instances = window.WorldClockHUD._instances || {};
  if (!window.WorldClockHUD._instances[selector]) {
    var defaultSettings = {
      displayType: 'digital',
      capitals: ['Copenhagen', 'Tokyo', 'New York'],
      sector: 5,
      glassOpacity: 0.8,
      scale: 1.0,
      locale: 'en-US'
    };
    window.WorldClockHUD._instances[selector] = {
      containerSelector: selector,
      settings: defaultSettings,
      timezones: [],
      overlayElement: null,
      updateIntervalId: null
    };
    window.WorldClockHUD._resolveTimezones(selector);
  }
  return window.WorldClockHUD._instances[selector];
};

window.WorldClockHUD.init = function(options) {
  try {
    options = options || {};
    var containerSelector = options.container || '#hud-container';
    
    var defaultSettings = {
      displayType: 'digital',
      capitals: ['Copenhagen', 'Tokyo', 'New York'],
      sector: 5,
      glassOpacity: 0.8,
      scale: 1.0,
      locale: 'en-US'
    };
    
    var instance = {
      containerSelector: containerSelector,
      settings: Object.assign({}, defaultSettings, options.settings || {}),
      timezones: [],
      overlayElement: null,
      updateIntervalId: null
    };
    
    window.WorldClockHUD._instances = window.WorldClockHUD._instances || {};
    window.WorldClockHUD._instances[containerSelector] = instance;
    window.WorldClockHUD._state = instance;
    
    window.WorldClockHUD._resolveTimezones(containerSelector);
    console.log("HUD: Initialized for " + containerSelector);
  } catch (err) {
    console.error("HUD Init Error:", err);
  }
};

window.WorldClockHUD.mount = function(containerSelector) {
  try {
    var instance = window.WorldClockHUD._getInstance(containerSelector);
    var container = document.querySelector(instance.containerSelector) || document.body;
    
    if (!container) {
      throw new Error("Target container not found: " + instance.containerSelector);
    }

    // Clean up any existing panel to prevent duplicates
    var existingPanel = container.querySelector('.clocks-panel');
    if (existingPanel) {
      existingPanel.remove();
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
      .clocks-panel .clock-item {
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        flex: 1 1 calc(150px * var(--widget-zoom, 1.0)) !important;
        min-width: calc(120px * var(--widget-zoom, 1.0)) !important;
        max-width: calc(240px * var(--widget-zoom, 1.0)) !important;
        height: calc(180px * var(--widget-zoom, 1.0)) !important;
        min-height: calc(180px * var(--widget-zoom, 1.0)) !important;
        max-height: calc(180px * var(--widget-zoom, 1.0)) !important;
        margin: 0 !important;
      }
      
      /* 4. Executive Boardroom */
      .clocks-panel.theme-boardroom {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        border: calc(1px * var(--widget-zoom, 1.0)) solid rgba(255, 255, 255, 0.08) !important;
        box-shadow: 0 calc(30px * var(--widget-zoom, 1.0)) calc(70px * var(--widget-zoom, 1.0)) rgba(0, 0, 0, 0.7) !important;
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
        border: calc(1px * var(--widget-zoom, 1.0)) solid rgba(255, 255, 255, 0.05) !important;
        border-radius: calc(8px * var(--widget-zoom, 1.0)) !important;
      }

      /* 5. Luxury Hotel */
      .clocks-panel.theme-hotel {
        font-family: 'Georgia', 'Times New Roman', serif !important;
        border: calc(1px * var(--widget-zoom, 1.0)) solid rgba(212, 175, 55, 0.4) !important;
        box-shadow: 0 calc(20px * var(--widget-zoom, 1.0)) calc(50px * var(--widget-zoom, 1.0)) rgba(35, 25, 15, 0.6), inset 0 0 calc(30px * var(--widget-zoom, 1.0)) rgba(212, 175, 55, 0.08) !important;
      }
      .clocks-panel.theme-hotel .panel-header {
        background: rgba(212, 175, 55, 0.12) !important;
        border-color: rgba(212, 175, 55, 0.4) !important;
        color: #e5c158 !important;
        font-weight: 400 !important;
        letter-spacing: 0.25em !important;
        text-shadow: 0 calc(1px * var(--widget-zoom, 1.0)) calc(4px * var(--widget-zoom, 1.0)) rgba(0,0,0,0.5);
      }
      .clocks-panel.theme-hotel .clock-item {
        background: rgba(36, 30, 24, 0.96) !important;
        border: calc(1px * var(--widget-zoom, 1.0)) solid rgba(212, 175, 55, 0.18) !important;
        border-radius: calc(6px * var(--widget-zoom, 1.0)) !important;
        box-shadow: 0 calc(6px * var(--widget-zoom, 1.0)) calc(20px * var(--widget-zoom, 1.0)) rgba(0,0,0,0.3) !important;
      }
      .clocks-panel.theme-hotel .clock-item div {
        color: #f3e5ab !important;
      }

      /* 6. Trading Floor */
      .clocks-panel.theme-trading {
        font-family: 'SF Mono', Consolas, monospace !important;
        border: calc(1px * var(--widget-zoom, 1.0)) solid rgba(0, 255, 150, 0.3) !important;
      }
      .clocks-panel.theme-trading .panel-header {
        background: rgba(0, 255, 100, 0.08) !important;
        border-color: rgba(0, 255, 100, 0.25) !important;
        color: #00ff66 !important;
        text-shadow: 0 0 calc(10px * var(--widget-zoom, 1.0)) rgba(0, 255, 100, 0.4);
      }
      .clocks-panel.theme-trading .clock-item {
        background: #090c09 !important;
        border: calc(1px * var(--widget-zoom, 1.0)) solid rgba(0, 255, 100, 0.15) !important;
        border-radius: 0px !important;
      }

      /* 7. Mission Control */
      .clocks-panel.theme-mission {
        font-family: 'Courier New', Courier, monospace !important;
        border: calc(1px * var(--widget-zoom, 1.0)) solid rgba(0, 190, 255, 0.35) !important;
        border-radius: calc(6px * var(--widget-zoom, 1.0)) !important;
        position: relative;
      }
      .clocks-panel.theme-mission::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: radial-gradient(rgba(0,190,255,0.02) 1px, transparent 1px);
        background-size: calc(16px * var(--widget-zoom, 1.0)) calc(16px * var(--widget-zoom, 1.0));
        pointer-events: none;
        border-radius: calc(6px * var(--widget-zoom, 1.0));
      }
      .clocks-panel.theme-mission .panel-header {
        background: rgba(0, 150, 255, 0.1) !important;
        border-color: rgba(0, 150, 255, 0.3) !important;
        color: #33b5ff !important;
        font-family: 'Courier New', Courier, monospace !important;
      }
      .clocks-panel.theme-mission .clock-item {
        background: rgba(10, 16, 24, 0.95) !important;
        border: calc(1px * var(--widget-zoom, 1.0)) solid rgba(0, 150, 255, 0.2) !important;
        border-radius: calc(3px * var(--widget-zoom, 1.0)) !important;
      }

      /* 8. Maritime Chronometer */
      .clocks-panel.theme-maritime {
        font-family: system-ui, sans-serif !important;
        border: calc(2px * var(--widget-zoom, 1.0)) solid rgba(0, 220, 220, 0.35) !important;
        border-radius: calc(30px * var(--widget-zoom, 1.0)) !important;
      }
      .clocks-panel.theme-maritime .panel-header {
        background: rgba(0, 220, 220, 0.1) !important;
        border-color: rgba(0, 220, 220, 0.3) !important;
        color: #00e5e5 !important;
      }
      .clocks-panel.theme-maritime .clock-item {
        background: rgba(8, 20, 22, 0.96) !important;
        border: calc(1px * var(--widget-zoom, 1.0)) solid rgba(0, 220, 220, 0.2) !important;
        border-radius: calc(16px * var(--widget-zoom, 1.0)) !important;
        color: #00ffff !important;
        position: relative;
      }

      /* 9. Metro Transit */
      .clocks-panel.theme-metro {
        font-family: 'Impact', 'Helvetica Neue', Arial, sans-serif !important;
        border: calc(4px * var(--widget-zoom, 1.0)) solid #ffcc00 !important;
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
        border: calc(1px * var(--widget-zoom, 1.0)) solid #333333 !important;
        border-radius: 0px !important;
        position: relative;
        overflow: hidden;
        padding-top: calc(24px * var(--widget-zoom, 1.0)) !important;
      }
      .clocks-panel.theme-metro .metro-route-bar {
        position: absolute;
        top: 0; left: 0; right: 0;
        height: calc(8px * var(--widget-zoom, 1.0));
      }

      /* 10. Noir Cinema */
      .clocks-panel.theme-noir {
        font-family: 'Georgia', serif !important;
        border: calc(1px * var(--widget-zoom, 1.0)) solid rgba(255, 170, 51, 0.15) !important;
        box-shadow: 0 calc(40px * var(--widget-zoom, 1.0)) calc(80px * var(--widget-zoom, 1.0)) rgba(0, 0, 0, 0.9) !important;
      }
      .clocks-panel.theme-noir .panel-header {
        background: rgba(255, 170, 51, 0.08) !important;
        border-color: rgba(255, 170, 51, 0.2) !important;
        color: #ffaa33 !important;
        text-shadow: 0 calc(2px * var(--widget-zoom, 1.0)) calc(8px * var(--widget-zoom, 1.0)) rgba(255, 170, 51, 0.4);
      }
      .clocks-panel.theme-noir .clock-item {
        background: rgba(18, 18, 18, 0.97) !important;
        border: calc(1px * var(--widget-zoom, 1.0)) solid rgba(255, 170, 51, 0.08) !important;
        color: #ffaa33 !important;
      }
      
      /* 11. Retro CRT */
      .clocks-panel.theme-crt {
        font-family: 'Courier New', Courier, monospace !important;
        border: calc(2px * var(--widget-zoom, 1.0)) solid #33ff33 !important;
        box-shadow: 0 0 calc(25px * var(--widget-zoom, 1.0)) rgba(51, 255, 51, 0.3), inset 0 0 calc(25px * var(--widget-zoom, 1.0)) rgba(51, 255, 51, 0.1) !important;
        position: relative;
        overflow: hidden;
      }
      .clocks-panel.theme-crt::after {
        content: " ";
        display: block;
        position: absolute;
        top: 0; left: 0; bottom: 0; right: 0;
        background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.2) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
        background-size: 100% calc(4px * var(--widget-zoom, 1.0)), calc(3px * var(--widget-zoom, 1.0)) 100%;
        pointer-events: none;
        z-index: 999;
      }
      .clocks-panel.theme-crt .panel-header {
        background: rgba(51, 255, 51, 0.1) !important;
        border-color: rgba(51, 255, 51, 0.3) !important;
        color: #33ff33 !important;
        text-shadow: 0 0 calc(6px * var(--widget-zoom, 1.0)) rgba(51, 255, 51, 0.6) !important;
      }
      .clocks-panel.theme-crt .clock-item {
        background: rgba(6, 20, 6, 0.95) !important;
        border: calc(1px * var(--widget-zoom, 1.0)) solid rgba(51, 255, 51, 0.25) !important;
        color: #33ff33 !important;
        text-shadow: 0 0 calc(8px * var(--widget-zoom, 1.0)) rgba(51, 255, 51, 0.7) !important;
      }

      /* 12. Observatory */
      .clocks-panel.theme-observatory {
        font-family: 'Times New Roman', Times, serif !important;
        border: calc(1px * var(--widget-zoom, 1.0)) solid rgba(255, 255, 255, 0.2) !important;
        border-radius: calc(40px * var(--widget-zoom, 1.0)) !important;
        box-shadow: 0 calc(20px * var(--widget-zoom, 1.0)) calc(60px * var(--widget-zoom, 1.0)) rgba(0,0,0,0.6) !important;
      }
      .clocks-panel.theme-observatory .panel-header {
        background: rgba(255, 255, 255, 0.06) !important;
        border-color: rgba(255, 255, 255, 0.15) !important;
        color: #e0e0ff !important;
      }
      .clocks-panel.theme-observatory .clock-item {
        background: rgba(14, 18, 28, 0.94) !important;
        border: calc(1px * var(--widget-zoom, 1.0)) solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 50% / calc(15px * var(--widget-zoom, 1.0)) !important;
        color: #d0d0ff !important;
      }

      /* 13. Minimal Zen */
      .clocks-panel.theme-zen {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        background: rgba(255, 255, 255, 0.02) !important;
        backdrop-filter: blur(4px) saturate(100%) !important;
        -webkit-backdrop-filter: blur(4px) saturate(100%) !important;
        border: calc(1px * var(--widget-zoom, 1.0)) solid rgba(255, 255, 255, 0.04) !important;
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

    // Create clocks panel
    var panel = document.createElement('div');
    panel.className = 'clocks-panel';
    
    // Premium dark-glassmorphic style defaults
    Object.assign(panel.style, {
      pointerEvents: 'auto',
      boxSizing: 'border-box',
      transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      background: 'transparent',
      border: 'none',
      borderRadius: '0',
      padding: '0',
      boxShadow: 'none',
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none'
    });

    // Defensive visibility styling to prevent grid collapse
    panel.style.setProperty('visibility', 'visible', 'important');
    panel.style.setProperty('opacity', '1', 'important');
    panel.style.setProperty('z-index', '9999', 'important');
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.alignItems = 'center';
    panel.style.justifyContent = 'space-evenly';
    panel.style.width = 'fit-content';
    panel.style.maxWidth = '100%';
    panel.style.margin = '0 auto';

    panel.innerHTML = `
      <div class="panel-header" style="
        font-size: calc(11px * var(--widget-zoom, 1.0));
        line-height: calc(14px * var(--widget-zoom, 1.0));
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: calc(0.2em * var(--widget-zoom, 1.0));
        color: #ffffff;
        background: rgba(255, 255, 255, 0.12);
        padding: calc(6px * var(--widget-zoom, 1.0)) calc(16px * var(--widget-zoom, 1.0));
        border-radius: calc(20px * var(--widget-zoom, 1.0));
        border: calc(1px * var(--widget-zoom, 1.0)) solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 calc(4px * var(--widget-zoom, 1.0)) calc(10px * var(--widget-zoom, 1.0)) rgba(0, 0, 0, 0.25);
        text-align: center;
        margin: 0 auto calc(20px * var(--widget-zoom, 1.0)) auto;
        width: fit-content;
        max-width: 100%;
        white-space: normal;
        word-wrap: break-word;
        text-align: center;
      ">
        WORLD TIME MONITOR
      </div>
      <div class="clocks-list" style="
        box-sizing: border-box !important;
      ">
        <!-- Rendered Clocks -->
      </div>
    `;

    container.appendChild(panel);
    instance.overlayElement = panel;

    // Apply positioning & glass styles
    window.WorldClockHUD._updatePositionAndGlass(instance.containerSelector);
    
    // Draw initial clocks DOM structure
    window.WorldClockHUD._updateDOM(instance.containerSelector);
    
    // Start interval
    window.WorldClockHUD._startTicker(instance.containerSelector);

    console.log("HUD: Mounted to " + instance.containerSelector);
  } catch (err) {
    console.error("HUD Mount Error:", err);
  }
};

window.WorldClockHUD.update = function(arg1, arg2) {
  // Support reversed argument signatures dynamically
  var newSettings, containerSelector;
  if (typeof arg1 === 'string') {
    containerSelector = arg1;
    newSettings = arg2;
  } else {
    newSettings = arg1;
    containerSelector = arg2;
  }

  var instance = window.WorldClockHUD._getInstance(containerSelector);
  if (!instance.settings) return;
  
  var requiresRebuild = newSettings && (
    newSettings.capitals !== undefined || 
    newSettings.cities !== undefined || 
    newSettings.timezones !== undefined || 
    newSettings.displayType !== undefined
  );

  instance.settings = Object.assign({}, instance.settings, newSettings || {});
  window.WorldClockHUD._resolveTimezones(instance.containerSelector);

  if (requiresRebuild && instance.overlayElement) {
    var listContainer = instance.overlayElement.querySelector('.clocks-list');
    if (listContainer) {
      listContainer.innerHTML = '';
    }
  }

  if (requiresRebuild) {
    window.WorldClockHUD._startTicker(instance.containerSelector);
  }

  window.WorldClockHUD._updatePositionAndGlass(instance.containerSelector);
  window.WorldClockHUD._updateDOM(instance.containerSelector);
  console.log("HUD: Updated settings for " + instance.containerSelector + ":", newSettings);
};

window.WorldClockHUD.unmount = function(containerSelector) {
  var selector = containerSelector || (window.WorldClockHUD._state && window.WorldClockHUD._state.containerSelector) || '#hud-container';
  window.WorldClockHUD._stopTicker(selector);
  var instance = window.WorldClockHUD._instances[selector];
  if (instance && instance.overlayElement) {
    instance.overlayElement.remove();
    instance.overlayElement = null;
  }
  console.log("HUD: Unmounted " + selector);
};

window.WorldClockHUD.destroy = function(containerSelector) {
  var selector = containerSelector || (window.WorldClockHUD._state && window.WorldClockHUD._state.containerSelector) || '#hud-container';
  window.WorldClockHUD.unmount(selector);
  var instance = window.WorldClockHUD._instances[selector];
  if (instance) {
    instance.containerSelector = null;
    instance.settings = null;
    instance.timezones = [];
    delete window.WorldClockHUD._instances[selector];
  }
  console.log("HUD: Destroyed " + selector);
};

// Module internal state stored under the global namespace
window.WorldClockHUD._state = {
  containerSelector: null,
  settings: null,
  timezones: [],
  overlayElement: null,
  updateIntervalId: null
};

window.WorldClockHUD._capitalTimezones = {
  'LOCAL': 'LOCAL',
  'Copenhagen': 'Europe/Copenhagen',
  'Tokyo': 'Asia/Tokyo',
  'New York': 'America/New_York',
  'London': 'Europe/London',
  'Singapore': 'Asia/Singapore',
  'Sydney': 'Australia/Sydney',
  'Los Angeles': 'America/Los_Angeles',
  'Dubai': 'Asia/Dubai',
  'Paris': 'Europe/Paris',
  'Berlin': 'Europe/Berlin',
  'Hong Kong': 'Asia/Hong_Kong',
  'Seoul': 'Asia/Seoul',
  'Beijing': 'Asia/Shanghai',
  'Mumbai': 'Asia/Kolkata',
  'Bangkok': 'Asia/Bangkok',
  'Rome': 'Europe/Rome',
  'Madrid': 'Europe/Madrid',
  'Moscow': 'Europe/Moscow',
  'Zurich': 'Europe/Zurich',
  'Chicago': 'America/Chicago',
  'Toronto': 'America/Toronto',
  'Mexico City': 'America/Mexico_City',
  'Sao Paulo': 'America/Sao_Paulo',
  'Buenos Aires': 'America/Argentina/Buenos_Aires',
  'Auckland': 'Pacific/Auckland',
  'Cairo': 'Africa/Cairo',
  'Johannesburg': 'Africa/Johannesburg',
  'Nairobi': 'Africa/Nairobi'
};

window.WorldClockHUD._resolveTimezones = function(containerSelector) {
  var instance = window.WorldClockHUD._getInstance(containerSelector);
  var dict = window.WorldClockHUD._capitalTimezones;
  
  // Support both 'capitals' and 'cities' settings parameters
  var capitals = Array.isArray(instance.settings.capitals) ? instance.settings.capitals : 
                 (Array.isArray(instance.settings.cities) ? instance.settings.cities : []);
  
  // Clamp length to 1-9
  if (capitals.length > 9) {
    capitals = capitals.slice(0, 9);
  }
  
  if (capitals.length > 0) {
    instance.timezones = capitals.map(function(cap) {
      var cityName = typeof cap === 'object' ? (cap.name || 'UTC') : cap;
      var zone = 'UTC';
      if (cityName === 'LOCAL') {
        try {
          zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Copenhagen';
        } catch (e) {
          zone = 'Europe/Copenhagen';
        }
      } else {
        zone = dict[cityName] || 'UTC';
      }
      return {
        label: cityName === 'LOCAL' ? 'Local Time' : cityName,
        zone: zone
      };
    });
  } else if (Array.isArray(instance.settings.timezones)) {
    instance.timezones = instance.settings.timezones.slice(0, 9);
  } else {
    instance.timezones = [
      { label: 'Copenhagen', zone: 'Europe/Copenhagen' },
      { label: 'Tokyo', zone: 'Asia/Tokyo' },
      { label: 'New York', zone: 'America/New_York' }
    ];
  }
};

window.WorldClockHUD._updatePositionAndGlass = function(containerSelector) {
  var instance = window.WorldClockHUD._instances[containerSelector];
  if (!instance || !instance.overlayElement || !instance.settings) return;
  
  var panel = instance.overlayElement;
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.alignItems = 'center';
  panel.style.position = 'relative';
  panel.style.maxWidth = 'none';
  panel.style.maxHeight = 'none';
  panel.style.boxSizing = 'border-box';

  var fit = instance.settings.fitBehavior || 'auto';
  if (fit === 'auto') {
    var capitals = instance.settings.capitals || ['Copenhagen', 'Tokyo', 'New York'];
    var clockCount = capitals.length || 3;
    var baseWidth = 150 * clockCount + 16 * (clockCount - 1) + 48; // padding/gap buffer
    var baseHeight = 310; // safe base height for clock list + header
    panel.style.setProperty('width', 'calc(' + baseWidth + 'px * var(--widget-zoom, 1.0))', 'important');
    panel.style.setProperty('height', 'calc(' + baseHeight + 'px * var(--widget-zoom, 1.0))', 'important');
  } else {
    panel.style.setProperty('width', '100%', 'important');
    panel.style.setProperty('height', '100%', 'important');
  }

  // Make the panel transparent to let the wrapper's elevation-level-1 glass style render cleanly
  panel.classList.remove('elevation-level-0', 'elevation-level-1');
  panel.style.setProperty('background', 'transparent', 'important');
  panel.style.setProperty('border', 'none', 'important');
  panel.style.setProperty('box-shadow', 'none', 'important');
  panel.style.setProperty('backdrop-filter', 'none', 'important');
  panel.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
  panel.style.setProperty('color', '#ffffff', 'important');
  panel.style.setProperty('border-radius', '0', 'important');
  panel.style.setProperty('padding', '0', 'important');

  // Dynamic theme class assignment
  var classesToRemove = [];
  for (var i = 0; i < panel.classList.length; i++) {
    var cls = panel.classList.item(i);
    if (cls && cls.indexOf('theme-') === 0) {
      classesToRemove.push(cls);
    }
  }
  classesToRemove.forEach(function(c) { panel.classList.remove(c); });
  
  var theme = instance.settings.displayType || 'digital';
  panel.classList.add('theme-' + theme);
};

window.WorldClockHUD._startTicker = function(containerSelector) {
  var instance = window.WorldClockHUD._getInstance(containerSelector);
  window.WorldClockHUD._stopTicker(containerSelector);
  var interval = 1000;
  
  // Fast 50ms ticker for operational/smooth sweep updates
  if (instance.settings && (instance.settings.displayType === 'trading' || instance.settings.displayType === 'analog')) {
    interval = 50;
  }
  
  instance.updateIntervalId = setInterval(function() {
    window.WorldClockHUD._updateDOM(containerSelector);
  }, interval);
};

window.WorldClockHUD._stopTicker = function(containerSelector) {
  var instance = window.WorldClockHUD._getInstance(containerSelector);
  if (instance.updateIntervalId) {
    clearInterval(instance.updateIntervalId);
    instance.updateIntervalId = null;
  }
};

window.WorldClockHUD._updateDOM = function(containerSelector) {
  var instance = window.WorldClockHUD._getInstance(containerSelector);
  if (!instance.overlayElement || !instance.settings) return;
  
  var listContainer = instance.overlayElement.querySelector('.clocks-list');
  if (!listContainer) return;

  var tzCount = instance.timezones ? instance.timezones.length : 0;

  listContainer.style.display = 'flex';
  listContainer.style.flexDirection = 'row';
  listContainer.style.flexWrap = 'wrap';
  listContainer.style.justifyContent = 'space-evenly';
  listContainer.style.alignContent = 'space-evenly';
  listContainer.style.alignItems = 'center';
  listContainer.style.gap = 'calc(16px * var(--widget-zoom, 1.0))';
  listContainer.style.width = '100%';
  listContainer.style.boxSizing = 'border-box';

  // Update Custom Title if specified
  var titleElement = instance.overlayElement.querySelector('.panel-header');
  if (titleElement) {
    var defaultTitle = 'WORLD TIME MONITOR';
    var displayTitle = instance.settings.customTitle !== undefined ? instance.settings.customTitle : defaultTitle;
    if (displayTitle.trim() === '') {
      titleElement.style.display = 'none';
    } else {
      titleElement.style.display = 'block';
      titleElement.textContent = displayTitle;
    }
  }

  var now = new Date();
  var displayType = instance.settings.displayType || 'digital';

  var currentCount = listContainer.children.length;
  if (currentCount !== instance.timezones.length) {
    listContainer.innerHTML = '';
    instance.timezones.forEach(function(tz, index) {
      var clockItem = document.createElement('div');
      clockItem.className = 'clock-item elevation-level-2';
      clockItem.setAttribute('data-index', index);
      
      clockItem.style.display = 'flex';
      clockItem.style.flexDirection = 'column';
      clockItem.style.alignItems = 'center';
      clockItem.style.padding = 'calc(16px * var(--widget-zoom, 1.0))';
      clockItem.style.borderRadius = 'calc(16px * var(--widget-zoom, 1.0))';
      clockItem.style.color = '#ffffff';
      clockItem.style.boxSizing = 'border-box';

      clockItem.innerHTML = `
        <div class="clock-label" style="font-size: calc(11px * var(--widget-zoom, 1.0)); font-weight: 700; color: rgba(255, 255, 255, 0.65); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: calc(8px * var(--widget-zoom, 1.0));">
          ${tz.label}
        </div>
        <div class="clock-display-wrapper" style="
          display: flex;
          justify-content: center;
          align-items: center;
          height: calc(100px * var(--widget-zoom, 1.0));
          width: 100%;
        ">
          <!-- Rendered Display -->
        </div>
        <div class="clock-date" style="font-size: calc(10px * var(--widget-zoom, 1.0)); font-weight: 600; color: rgba(255, 255, 255, 0.45); text-transform: uppercase; letter-spacing: 0.08em; margin-top: calc(8px * var(--widget-zoom, 1.0));">
          --
        </div>
      `;
      listContainer.appendChild(clockItem);
    });
  }

  instance.timezones.forEach(function(tz, index) {
    var clockItem = listContainer.querySelector('.clock-item[data-index="' + index + '"]');
    if (!clockItem) return;

    var displayWrapper = clockItem.querySelector('.clock-display-wrapper');
    var dateEl = clockItem.querySelector('.clock-date');

    var timeParts = null;
    try {
      var formatter = new Intl.DateTimeFormat(instance.settings.locale || 'en-US', {
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
        displayWrapper.innerHTML = '<span style="color: #ff453a; font-size: calc(11px * var(--widget-zoom, 1.0));">TIMEZONE ERR</span>';
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
      var canvas = displayWrapper.querySelector('canvas');
      if (!canvas) {
        displayWrapper.innerHTML = '<canvas width="90" height="90" style="display: block; width: 90px; height: 90px;"></canvas>';
        canvas = displayWrapper.querySelector('canvas');
      }
      window.WorldClockHUD._drawClock(canvas, hrs, mins, secs, ms);

    // 2. Airport Flip Mode (Refactored non-overlapping HH:MM layout)
    } else if (displayType === 'flip') {
      var hStr = timeParts.hour;
      var mStr = timeParts.minute;

      if (!displayWrapper.querySelector('.flip-clock-wrapper')) {
        displayWrapper.innerHTML = `
          <div class="flip-clock-wrapper" style="display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; justify-content: center !important; align-items: center !important; width: 100% !important; white-space: nowrap !important;">
            <div class="flap f-h1">0</div>
            <div class="flap f-h2">0</div>
            <div class="flip-colon">:</div>
            <div class="flap f-m1">0</div>
            <div class="flap f-m2">0</div>
          </div>
          <style>
            .flap {
              display: inline-flex !important;
              justify-content: center !important;
              align-items: center !important;
              min-width: calc(32px * var(--widget-zoom, 1.0)) !important;
              max-width: calc(38px * var(--widget-zoom, 1.0)) !important;
              height: calc(46px * var(--widget-zoom, 1.0)) !important;
              flex-shrink: 0 !important;
              margin: 0 calc(2px * var(--widget-zoom, 1.0)) !important;
              box-sizing: border-box !important;
              position: relative !important;
              font-family: 'SF Mono', Consolas, monospace !important;
              font-size: calc(24px * var(--widget-zoom, 1.0)) !important;
              font-weight: bold !important;
              background: #111 !important;
              color: #fff !important;
              border-radius: calc(4px * var(--widget-zoom, 1.0)) !important;
              border: 1px solid rgba(255, 255, 255, 0.15) !important;
              box-shadow: inset 0 calc(-12px * var(--widget-zoom, 1.0)) calc(12px * var(--widget-zoom, 1.0)) rgba(0, 0, 0, 0.7), 0 calc(3px * var(--widget-zoom, 1.0)) calc(6px * var(--widget-zoom, 1.0)) rgba(0, 0, 0, 0.5) !important;
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
            .flip-colon {
              display: inline-flex !important;
              justify-content: center !important;
              align-items: center !important;
              width: calc(14px * var(--widget-zoom, 1.0)) !important;
              flex-shrink: 0 !important;
              text-align: center !important;
              color: rgba(255,255,255,0.6) !important;
              font-size: calc(20px * var(--widget-zoom, 1.0)) !important;
              font-weight: bold !important;
            }
          </style>
        `;
      }

      var fH1 = displayWrapper.querySelector('.f-h1');
      var fH2 = displayWrapper.querySelector('.f-h2');
      var fM1 = displayWrapper.querySelector('.f-m1');
      var fM2 = displayWrapper.querySelector('.f-m2');

      if (fH1.textContent !== hStr[0]) fH1.textContent = hStr[0];
      if (fH2.textContent !== hStr[1]) fH2.textContent = hStr[1];
      if (fM1.textContent !== mStr[0]) fM1.textContent = mStr[0];
      if (fM2.textContent !== mStr[1]) fM2.textContent = mStr[1];

    // 3. Trading Floor Mode
    } else if (displayType === 'trading') {
      var msStr = String(ms).padStart(3, '0');
      var accentColor = (secs % 2 === 0) ? '#00ff66' : '#ff453a';
      var direction = (secs % 2 === 0) ? '▲' : '▼';
      displayWrapper.innerHTML = `
        <div style="
          font-family: 'SF Mono', Consolas, monospace;
          font-size: calc(24px * var(--widget-zoom, 1.0));
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: #ffffff;
          letter-spacing: 0.05em;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: calc(4px * var(--widget-zoom, 1.0));
        ">
          <div>
            ${timeParts.hour}:${timeParts.minute}:${timeParts.second}<span style="font-size: calc(16px * var(--widget-zoom, 1.0)); color: rgba(255,255,255,0.5);">.${msStr}</span>
          </div>
          <div style="font-size: calc(10px * var(--widget-zoom, 1.0)); color: ${accentColor}; font-weight: 800; letter-spacing: 0.05em;">
            TICK: ${direction} SEC_SYNC
          </div>
        </div>
      `;

    // 4. Mission Control Mode
    } else if (displayType === 'mission') {
      var gridSectors = ['A-1', 'B-3', 'C-2', 'D-4', 'A-3', 'B-1', 'C-4', 'D-2', 'E-5'];
      var chosenSector = gridSectors[index % gridSectors.length];
      var hexSequence = '0x' + (Math.floor(now.getTime() / 1000) % 65536).toString(16).toUpperCase().padStart(4, '0');
      var telemetryText = `SYS_OK // SEQ ${hexSequence} // GRID ${chosenSector}`;

      displayWrapper.innerHTML = `
        <div style="
          font-family: 'Courier New', Courier, monospace;
          font-size: calc(26px * var(--widget-zoom, 1.0));
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: #33b5ff;
          letter-spacing: 0.08em;
          text-align: center;
        ">
          ${timeParts.hour}:${timeParts.minute}:${timeParts.second}
          <div style="font-size: calc(9px * var(--widget-zoom, 1.0)); color: rgba(51, 181, 255, 0.55); font-weight: 600; letter-spacing: 0.05em; margin-top: calc(6px * var(--widget-zoom, 1.0)); font-family: monospace;">
            ${telemetryText}
          </div>
        </div>
      `;

    // 5. Maritime Chronometer Mode
    } else if (displayType === 'maritime') {
      displayWrapper.innerHTML = `
        <div style="
          font-family: 'Courier New', Courier, monospace;
          font-size: calc(24px * var(--widget-zoom, 1.0));
          color: #00ffff;
          text-shadow: 0 0 calc(6px * var(--widget-zoom, 1.0)) rgba(0, 255, 255, 0.6);
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: calc(100px * var(--widget-zoom, 1.0));
          height: calc(100px * var(--widget-zoom, 1.0));
        ">
          <svg viewBox="0 0 100 100" width="90" height="90" style="position: absolute; pointer-events: none; opacity: 0.2; width: calc(90px * var(--widget-zoom, 1.0)); height: calc(90px * var(--widget-zoom, 1.0));">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#00ffff" stroke-width="1" />
            <line x1="50" y1="5" x2="50" y2="10" stroke="#00ffff" stroke-width="1" />
            <line x1="95" y1="50" x2="90" y2="50" stroke="#00ffff" stroke-width="1" />
            <line x1="50" y1="95" x2="50" y2="90" stroke="#00ffff" stroke-width="1" />
            <line x1="5" y1="50" x2="10" y2="50" stroke="#00ffff" stroke-width="1" />
          </svg>
          <div style="font-weight: bold; position: relative; z-index: 10;">
            ${timeParts.hour}:${timeParts.minute}:${timeParts.second}
          </div>
          <div style="font-size: calc(8px * var(--widget-zoom, 1.0)); color: rgba(0, 255, 255, 0.55); font-weight: bold; margin-top: calc(4px * var(--widget-zoom, 1.0)); z-index: 10;">
            HDG: ${(index * 45 + secs) % 360}°
          </div>
        </div>
      `;

    // 6. Metro Transit Mode
    } else if (displayType === 'metro') {
      var routeLetter = String.fromCharCode(65 + index);
      var colors = ['#ff2d55', '#007aff', '#4cd964', '#ffcc00', '#5856d6', '#ff9500'];
      var transitColor = colors[index % colors.length];
      displayWrapper.innerHTML = `
        <div style="
          font-family: 'Impact', 'Arial Black', sans-serif;
          font-size: calc(34px * var(--widget-zoom, 1.0));
          font-weight: 900;
          color: #ffffff;
          letter-spacing: 0.02em;
          text-align: center;
          line-height: 1;
        ">
          ${timeParts.hour}:${timeParts.minute}:${timeParts.second}
          <div style="font-size: calc(10px * var(--widget-zoom, 1.0)); color: ${transitColor}; font-weight: 900; letter-spacing: 0.1em; margin-top: calc(4px * var(--widget-zoom, 1.0));">
            ROUTE ${routeLetter} EXP
          </div>
        </div>
      `;

    // 7. Observatory Mode
    } else if (displayType === 'observatory') {
      displayWrapper.innerHTML = `
        <div style="
          font-family: 'Times New Roman', Times, serif;
          font-size: calc(26px * var(--widget-zoom, 1.0));
          color: #e0e0ff;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          width: calc(100px * var(--widget-zoom, 1.0));
          height: calc(100px * var(--widget-zoom, 1.0));
        ">
          <svg viewBox="0 0 100 100" width="90" height="90" style="position: absolute; pointer-events: none; opacity: 0.15; width: calc(90px * var(--widget-zoom, 1.0)); height: calc(90px * var(--widget-zoom, 1.0));">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#ffffff" stroke-width="0.5" />
            <circle cx="50" cy="50" r="30" fill="none" stroke="#ffffff" stroke-width="0.5" />
            <line x1="50" y1="5" x2="50" y2="95" stroke="#ffffff" stroke-width="0.5" />
            <line x1="5" y1="50" x2="95" y2="50" stroke="#ffffff" stroke-width="0.5" />
            <path d="M 15 30 A 40 40 0 0 1 85 30" fill="none" stroke="#ffffff" stroke-width="0.5" stroke-dasharray="1 1" />
          </svg>
          <span style="position: relative; z-index: 10; font-weight: bold; letter-spacing: 0.05em;">
            ${timeParts.hour}:${timeParts.minute}<span style="font-size: calc(16px * var(--widget-zoom, 1.0)); color: rgba(224, 224, 255, 0.55);">${timeParts.second}</span>
          </span>
        </div>
      `;

    // 8. Retro CRT Mode
    } else if (displayType === 'crt') {
      displayWrapper.innerHTML = `
        <div style="
          font-family: 'Courier New', Courier, monospace;
          font-size: calc(28px * var(--widget-zoom, 1.0));
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
          font-size: calc(32px * var(--widget-zoom, 1.0));
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
          font-size: calc(30px * var(--widget-zoom, 1.0));
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
          font-size: calc(28px * var(--widget-zoom, 1.0));
          color: #f3e5ab;
          text-shadow: 0 1px calc(6px * var(--widget-zoom, 1.0)) rgba(212, 175, 55, 0.4);
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
          font-size: calc(28px * var(--widget-zoom, 1.0));
          color: #ffaa33;
          text-shadow: 0 2px calc(10px * var(--widget-zoom, 1.0)) rgba(255, 170, 51, 0.5);
        ">
          ${timeParts.hour}:${timeParts.minute}:${timeParts.second}
        </div>
      `;

    // 13. Digital Standard
    } else {
      displayWrapper.innerHTML = `
        <div style="
          font-family: 'SF Mono', Consolas, monospace;
          font-size: calc(30px * var(--widget-zoom, 1.0));
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: #ffffff;
          letter-spacing: 0.08em;
          text-shadow: 0 0 calc(10px * var(--widget-zoom, 1.0)) rgba(255,255,255,0.2);
        ">
          ${timeParts.hour}:${timeParts.minute}:${timeParts.second}
        </div>
      `;
    }
  });
};
