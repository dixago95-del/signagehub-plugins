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
      focusedHubName: null,
      focusTime: 0,
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
      focusedHubName: null,
      focusTime: 0,
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

    var match = instance.containerSelector.match(/\d+/);
    var slotId = match ? match[0] : '0';

    var panel = document.createElement('div');
    panel.className = 'financial-panel';

    Object.assign(panel.style, {
      pointerEvents: 'auto',
      backdropFilter: 'blur(20px) saturate(120%)',
      WebkitBackdropFilter: 'blur(20px) saturate(120%)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '24px',
      padding: '20px 24px',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
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
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: #ffffff;
        background: rgba(112, 0, 255, 0.12);
        padding: 6px 16px;
        border-radius: 20px;
        border: 1px solid rgba(112, 0, 255, 0.2);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
        text-align: center;
        margin-bottom: 16px;
        white-space: nowrap;
        font-family: 'Outfit', sans-serif;
      ">
        FINANCIAL HUBS MONITOR
      </div>
      <canvas class="financial-canvas" style="display: block; border-radius: 12px; background: #08090d;"></canvas>
      <div class="telemetry-bar" style="
        width: 100%;
        margin-top: 12px;
        display: flex;
        justify-content: space-between;
        font-family: 'SF Mono', Consolas, monospace;
        font-size: 9px;
        color: rgba(255, 255, 255, 0.45);
        letter-spacing: 0.05em;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding-top: 10px;
        box-sizing: border-box;
      ">
        <span>VOLATILITY VIX: <span class="vix-span">15</span></span>
        <span style="color: #7000ff; cursor: pointer;" class="btn-instruction">CLICK NODE TO LOCK GLOBE</span>
      </div>
    `;

    container.appendChild(panel);
    instance.overlayElement = panel;
    instance.canvas = panel.querySelector('.financial-canvas');

    window.FinancialHubHUD._updatePositionAndGlass(instance.containerSelector);

    // Setup Canvas click listener for epicenter focus dispatch
    var canvas = instance.canvas;
    canvas.addEventListener('click', function(event) {
      var rect = canvas.getBoundingClientRect();
      var clickX = event.clientX - rect.left;
      var clickY = event.clientY - rect.top;

      var displayWidth = 480;
      var displayHeight = 280;

      // 2D Web Mercator Project Math helper inside click listener
      function projectPoint(lat, lng, W, H) {
        var x = W * (lng + 180) / 360;
        var latRad = lat * Math.PI / 180;
        latRad = Math.max(-1.484, Math.min(1.484, latRad));
        var y = H / 2 - (W / (2 * Math.PI)) * Math.log(Math.tan(Math.PI / 4 + latRad / 2));
        return { x: x, y: y };
      }

      instance.epicenters.forEach(function(epi) {
        var pos = projectPoint(epi.lat, epi.lng, displayWidth, displayHeight);
        var dx = clickX - pos.x;
        var dy = clickY - pos.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 16) { // Click hit target bounding radius
          // Resolve current state color
          var status = epi.baseStatus;
          if (instance.settings.sentiment === 'bullish') status = 'bullish';
          else if (instance.settings.sentiment === 'bearish') status = 'bearish';
          else if (instance.settings.sentiment === 'neutral') status = 'closed';

          // Standardized event bus trigger payload mapping
          if (window.SignageHubEventBus) {
            window.SignageHubEventBus.dispatchEvent(new CustomEvent('scc:location-focus', {
              detail: {
                lat: epi.lat,
                lng: epi.lng,
                hubName: epi.name,
                status: status,
                change: epi.change
              }
            }));
            console.log("FinancialHubHUD: Dispatched scc:location-focus for " + epi.name);
          }
        }
      });
    });

    // Cursor pointer feedback on hub hovering
    canvas.addEventListener('mousemove', function(event) {
      var rect = canvas.getBoundingClientRect();
      var mouseX = event.clientX - rect.left;
      var mouseY = event.clientY - rect.top;

      var displayWidth = 480;
      var displayHeight = 280;

      function projectPoint(lat, lng, W, H) {
        var x = W * (lng + 180) / 360;
        var latRad = lat * Math.PI / 180;
        latRad = Math.max(-1.484, Math.min(1.484, latRad));
        var y = H / 2 - (W / (2 * Math.PI)) * Math.log(Math.tan(Math.PI / 4 + latRad / 2));
        return { x: x, y: y };
      }

      var hit = false;
      instance.epicenters.forEach(function(epi) {
        var pos = projectPoint(epi.lat, epi.lng, displayWidth, displayHeight);
        var dx = mouseX - pos.x;
        var dy = mouseY - pos.y;
        if (Math.sqrt(dx * dx + dy * dy) < 16) {
          hit = true;
        }
      });
      canvas.style.cursor = hit ? 'pointer' : 'default';
    });

    // Cross-widget focus alignment listener
    if (window.SignageHubEventBus) {
      instance.onLocationFocus = function(e) {
        if (e.detail && e.detail.hubName) {
          instance.focusedHubName = e.detail.hubName;
          instance.focusTime = Date.now();
        }
      };
      window.SignageHubEventBus.addEventListener('scc:location-focus', instance.onLocationFocus);
    }

    // Start 60fps render loop
    instance.lastTime = Date.now();
    window.FinancialHubHUD._drawFrame(instance.containerSelector);

    console.log("FinancialHubHUD: Mounted to " + instance.containerSelector);
  } catch (err) {
    console.error("FinancialHubHUD Mount Error:", err);
  }
};

window.FinancialHubHUD.update = function(containerSelector, settings) {
  var instance = window.FinancialHubHUD._getInstance(containerSelector);
  if (!instance || !instance.settings) return;

  instance.settings = Object.assign({}, instance.settings, settings || {});
  window.FinancialHubHUD._updatePositionAndGlass(containerSelector);

  // Update Title and VIX display immediately
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
    if (window.SignageHubEventBus && instance.onLocationFocus) {
      window.SignageHubEventBus.removeEventListener('scc:location-focus', instance.onLocationFocus);
      delete instance.onLocationFocus;
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
  var scale = instance.settings.scale !== undefined ? parseFloat(instance.settings.scale) : 1.0;
  var opacity = parseFloat(instance.settings.glassOpacity);

  panel.style.position = 'absolute';
  panel.style.width = 'max-content';
  panel.style.height = 'max-content';
  panel.style.maxWidth = 'none';
  panel.style.maxHeight = 'none';

  // Glass opacity application
  if (opacity === 0) {
    panel.style.setProperty('background', 'rgba(10, 12, 18, 0)', 'important');
    panel.style.setProperty('backdrop-filter', 'none', 'important');
    panel.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
    panel.style.setProperty('border-color', 'transparent', 'important');
    panel.style.setProperty('box-shadow', 'none', 'important');
  } else {
    panel.style.setProperty('background', 'rgba(10, 12, 18, ' + opacity + ')', 'important');
    panel.style.removeProperty('backdrop-filter');
    panel.style.removeProperty('-webkit-backdrop-filter');
    panel.style.removeProperty('border-color');
    panel.style.removeProperty('box-shadow');
  }

  // Anchor and scaling translations based on Slot layout positioning coordinates
  panel.style.top = 'auto';
  panel.style.bottom = 'auto';
  panel.style.left = 'auto';
  panel.style.right = 'auto';
  panel.style.transform = 'none';

  var normalized = containerSelector.toLowerCase();
  if (normalized.indexOf('1') !== -1) {
    panel.style.top = '30px';
    panel.style.left = '30px';
    panel.style.transformOrigin = 'top left';
    panel.style.transform = 'scale(' + scale + ')';
  } else if (normalized.indexOf('2') !== -1) {
    panel.style.top = '30px';
    panel.style.left = '50%';
    panel.style.transformOrigin = 'top center';
    panel.style.transform = 'translateX(-50%) scale(' + scale + ')';
  } else if (normalized.indexOf('3') !== -1) {
    panel.style.top = '30px';
    panel.style.right = '30px';
    panel.style.transformOrigin = 'top right';
    panel.style.transform = 'scale(' + scale + ')';
  } else if (normalized.indexOf('4') !== -1) {
    panel.style.top = '50%';
    panel.style.left = '30px';
    panel.style.transformOrigin = 'center left';
    panel.style.transform = 'translateY(-50%) scale(' + scale + ')';
  } else if (normalized.indexOf('5') !== -1) {
    panel.style.top = '50%';
    panel.style.left = '50%';
    panel.style.transformOrigin = 'center center';
    panel.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
  } else if (normalized.indexOf('6') !== -1) {
    panel.style.top = '50%';
    panel.style.right = '30px';
    panel.style.transformOrigin = 'center right';
    panel.style.transform = 'translateY(-50%) scale(' + scale + ')';
  } else if (normalized.indexOf('7') !== -1) {
    panel.style.bottom = '30px';
    panel.style.left = '30px';
    panel.style.transformOrigin = 'bottom left';
    panel.style.transform = 'scale(' + scale + ')';
  } else if (normalized.indexOf('8') !== -1) {
    panel.style.bottom = '30px';
    panel.style.left = '50%';
    panel.style.transformOrigin = 'bottom center';
    panel.style.transform = 'translateX(-50%) scale(' + scale + ')';
  } else if (normalized.indexOf('9') !== -1) {
    panel.style.bottom = '30px';
    panel.style.right = '30px';
    panel.style.transformOrigin = 'bottom right';
    panel.style.transform = 'scale(' + scale + ')';
  } else {
    panel.style.transformOrigin = 'center center';
    panel.style.transform = 'scale(' + scale + ')';
  }
};

window.FinancialHubHUD._drawFrame = function(containerSelector) {
  var instance = window.FinancialHubHUD._instances[containerSelector];
  if (!instance || !instance.canvas || !instance.overlayElement) return;

  var canvas = instance.canvas;
  var ctx = canvas.getContext('2d');

  var displayWidth = 480;
  var displayHeight = 280;

  // Retina high-DPI scaling
  if (canvas.width !== displayWidth * window.devicePixelRatio || canvas.height !== displayHeight * window.devicePixelRatio) {
    canvas.width = displayWidth * window.devicePixelRatio;
    canvas.height = displayHeight * window.devicePixelRatio;
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
  }

  // Mercator Projection Math
  function project(lat, lng, W, H) {
    var x = W * (lng + 180) / 360;
    var latRad = lat * Math.PI / 180;
    latRad = Math.max(-1.484, Math.min(1.484, latRad));
    var y = H / 2 - (W / (2 * Math.PI)) * Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    return { x: x, y: y };
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
    // Smooth linear interpolation of T between 8s and 2s
    var ratio = (vix - 12) / (30 - 12);
    T = 8.0 - 6.0 * ratio;
  }
  var omega = (2 * Math.PI) / T;

  var now = Date.now();
  var tSec = now / 1000;

  // Asymmetric breathing pulse calculation: Pulse(t) = Math.pow((Math.sin(omega * t) + 1) / 2, 4)
  var pulseVal = Math.pow((Math.sin(omega * tSec) + 1) / 2, 4);

  ctx.save();
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  ctx.clearRect(0, 0, displayWidth, displayHeight);

  // Draw background vector map
  if (window.FXEarthGlobeLandData) {
    ctx.beginPath();
    for (var p = 0; p < window.FXEarthGlobeLandData.length; p++) {
      var polygon = window.FXEarthGlobeLandData[p];
      if (polygon.length < 2) continue;
      
      var start = project(polygon[0][1], polygon[0][0], displayWidth, displayHeight);
      ctx.moveTo(start.x, start.y);
      for (var pt = 1; pt < polygon.length; pt++) {
        var pos = project(polygon[pt][1], polygon[pt][0], displayWidth, displayHeight);
        ctx.lineTo(pos.x, pos.y);
      }
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Multi-pass radial gradient pipeline for Epicenters
  instance.epicenters.forEach(function(epi) {
    var pos = project(epi.lat, epi.lng, displayWidth, displayHeight);

    // Resolve market sentiment color
    var status = epi.baseStatus;
    if (instance.settings.sentiment === 'bullish') status = 'bullish';
    else if (instance.settings.sentiment === 'bearish') status = 'bearish';
    else if (instance.settings.sentiment === 'neutral') status = 'closed';

    var stateColor = '#1e293b'; // Default Closed
    if (status === 'bullish') stateColor = '#10b981';
    else if (status === 'bearish') stateColor = '#ef4444';

    // Highlight focused node from Event Bus broadcasts
    var isFocused = (instance.focusedHubName === epi.name && (now - instance.focusTime < 4000));

    // Pass 1: Draw outer breathing radial halo glow
    var outerRadius = 10 + pulseVal * 20; // Pulsates between 10px and 30px
    var grad = ctx.createRadialGradient(pos.x, pos.y, 2, pos.x, pos.y, outerRadius);
    grad.addColorStop(0, hexToRgba(stateColor, 0.8));
    grad.addColorStop(0.3, hexToRgba(stateColor, 0.3));
    grad.addColorStop(1, hexToRgba(stateColor, 0));

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    // Pass 2: Inner core with 30px shadowBlur scaled by breathing Pulse
    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, isFocused ? 5.5 : 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = stateColor;
    ctx.shadowBlur = 30 * pulseVal; // VIX-breathing blur clamp
    ctx.fill();
    ctx.restore();

    // Draw localized telemetry tags
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 8px "SF Mono", Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(epi.code, pos.x + 8, pos.y - 2);

    ctx.fillStyle = (status === 'bullish') ? '#10b981' : ((status === 'bearish') ? '#ef4444' : 'rgba(255, 255, 255, 0.4)');
    ctx.font = '7px "SF Mono", Consolas, monospace';
    ctx.fillText(epi.change, pos.x + 8, pos.y + 6);

    // Cross-widget focal indicator bracket rings
    if (isFocused) {
      var elapsed = now - instance.focusTime;
      var alpha = 1.0 - (elapsed / 4000);
      var ringRadius = 12 + (elapsed % 500) * 0.02;

      ctx.strokeStyle = 'rgba(240, 171, 252, ' + alpha + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  ctx.restore();

  // Schedule next frame
  instance.animationFrameId = requestAnimationFrame(function() {
    window.FinancialHubHUD._drawFrame(containerSelector);
  });
};

// Helper function to handle color opacity blendings
function hexToRgba(hex, alpha) {
  var r = 30, g = 41, b = 59;
  if (hex === '#10b981') {
    r = 16; g = 185; b = 129;
  } else if (hex === '#ef4444') {
    r = 239; g = 68; b = 68;
  }
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}
