window.FinancialHubHUD = window.FinancialHubHUD || {};
window.FinancialHubHUD._instances = window.FinancialHubHUD._instances || {};

window.FinancialHubHUD._getInstance = function(containerSelector) {
  var selector = containerSelector || '#hud-container';
  if (!window.FinancialHubHUD._instances[selector]) {
    var defaultSettings = {
      vix: 15,
      sentiment: 'dynamic',
      glassOpacity: 0.8,
      scale: 1.0,
      customTitle: 'FINANCIAL HUBS MONITOR'
    };
    window.FinancialHubHUD._instances[selector] = {
      containerSelector: selector,
      settings: defaultSettings,
      overlayElement: null,
      canvas: null,
      animationFrameId: null,
      currentFocusIndex: 0,
      lastFocusShiftTime: Date.now(),
      epicenters: []
    };
    window.FinancialHubHUD._initializeEpicenters(selector);
  }
  return window.FinancialHubHUD._instances[selector];
};

window.FinancialHubHUD._initializeEpicenters = function(containerSelector) {
  var instance = window.FinancialHubHUD._instances[containerSelector];
  if (!instance) return;

  // Global Epicenter coordinates with financial baseline metrics
  instance.epicenters = [
    { name: 'New York', lat: 40.7128, lng: -74.0060, baseStatus: 'bullish', change: '+1.24%', code: 'NYSE' },
    { name: 'London', lat: 51.5074, lng: -0.1278, baseStatus: 'bullish', change: '+0.85%', code: 'LSE' },
    { name: 'Frankfurt', lat: 50.1109, lng: 8.6821, baseStatus: 'bearish', change: '-1.12%', code: 'DAX' },
    { name: 'Tokyo', lat: 35.6762, lng: 139.6503, baseStatus: 'closed', change: '0.00%', code: 'TSE' },
    { name: 'Singapore', lat: 1.3521, lng: 103.8198, baseStatus: 'bullish', change: '+0.42%', code: 'SGX' }
  ];
};

window.FinancialHubHUD.init = function(options) {
  try {
    options = options || {};
    var containerSelector = options.container || '#hud-container';
    var defaultSettings = {
      vix: 15,
      sentiment: 'dynamic',
      glassOpacity: 0.8,
      scale: 1.0,
      customTitle: 'FINANCIAL HUBS MONITOR'
    };
    var instance = {
      containerSelector: containerSelector,
      settings: Object.assign({}, defaultSettings, options.settings || {}),
      overlayElement: null,
      canvas: null,
      animationFrameId: null,
      currentFocusIndex: 0,
      lastFocusShiftTime: Date.now(),
      epicenters: []
    };
    window.FinancialHubHUD._instances[containerSelector] = instance;
    window.FinancialHubHUD._initializeEpicenters(containerSelector);
    console.log("FinancialHubHUD: Initialized for " + containerSelector);
  } catch (err) {
    console.error("FinancialHubHUD Init Error:", err);
  }
};

