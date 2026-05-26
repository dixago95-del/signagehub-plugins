window.LogisticsTransitHUD = window.LogisticsTransitHUD || {};
window.LogisticsTransitHUD._instances = window.LogisticsTransitHUD._instances || {};

window.LogisticsTransitHUD._getInstance = function(containerSelector) {
  var selector = containerSelector || '#hud-container';
  if (!window.LogisticsTransitHUD._instances[selector]) {
    var defaultSettings = {
      transitSpeed: 1.0,
      glassOpacity: 0.8,
      scale: 1.0,
      customTitle: 'GLOBAL LOGISTICS & TRANSIT OVERLAY'
    };
    window.LogisticsTransitHUD._instances[selector] = {
      containerSelector: selector,
      settings: defaultSettings,
      overlayElement: null,
      canvas: null,
      animationFrameId: null,
      focusMarker: null,
      routes: []
    };
    window.LogisticsTransitHUD._initializeRoutes(selector);
  }
  return window.LogisticsTransitHUD._instances[selector];
};

window.LogisticsTransitHUD._initializeRoutes = function(containerSelector) {
  var instance = window.LogisticsTransitHUD._instances[containerSelector];
  if (!instance) return;

  // Setup flight and shipping route nodes in global coordinates
  instance.routes = [
    // Aviation Routes (Quadratic Bézier, fast)
    { type: 'aviation', from: 'New York', to: 'London', p0: { lat: 40.7128, lng: -74.0060 }, p1: { lat: 51.5074, lng: -0.1278 }, s: 0.0, speed: 0.0018, color: '#00f0ff', size: 3.5 },
    { type: 'aviation', from: 'Tokyo', to: 'Singapore', p0: { lat: 35.6762, lng: 139.6503 }, p1: { lat: 1.3521, lng: 103.8198 }, s: 0.25, speed: 0.0022, color: '#00f0ff', size: 3.5 },
    { type: 'aviation', from: 'London', to: 'Singapore', p0: { lat: 51.5074, lng: -0.1278 }, p1: { lat: 1.3521, lng: 103.8198 }, s: 0.5, speed: 0.0015, color: '#e0aaff', size: 3.5 },
    { type: 'aviation', from: 'Sydney', to: 'Tokyo', p0: { lat: -33.8688, lng: 151.2093 }, p1: { lat: 35.6762, lng: 139.6503 }, s: 0.1, speed: 0.0020, color: '#00f0ff', size: 3.5 },
    { type: 'aviation', from: 'Frankfurt', to: 'New York', p0: { lat: 50.1109, lng: 8.6821 }, p1: { lat: 40.7128, lng: -74.0060 }, s: 0.7, speed: 0.0016, color: '#e0aaff', size: 3.5 },
    { type: 'aviation', from: 'Dubai', to: 'London', p0: { lat: 25.2048, lng: 55.2708 }, p1: { lat: 51.5074, lng: -0.1278 }, s: 0.4, speed: 0.0024, color: '#00f0ff', size: 3.5 },

    // Maritime Routes (Linear, slow)
    { type: 'maritime', from: 'Shanghai', to: 'Singapore', p0: { lat: 31.2304, lng: 121.4737 }, p1: { lat: 1.3521, lng: 103.8198 }, s: 0.15, speed: 0.0007, color: '#10b981', size: 2.2 },
    { type: 'maritime', from: 'Singapore', to: 'Rotterdam', p0: { lat: 1.3521, lng: 103.8198 }, p1: { lat: 51.9244, lng: 4.4777 }, s: 0.45, speed: 0.0004, color: '#10b981', size: 2.2 },
    { type: 'maritime', from: 'New York', to: 'Rotterdam', p0: { lat: 40.7128, lng: -74.0060 }, p1: { lat: 51.9244, lng: 4.4777 }, s: 0.6, speed: 0.0008, color: '#059669', size: 2.2 },
    { type: 'maritime', from: 'Cape Town', to: 'Singapore', p0: { lat: -33.9249, lng: 18.4241 }, p1: { lat: 1.3521, lng: 103.8198 }, s: 0.8, speed: 0.0005, color: '#10b981', size: 2.2 },
    { type: 'maritime', from: 'Suez Canal', to: 'Mumbai', p0: { lat: 29.9753, lng: 32.5513 }, p1: { lat: 19.0760, lng: 72.8777 }, s: 0.3, speed: 0.0009, color: '#059669', size: 2.2 }
  ];
};

window.LogisticsTransitHUD.init = function(options) {
  try {
    options = options || {};
    var containerSelector = options.container || '#hud-container';
    var defaultSettings = {
      transitSpeed: 1.0,
      glassOpacity: 0.8,
      scale: 1.0,
      customTitle: 'GLOBAL LOGISTICS & TRANSIT OVERLAY'
    };
    var instance = {
      containerSelector: containerSelector,
      settings: Object.assign({}, defaultSettings, options.settings || {}),
      overlayElement: null,
      canvas: null,
      animationFrameId: null,
      focusMarker: null,
      routes: []
    };
    window.LogisticsTransitHUD._instances[containerSelector] = instance;
    window.LogisticsTransitHUD._initializeRoutes(containerSelector);
    console.log("LogisticsTransitHUD: Initialized for " + containerSelector);
  } catch (err) {
    console.error("LogisticsTransitHUD Init Error:", err);
  }
};

window.LogisticsTransitHUD.mount = function(containerSelector) {
  try {
    var instance = window.LogisticsTransitHUD._getInstance(containerSelector);
    var container = document.querySelector(instance.containerSelector) || document.body;

    if (!container) {
      throw new Error("Target container not found: " + instance.containerSelector);
    }

    var existingPanel = container.querySelector('.logistics-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    var match = instance.containerSelector.match(/\d+/);
    var slotId = match ? match[0] : '0';

    var panel = document.createElement('div');
    panel.className = 'logistics-panel';

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
        background: rgba(0, 240, 255, 0.12);
        padding: 6px 16px;
        border-radius: 20px;
        border: 1px solid rgba(0, 240, 255, 0.2);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
        text-align: center;
        margin-bottom: 16px;
        white-space: nowrap;
        font-family: 'Outfit', sans-serif;
      ">
        GLOBAL LOGISTICS & TRANSIT OVERLAY
      </div>
      <canvas class="logistics-canvas" style="display: block; border-radius: 12px; background: #0a0c10;"></canvas>
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
        <span>SYS STATUS: OPERATIONAL</span>
        <span style="color: #00f0ff;">ACTIVE VECTORS: 6 AIR / 5 SEA</span>
      </div>
    `;

    container.appendChild(panel);
    instance.overlayElement = panel;
    instance.canvas = panel.querySelector('.logistics-canvas');

    window.LogisticsTransitHUD._updatePositionAndGlass(instance.containerSelector);

    // Event Bus Integration for location focal alignments
    if (window.SignageHubEventBus) {
      instance.onLocationFocus = function(e) {
        if (e.detail && e.detail.lat !== undefined && e.detail.lng !== undefined) {
          instance.focusMarker = {
            lat: e.detail.lat,
            lng: e.detail.lng,
            name: e.detail.hubName || 'TELEMETRY NODE',
            time: Date.now()
          };
        }
      };
      window.SignageHubEventBus.addEventListener('scc:location-focus', instance.onLocationFocus);
    }

    // Start 60fps render loop
    instance.lastTime = Date.now();
    window.LogisticsTransitHUD._drawFrame(instance.containerSelector);

    console.log("LogisticsTransitHUD: Mounted to " + instance.containerSelector);
  } catch (err) {
    console.error("LogisticsTransitHUD Mount Error:", err);
  }
};

window.LogisticsTransitHUD.update = function(containerSelector, settings) {
  var instance = window.LogisticsTransitHUD._getInstance(containerSelector);
  if (!instance || !instance.settings) return;

  instance.settings = Object.assign({}, instance.settings, settings || {});
  window.LogisticsTransitHUD._updatePositionAndGlass(containerSelector);

  // Update Custom Title UI immediately if title changed
  if (instance.overlayElement) {
    var titleEl = instance.overlayElement.querySelector('.panel-header');
    if (titleEl) {
      var defaultTitle = 'GLOBAL LOGISTICS & TRANSIT OVERLAY';
      var displayTitle = instance.settings.customTitle !== undefined ? instance.settings.customTitle : defaultTitle;
      if (displayTitle.trim() === '') {
        titleEl.style.display = 'none';
      } else {
        titleEl.style.display = 'block';
        titleEl.textContent = displayTitle;
      }
    }
  }
};

window.LogisticsTransitHUD.unmount = function(containerSelector) {
  var selector = containerSelector || '#hud-container';
  var instance = window.LogisticsTransitHUD._instances[selector];
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
    console.log("LogisticsTransitHUD: Unmounted " + selector);
  }
};

window.LogisticsTransitHUD.destroy = function(containerSelector) {
  var selector = containerSelector || '#hud-container';
  window.LogisticsTransitHUD.unmount(selector);
  delete window.LogisticsTransitHUD._instances[selector];
  console.log("LogisticsTransitHUD: Destroyed " + selector);
};

window.LogisticsTransitHUD._updatePositionAndGlass = function(containerSelector) {
  var instance = window.LogisticsTransitHUD._getInstance(containerSelector);
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
    panel.style.setProperty('background', 'rgba(10, 12, 16, 0)', 'important');
    panel.style.setProperty('backdrop-filter', 'none', 'important');
    panel.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
    panel.style.setProperty('border-color', 'transparent', 'important');
    panel.style.setProperty('box-shadow', 'none', 'important');
  } else {
    panel.style.setProperty('background', 'rgba(10, 12, 16, ' + opacity + ')', 'important');
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

window.LogisticsTransitHUD._drawFrame = function(containerSelector) {
  var instance = window.LogisticsTransitHUD._instances[containerSelector];
  if (!instance || !instance.canvas || !instance.overlayElement) return;

  var canvas = instance.canvas;
  var ctx = canvas.getContext('2d');
  var speedMult = instance.settings.transitSpeed !== undefined ? parseFloat(instance.settings.transitSpeed) : 1.0;

  var displayWidth = 480;
  var displayHeight = 280;

  // Retina high-DPI sizing alignment
  if (canvas.width !== displayWidth * window.devicePixelRatio || canvas.height !== displayHeight * window.devicePixelRatio) {
    canvas.width = displayWidth * window.devicePixelRatio;
    canvas.height = displayHeight * window.devicePixelRatio;
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
  }

  // 2D Web Mercator Project Math helper
  function project(lat, lng, W, H) {
    var x = W * (lng + 180) / 360;
    var latRad = lat * Math.PI / 180;
    // Cap latitude to prevent infinity bounds
    latRad = Math.max(-1.484, Math.min(1.484, latRad));
    var y = H / 2 - (W / (2 * Math.PI)) * Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    return { x: x, y: y };
  }

  // Handle animation time delta
  var now = Date.now();
  var dt = (now - instance.lastTime) / 1000;
  // Safety cap against background tab throttling drift spikes
  if (dt > 0.1) dt = 0.1;
  instance.lastTime = now;

  ctx.save();
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  // 15% Alpha erase canvas clear method for premium glowing motion trails
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(10, 12, 16, 0.15)';
  ctx.fillRect(0, 0, displayWidth, displayHeight);

  // Redraw faint background map using shared land coordinates if available
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
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Transition compositing to Additive Blend (lighter) for route crossings
  ctx.globalCompositeOperation = 'lighter';

  // Render transit routes & animate paths
  instance.routes.forEach(function(route) {
    // Update vector progress s
    route.s += dt * route.speed * speedMult;
    if (route.s >= 1) {
      route.s = 0;
      // Reverse path for bi-directional flow loop
      var temp = route.p0;
      route.p0 = route.p1;
      route.p1 = temp;
    }

    var A = project(route.p0.lat, route.p0.lng, displayWidth, displayHeight);
    var B = project(route.p1.lat, route.p1.lng, displayWidth, displayHeight);

    if (route.type === 'aviation') {
      // Quadratic Bézier with vertical altitude arc bending
      var midX = (A.x + B.x) / 2;
      var midY = (A.y + B.y) / 2;
      var dist = Math.sqrt((B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y));
      
      var cpX = midX;
      var cpY = midY - dist * 0.22; // Arc altitude scaling

      // Draw faint aviation corridor track line
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.quadraticCurveTo(cpX, cpY, B.x, B.y);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Smoothstep acceleration curve mapping
      var t = 3 * route.s * route.s - 2 * route.s * route.s * route.s;

      // Position computation
      var px = (1 - t) * (1 - t) * A.x + 2 * (1 - t) * t * cpX + t * t * B.x;
      var py = (1 - t) * (1 - t) * A.y + 2 * (1 - t) * t * cpY + t * t * B.y;

      // Glowing aviation indicator particle
      ctx.beginPath();
      ctx.arc(px, py, route.size, 0, Math.PI * 2);
      ctx.fillStyle = route.color;
      ctx.shadowColor = route.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    } else {
      // Linear shipping lane (Straight Lerp)
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.04)';
      ctx.lineWidth = 1;
      ctx.stroke();

      var px = (1 - route.s) * A.x + route.s * B.x;
      var py = (1 - route.s) * A.y + route.s * B.y;

      // Glowing maritime lane ship particle
      ctx.beginPath();
      ctx.arc(px, py, route.size, 0, Math.PI * 2);
      ctx.fillStyle = route.color;
      ctx.shadowColor = route.color;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    }
  });

  // Render cross-widget focus marker pulse overlay if active
  if (instance.focusMarker) {
    var elapsed = now - instance.focusMarker.time;
    if (elapsed > 4000) {
      instance.focusMarker = null;
    } else {
      var markerPos = project(instance.focusMarker.lat, instance.focusMarker.lng, displayWidth, displayHeight);
      var alpha = 1.0 - (elapsed / 4000);
      var radius = 6 + (elapsed % 1000) * 0.015;

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(240, 171, 252, ' + alpha + ')';
      ctx.lineWidth = 2.0;

      // Outer rings
      ctx.beginPath();
      ctx.arc(markerPos.x, markerPos.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(markerPos.x, markerPos.y, radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(240, 171, 252, ' + (alpha * 0.5) + ')';
      ctx.stroke();

      // Focus Crosshairs
      ctx.beginPath();
      ctx.moveTo(markerPos.x - radius - 8, markerPos.y);
      ctx.lineTo(markerPos.x + radius + 8, markerPos.y);
      ctx.moveTo(markerPos.x, markerPos.y - radius - 8);
      ctx.lineTo(markerPos.x, markerPos.y + radius + 8);
      ctx.strokeStyle = 'rgba(240, 171, 252, ' + alpha + ')';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Center Core
      ctx.beginPath();
      ctx.arc(markerPos.x, markerPos.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#f0abfc';
      ctx.shadowBlur = 8;
      ctx.fill();

      // Location Name Monospace label
      ctx.fillStyle = 'rgba(255, 255, 255, ' + (alpha * 0.85) + ')';
      ctx.font = '7px "SF Mono", Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(instance.focusMarker.name.toUpperCase(), markerPos.x, markerPos.y - radius - 12);
      ctx.restore();
    }
  }

  ctx.restore();

  // Schedule next frame
  instance.animationFrameId = requestAnimationFrame(function() {
    window.LogisticsTransitHUD._drawFrame(containerSelector);
  });
};