window.FinancialHubHUD.mount = function(containerSelector) {
  try {
    var instance = window.FinancialHubHUD._getInstance(containerSelector);
    var container = document.querySelector(instance.containerSelector) || document.body;

    if (!container) {
      throw new Error("Target container not found: " + instance.containerSelector);
    }

    var existingPanel = container.querySelector('.financial-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    var panel = document.createElement('div');
    panel.className = 'financial-panel';

    Object.assign(panel.style, {
      pointerEvents: 'auto',
      backdropFilter: 'blur(20px) saturate(120%)',
      WebkitBackdropFilter: 'blur(20px) saturate(120%)',
      border: 'calc(1px * var(--widget-zoom, 1.0)) solid rgba(255, 255, 255, 0.15)',
      borderRadius: 'calc(24px * var(--widget-zoom, 1.0))',
      padding: 'calc(20px * var(--widget-zoom, 1.0)) calc(24px * var(--widget-zoom, 1.0))',
      boxShadow: '0 calc(20px * var(--widget-zoom, 1.0)) calc(50px * var(--widget-zoom, 1.0)) rgba(0, 0, 0, 0.45)',
      width: 'fit-content',
      margin: '0 auto',
      boxSizing: 'border-box',
      transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      visibility: 'visible',
      opacity: '1',
      zIndex: '9999'
    });

    panel.innerHTML = `
      <div class="panel-header" style="
        font-size: calc(11px * var(--widget-zoom, 1.0));
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: calc(0.2em * var(--widget-zoom, 1.0));
        color: #ffffff;
        background: rgba(112, 0, 255, 0.12);
        padding: calc(6px * var(--widget-zoom, 1.0)) calc(16px * var(--widget-zoom, 1.0));
        border-radius: calc(20px * var(--widget-zoom, 1.0));
        border: calc(1px * var(--widget-zoom, 1.0)) solid rgba(112, 0, 255, 0.2);
        box-shadow: 0 calc(4px * var(--widget-zoom, 1.0)) calc(10px * var(--widget-zoom, 1.0)) rgba(0, 0, 0, 0.25);
        text-align: center;
        margin-bottom: calc(16px * var(--widget-zoom, 1.0));
        white-space: nowrap;
        font-family: 'Outfit', sans-serif;
      ">
        FINANCIAL HUBS MONITOR
      </div>
      <canvas class="financial-canvas" style="display: block; border-radius: calc(12px * var(--widget-zoom, 1.0)); background: #08090d;"></canvas>
      <div class="telemetry-bar" style="
        width: 100%;
        margin-top: calc(12px * var(--widget-zoom, 1.0));
        display: flex;
        justify-content: space-between;
        font-family: 'SF Mono', Consolas, monospace;
        font-size: calc(9px * var(--widget-zoom, 1.0));
        color: rgba(255, 255, 255, 0.45);
        letter-spacing: 0.05em;
        border-top: calc(1px * var(--widget-zoom, 1.0)) solid rgba(255, 255, 255, 0.08);
        padding-top: calc(10px * var(--widget-zoom, 1.0));
        box-sizing: border-box;
      ">
        <span>VIX RATE: <span class="vix-span">15</span></span>
        <span style="color: #7000ff;">AUTONOMOUS SCANNING CYCLE: 15S</span>
      </div>
    `;

    container.appendChild(panel);
    instance.overlayElement = panel;
    instance.canvas = panel.querySelector('.financial-canvas');

    window.FinancialHubHUD._updatePositionAndGlass(instance.containerSelector);

    // Manual click listeners and cross-widget coupling completely removed for passive signage operation
    instance.lastFocusShiftTime = Date.now();
    instance.currentFocusIndex = 0;

    // Start 60fps render loop
    window.FinancialHubHUD._drawFrame(instance.containerSelector);

    console.log("FinancialHubHUD: Mounted passively to " + instance.containerSelector);
  } catch (err) {
    console.error("FinancialHubHUD Mount Error:", err);
  }
};

window.FinancialHubHUD.update = function(containerSelector, settings) {
  var instance = window.FinancialHubHUD._getInstance(containerSelector);
  if (!instance || !instance.settings) return;

  instance.settings = Object.assign({}, instance.settings, settings || {});
  window.FinancialHubHUD._updatePositionAndGlass(containerSelector);

  if (instance.overlayElement) {
    var titleEl = instance.overlayElement.querySelector('.panel-header');
    if (titleEl) {
      var defaultTitle = 'FINANCIAL HUBS MONITOR';
      var displayTitle = instance.settings.customTitle !== undefined ? instance.settings.customTitle : defaultTitle;
      if (displayTitle.trim() === '') {
        titleEl.style.display = 'none';
      } else {
        titleEl.style.display = 'block';
        titleEl.textContent = displayTitle;
      }
    }

    var vixSpan = instance.overlayElement.querySelector('.vix-span');
    if (vixSpan) {
      vixSpan.textContent = instance.settings.vix !== undefined ? instance.settings.vix : 15;
    }
  }
};

window.FinancialHubHUD.unmount = function(containerSelector) {
  var selector = containerSelector || '#hud-container';
  var instance = window.FinancialHubHUD._instances[selector];
  if (instance) {
    if (instance.animationFrameId) {
      cancelAnimationFrame(instance.animationFrameId);
      instance.animationFrameId = null;
    }
    if (instance.overlayElement) {
      instance.overlayElement.remove();
      instance.overlayElement = null;
    }
    instance.canvas = null;
    console.log("FinancialHubHUD: Unmounted " + selector);
  }
};

window.FinancialHubHUD.destroy = function(containerSelector) {
  var selector = containerSelector || '#hud-container';
  window.FinancialHubHUD.unmount(selector);
  delete window.FinancialHubHUD._instances[selector];
  console.log("FinancialHubHUD: Destroyed " + selector);
};

window.FinancialHubHUD._updatePositionAndGlass = function(containerSelector) {
  var instance = window.FinancialHubHUD._getInstance(containerSelector);
  if (!instance || !instance.overlayElement || !instance.settings) return;

  var panel = instance.overlayElement;
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.position = 'relative';
  panel.style.width = '100%';
  panel.style.height = '100%';
  panel.style.boxSizing = 'border-box';

  var opacity = parseFloat(instance.settings.glassOpacity);
  if (opacity === 0) {
    panel.classList.remove('elevation-level-1');
    panel.classList.add('elevation-level-0');
    panel.style.setProperty('background', 'rgba(10, 12, 18, 0)', 'important');
    panel.style.setProperty('backdrop-filter', 'none', 'important');
    panel.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
    panel.style.setProperty('border-color', 'transparent', 'important');
    panel.style.setProperty('box-shadow', 'none', 'important');
  } else {
    panel.classList.remove('elevation-level-0');
    panel.classList.add('elevation-level-1');
    panel.style.setProperty('background', 'rgba(20, 24, 32, ' + opacity + ')', 'important');
    panel.style.removeProperty('backdrop-filter');
    panel.style.removeProperty('-webkit-backdrop-filter');
    panel.style.removeProperty('border-color');
    panel.style.removeProperty('box-shadow');
    panel.style.border = 'calc(1px * var(--widget-zoom, 1.0)) solid rgba(255, 255, 255, 0.15)';
    panel.style.boxShadow = '0 calc(20px * var(--widget-zoom, 1.0)) calc(50px * var(--widget-zoom, 1.0)) rgba(0, 0, 0, 0.45)';
  }

  if (instance.canvas) {
    instance.canvas.style.width = '100%';
    instance.canvas.style.height = '100%';
    instance.canvas.style.flex = '1';
    instance.canvas.style.minHeight = '0';
  }
};

window.FinancialHubHUD._drawFrame = function(containerSelector) {
  var instance = window.FinancialHubHUD._instances[containerSelector];
  if (!instance || !instance.canvas || !instance.overlayElement) return;

  var canvas = instance.canvas;
  var ctx = canvas.getContext('2d');

  // Render dimensions based on live layout box
  var displayWidth = canvas.clientWidth || 480;
  var displayHeight = canvas.clientHeight || 280;

  var dpr = window.devicePixelRatio || 1;

  if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
  }

  var scale = instance.settings.scale !== undefined ? parseFloat(instance.settings.scale) : 1.0;

  // 2D Web Mercator Projection Math
  function project(lat, lng, W, H) {
    var x = W * (lng + 180) / 360;
    var latRad = lat * Math.PI / 180;
    latRad = Math.max(-1.484, Math.min(1.484, latRad));
    var y = H / 2 - (W / (2 * Math.PI)) * Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    
    var cx = W / 2;
    var cy = H / 2;
    return {
      x: cx + (x - cx) * scale,
      y: cy + (y - cy) * scale
    };
  }

  // Calculate breathing frequency omega based on VIX settings
  var vix = instance.settings.vix !== undefined ? parseFloat(instance.settings.vix) : 15;
  vix = Math.max(9, Math.min(40, vix));
  var T;
  if (vix <= 12) {
    T = 8.0; // Calm 8 seconds period
  } else if (vix >= 30) {
    T = 2.0; // Volatile 2 seconds period
  } else {
    var ratio = (vix - 12) / (30 - 12);
    T = 8.0 - 6.0 * ratio; // Interpolation
  }
  var omega = (2 * Math.PI) / T;

  var now = Date.now();
  var tSec = now / 1000;

  // Asymmetric breathing pulse: Pulse(t) = Math.pow((Math.sin(omega * t) + 1) / 2, 4)
  var pulseVal = Math.pow((Math.sin(omega * tSec) + 1) / 2, 4);

  // Passive Carousel Loop focus shifting check
  var elapsedShift = now - instance.lastFocusShiftTime;
  if (elapsedShift >= 15000) { // Shift focus every 15 seconds passively
    instance.currentFocusIndex = (instance.currentFocusIndex + 1) % instance.epicenters.length;
    instance.lastFocusShiftTime = now;
  }

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, displayWidth, displayHeight);

  // Draw background grid/sea
  ctx.fillStyle = '#08090d';
  ctx.fillRect(0, 0, displayWidth, displayHeight);

  // Draw solid NordVPN-style background map geometry (continents)
  if (window.FXEarthGlobeLandData) {
    ctx.fillStyle = '#111622';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.lineWidth = 0.8;

    for (var p = 0; p < window.FXEarthGlobeLandData.length; p++) {
      var polygon = window.FXEarthGlobeLandData[p];
      if (polygon.length < 2) continue;
      
      ctx.beginPath();
      var start = project(polygon[0][1], polygon[0][0], displayWidth, displayHeight);
      ctx.moveTo(start.x, start.y);
      for (var pt = 1; pt < polygon.length; pt++) {
        var pos = project(polygon[pt][1], polygon[pt][0], displayWidth, displayHeight);
        ctx.lineTo(pos.x, pos.y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // Draw epicenter nodes on top of solid continent geometry
  instance.epicenters.forEach(function(epi, index) {
    var pos = project(epi.lat, epi.lng, displayWidth, displayHeight);

    // Resolve market sentiment color
    var status = epi.baseStatus;
    if (instance.settings.sentiment === 'bullish') status = 'bullish';
    else if (instance.settings.sentiment === 'bearish') status = 'bearish';
    else if (instance.settings.sentiment === 'neutral') status = 'closed';

    var stateColor = '#1e293b'; // Closed
    if (status === 'bullish') stateColor = '#10b981';
    else if (status === 'bearish') stateColor = '#ef4444';

    var isFocused = (instance.currentFocusIndex === index);

    // Multi-pass radial gradient color stops flaring when focused
    var outerRadius = (8 + pulseVal * 6) * scale; // Calm breathing range
    var glowOpacity = 0.5;
    var blurMultiplier = 12 * scale;

    if (isFocused) {
      outerRadius = (20 + pulseVal * 35) * scale; // Flared breathing range: 20px to 55px
      glowOpacity = 0.85;
      blurMultiplier = 30 * scale; // Flared shadow blur: 30px scaled by VIX
    }

    // Pass 1: Outer flared breathing radial glow
    var grad = ctx.createRadialGradient(pos.x, pos.y, 2 * scale, pos.x, pos.y, outerRadius);
    grad.addColorStop(0, hexToRgba(stateColor, glowOpacity));
    grad.addColorStop(0.3, hexToRgba(stateColor, glowOpacity * 0.4));
    grad.addColorStop(1, hexToRgba(stateColor, 0));

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    // Pass 2: Inner core with VIX-breathing shadowBlur
    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, (isFocused ? 5.5 : 4.0) * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = stateColor;
    ctx.shadowBlur = blurMultiplier * pulseVal; // breathing blur shadow
    ctx.fill();
    ctx.restore();

    // Draw hub text details
    ctx.fillStyle = isFocused ? '#ffffff' : 'rgba(255, 255, 255, 0.65)';
    ctx.font = isFocused ? 'bold ' + (8.5 * scale) + 'px "SF Mono", Consolas, monospace' : (7.5 * scale) + 'px "SF Mono", Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(epi.code, pos.x + 8 * scale, pos.y - 2 * scale);

    ctx.fillStyle = (status === 'bullish') ? '#10b981' : ((status === 'bearish') ? '#ef4444' : 'rgba(255, 255, 255, 0.35)');
    ctx.font = (7 * scale) + 'px "SF Mono", Consolas, monospace';
    ctx.fillText(epi.change, pos.x + 8 * scale, pos.y + 6 * scale);

    // Focused epicenter visual bracket rings
    if (isFocused) {
      ctx.strokeStyle = 'rgba(240, 171, 252, ' + (0.5 + 0.5 * Math.sin(now / 150)) + ')';
      ctx.lineWidth = 1.2 * scale;
      
      // Dynamic pulsing target ring
      var pulseRing = (10 + (now % 800) * 0.015) * scale;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pulseRing, 0, Math.PI * 2);
      ctx.stroke();

      // Corner target indicators
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.0 * scale;
      var len = 3 * scale;
      var gap = 9 * scale;
      // Top Left corner
      ctx.beginPath();
      ctx.moveTo(pos.x - gap, pos.y - gap + len);
      ctx.lineTo(pos.x - gap, pos.y - gap);
      ctx.lineTo(pos.x - gap + len, pos.y - gap);
      // Top Right corner
      ctx.moveTo(pos.x + gap, pos.y - gap + len);
      ctx.lineTo(pos.x + gap, pos.y - gap);
      ctx.lineTo(pos.x + gap - len, pos.y - gap);
      // Bottom Left corner
      ctx.moveTo(pos.x - gap, pos.y + gap - len);
      ctx.lineTo(pos.x - gap, pos.y + gap);
      ctx.lineTo(pos.x - gap + len, pos.y + gap);
      // Bottom Right corner
      ctx.moveTo(pos.x + gap, pos.y + gap - len);
      ctx.lineTo(pos.x + gap, pos.y + gap);
      ctx.lineTo(pos.x + gap - len, pos.y + gap);
      ctx.stroke();
    }
  });

  ctx.restore();

  // Schedule next frame
  instance.animationFrameId = requestAnimationFrame(function() {
    window.FinancialHubHUD._drawFrame(containerSelector);
  });
};

// Helper hex-to-rgba converter
function hexToRgba(hex, alpha) {
  var r = 30, g = 41, b = 59;
  if (hex === '#10b981') {
    r = 16; g = 185; b = 129;
  } else if (hex === '#ef4444') {
    r = 239; g = 68; b = 68;
  }
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}
