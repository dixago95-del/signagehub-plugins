window.LogisticsTransitHUD = window.LogisticsTransitHUD || {};
window.LogisticsTransitHUD._instances = window.LogisticsTransitHUD._instances || {};

window.LogisticsTransitHUD._getInstance = function(containerSelector) {
  var selector = containerSelector || '#hud-container';
  if (!window.LogisticsTransitHUD._instances[selector]) {
    var defaultSettings = {
      transitSpeed: 1.0,
      screenLat: 55.6761,
      screenLng: 12.5683,
      glassOpacity: 0.8,
      scale: 1.0,
      customTitle: 'GLOBAL LOGISTICS & TRANSIT OVERLAY'
    };
    window.LogisticsTransitHUD._instances[selector] = {
      containerSelector: selector,
      settings: defaultSettings,
      overlayElement: null,
      canvas: null,
      trailCanvas: null,
      animationFrameId: null,
      activeAlert: null,
      routes: []
    };
    window.LogisticsTransitHUD._initializeRoutes(selector);
  }
  return window.LogisticsTransitHUD._instances[selector];
};

window.LogisticsTransitHUD._initializeRoutes = function(containerSelector) {
  var instance = window.LogisticsTransitHUD._instances[containerSelector];
  if (!instance) return;

  // Setup flight and shipping route nodes in global coordinates with aircraft/vessel names
  instance.routes = [
    // Aviation Routes (Quadratic Bézier, fast)
    { type: 'aviation', name: 'FLIGHT SK925', from: 'New York', to: 'London', p0: { lat: 40.7128, lng: -74.0060 }, p1: { lat: 51.5074, lng: -0.1278 }, s: 0.0, speed: 0.0018, color: '#00f0ff', size: 3.5, lastAlertTime: 0 },
    { type: 'aviation', name: 'FLIGHT SQ318', from: 'Tokyo', to: 'Singapore', p0: { lat: 35.6762, lng: 139.6503 }, p1: { lat: 1.3521, lng: 103.8198 }, s: 0.25, speed: 0.0022, color: '#00f0ff', size: 3.5, lastAlertTime: 0 },
    { type: 'aviation', name: 'FLIGHT QF26', from: 'London', to: 'Singapore', p0: { lat: 51.5074, lng: -0.1278 }, p1: { lat: 1.3521, lng: 103.8198 }, s: 0.5, speed: 0.0015, color: '#e0aaff', size: 3.5, lastAlertTime: 0 },
    { type: 'aviation', name: 'FLIGHT LH403', from: 'Sydney', to: 'Tokyo', p0: { lat: -33.8688, lng: 151.2093 }, p1: { lat: 35.6762, lng: 139.6503 }, s: 0.1, speed: 0.0020, color: '#00f0ff', size: 3.5, lastAlertTime: 0 },
    { type: 'aviation', name: 'FLIGHT UA901', from: 'Frankfurt', to: 'New York', p0: { lat: 50.1109, lng: 8.6821 }, p1: { lat: 40.7128, lng: -74.0060 }, s: 0.7, speed: 0.0016, color: '#e0aaff', size: 3.5, lastAlertTime: 0 },
    { type: 'aviation', name: 'FLIGHT EK73', from: 'Dubai', to: 'London', p0: { lat: 25.2048, lng: 55.2708 }, p1: { lat: 51.5074, lng: -0.1278 }, s: 0.4, speed: 0.0024, color: '#00f0ff', size: 3.5, lastAlertTime: 0 },

    // Maritime Routes (Linear, slow)
    { type: 'maritime', name: 'VESSEL MAERSK MC-KINNEY', from: 'Shanghai', to: 'Singapore', p0: { lat: 31.2304, lng: 121.4737 }, p1: { lat: 1.3521, lng: 103.8198 }, s: 0.15, speed: 0.0007, color: '#10b981', size: 2.2, lastAlertTime: 0 },
    { type: 'maritime', name: 'VESSEL EVER GIVEN', from: 'Singapore', to: 'Rotterdam', p0: { lat: 1.3521, lng: 103.8198 }, p1: { lat: 51.9244, lng: 4.4777 }, s: 0.45, speed: 0.0004, color: '#10b981', size: 2.2, lastAlertTime: 0 },
    { type: 'maritime', name: 'VESSEL COSCO SHIPPING', from: 'New York', to: 'Rotterdam', p0: { lat: 40.7128, lng: -74.0060 }, p1: { lat: 51.9244, lng: 4.4777 }, s: 0.6, speed: 0.0008, color: '#059669', size: 2.2, lastAlertTime: 0 },
    { type: 'maritime', name: 'VESSEL MSC OSCAR', from: 'Cape Town', to: 'Singapore', p0: { lat: -33.9249, lng: 18.4241 }, p1: { lat: 1.3521, lng: 103.8198 }, s: 0.8, speed: 0.0005, color: '#10b981', size: 2.2, lastAlertTime: 0 },
    { type: 'maritime', name: 'VESSEL CMA CGM BENJAMIN FRANKLIN', from: 'Suez Canal', to: 'Mumbai', p0: { lat: 29.9753, lng: 32.5513 }, p1: { lat: 19.0760, lng: 72.8777 }, s: 0.3, speed: 0.0009, color: '#059669', size: 2.2, lastAlertTime: 0 }
  ];
};

window.LogisticsTransitHUD.init = function(options) {
  try {
    options = options || {};
    var containerSelector = options.container || '#hud-container';
    var defaultSettings = {
      transitSpeed: 1.0,
      screenLat: 55.6761,
      screenLng: 12.5683,
      glassOpacity: 0.8,
      scale: 1.0,
      customTitle: 'GLOBAL LOGISTICS & TRANSIT OVERLAY'
    };
    var instance = {
      containerSelector: containerSelector,
      settings: Object.assign({}, defaultSettings, options.settings || {}),
      overlayElement: null,
      canvas: null,
      trailCanvas: document.createElement('canvas'),
      animationFrameId: null,
      activeAlert: null,
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
        <span>SYS STATUS: ACTIVE SCAN</span>
        <span style="color: #00f0ff;">PROXIMITY ALERTS: AUTO ON</span>
      </div>
    `;

    container.appendChild(panel);
    instance.overlayElement = panel;
    instance.canvas = panel.querySelector('.logistics-canvas');
    instance.trailCanvas = document.createElement('canvas');

    window.LogisticsTransitHUD._updatePositionAndGlass(instance.containerSelector);

    // Click events and global event bus coupling removed for passive operation
    instance.lastTime = Date.now();
    window.LogisticsTransitHUD._drawFrame(instance.containerSelector);

    console.log("LogisticsTransitHUD: Mounted passively to " + instance.containerSelector);
  } catch (err) {
    console.error("LogisticsTransitHUD Mount Error:", err);
  }
};

window.LogisticsTransitHUD.update = function(containerSelector, settings) {
  var instance = window.LogisticsTransitHUD._getInstance(containerSelector);
  if (!instance || !instance.settings) return;

  instance.settings = Object.assign({}, instance.settings, settings || {});
  window.LogisticsTransitHUD._updatePositionAndGlass(containerSelector);

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
    if (instance.overlayElement) {
      instance.overlayElement.remove();
      instance.overlayElement = null;
    }
    instance.canvas = null;
    instance.trailCanvas = null;
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

// Haversine formula to compute great-circle distance between two points in km
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  var R = 6371; // Earth radius in km
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

window.LogisticsTransitHUD._drawFrame = function(containerSelector) {
  var instance = window.LogisticsTransitHUD._instances[containerSelector];
  if (!instance || !instance.canvas || !instance.overlayElement || !instance.trailCanvas) return;

  var canvas = instance.canvas;
  var ctx = canvas.getContext('2d');
  var speedMult = instance.settings.transitSpeed !== undefined ? parseFloat(instance.settings.transitSpeed) : 1.0;
  var screenLat = instance.settings.screenLat !== undefined ? parseFloat(instance.settings.screenLat) : 55.6761;
  var screenLng = instance.settings.screenLng !== undefined ? parseFloat(instance.settings.screenLng) : 12.5683;

  var displayWidth = 480;
  var displayHeight = 280;

  var dpr = window.devicePixelRatio || 1;

  // Sync main canvas resolution
  if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
  }

  // Sync offscreen trail canvas resolution
  var tCanvas = instance.trailCanvas;
  if (tCanvas.width !== canvas.width || tCanvas.height !== canvas.height) {
    tCanvas.width = canvas.width;
    tCanvas.height = canvas.height;
    // Clear trail canvas with pitch black initially
    var tCtx = tCanvas.getContext('2d');
    tCtx.fillStyle = '#0a0c10';
    tCtx.fillRect(0, 0, tCanvas.width, tCanvas.height);
  }

  // 2D Web Mercator Projection Math
  function project(lat, lng, W, H) {
    var x = W * (lng + 180) / 360;
    var latRad = lat * Math.PI / 180;
    latRad = Math.max(-1.484, Math.min(1.484, latRad));
    var y = H / 2 - (W / (2 * Math.PI)) * Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    return { x: x, y: y };
  }

  var now = Date.now();
  var dt = (now - instance.lastTime) / 1000;
  if (dt > 0.1) dt = 0.1;
  instance.lastTime = now;

  // 1. UPDATE AND DRAW Glowing Particle Trails on offscreen Trail Canvas
  var tCtx = tCanvas.getContext('2d');
  tCtx.save();
  tCtx.scale(dpr, dpr);

  // Clear offscreen canvas with 15% alpha-erase
  tCtx.globalCompositeOperation = 'source-over';
  tCtx.fillStyle = 'rgba(10, 12, 16, 0.15)';
  tCtx.fillRect(0, 0, displayWidth, displayHeight);

  // Set composite mode to lighter for bright intersecting glows
  tCtx.globalCompositeOperation = 'lighter';

  instance.routes.forEach(function(route) {
    // Increment travel vector s
    route.s += dt * route.speed * speedMult;
    if (route.s >= 1) {
      route.s = 0;
      var temp = route.p0;
      route.p0 = route.p1;
      route.p1 = temp;
    }

    var A = project(route.p0.lat, route.p0.lng, displayWidth, displayHeight);
    var B = project(route.p1.lat, route.p1.lng, displayWidth, displayHeight);

    var curLat, curLng, px, py;
    if (route.type === 'aviation') {
      var midX = (A.x + B.x) / 2;
      var midY = (A.y + B.y) / 2;
      var dist = Math.sqrt((B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y));
      var cpX = midX;
      var cpY = midY - dist * 0.22;

      // Smoothstep mapping
      var t = 3 * route.s * route.s - 2 * route.s * route.s * route.s;
      px = (1 - t) * (1 - t) * A.x + 2 * (1 - t) * t * cpX + t * t * B.x;
      py = (1 - t) * (1 - t) * A.y + 2 * (1 - t) * t * cpY + t * t * B.y;

      // Interpolate Lat/Lng for distance calculations
      var cpLat = (route.p0.lat + route.p1.lat) / 2 + 10;
      var cpLng = (route.p0.lng + route.p1.lng) / 2;
      curLat = (1 - t) * (1 - t) * route.p0.lat + 2 * (1 - t) * t * cpLat + t * t * route.p1.lat;
      curLng = (1 - t) * (1 - t) * route.p0.lng + 2 * (1 - t) * t * cpLng + t * t * route.p1.lng;
    } else {
      px = (1 - route.s) * A.x + route.s * B.x;
      py = (1 - route.s) * A.y + route.s * B.y;
      curLat = (1 - route.s) * route.p0.lat + route.s * route.p1.lat;
      curLng = (1 - route.s) * route.p0.lng + route.s * route.p1.lng;
    }

    // Draw glowing moving particle
    tCtx.beginPath();
    tCtx.arc(px, py, route.size, 0, Math.PI * 2);
    tCtx.fillStyle = route.color;
    tCtx.shadowColor = route.color;
    tCtx.shadowBlur = 8;
    tCtx.fill();
    tCtx.shadowBlur = 0;

    // Proximity warning alerts check
    var distKm = getHaversineDistance(curLat, curLng, screenLat, screenLng);
    if (route.type === 'aviation' && distKm < 30) {
      if (now - route.lastAlertTime > 20000) { // 20s cooldown
        instance.activeAlert = {
          text: "[ OVERHEAD RADAR: " + route.name + " PASSED WITHIN LOCAL AIRSPACE ]",
          timer: 5.0
        };
        route.lastAlertTime = now;
      }
    } else if (route.type === 'maritime' && distKm < 150) {
      if (now - route.lastAlertTime > 20000) { // 20s cooldown
        instance.activeAlert = {
          text: "[ OCEAN TRACKER: " + route.name + " ENTERED PROXIMITY SEAWAY ]",
          timer: 5.0
        };
        route.lastAlertTime = now;
      }
    }
  });
  tCtx.restore();

  // 2. DRAW solid NordVPN-style background map geometry on main canvas
  ctx.save();
  ctx.scale(dpr, dpr);

  // Clear main canvas background
  ctx.fillStyle = '#0a0c10';
  ctx.fillRect(0, 0, displayWidth, displayHeight);

  // Render solid world map vector geometries
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

  // Draw static corridor tracks on top of solid continents
  instance.routes.forEach(function(route) {
    var A = project(route.p0.lat, route.p0.lng, displayWidth, displayHeight);
    var B = project(route.p1.lat, route.p1.lng, displayWidth, displayHeight);

    ctx.beginPath();
    if (route.type === 'aviation') {
      var midX = (A.x + B.x) / 2;
      var midY = (A.y + B.y) / 2;
      var dist = Math.sqrt((B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y));
      var cpX = midX;
      var cpY = midY - dist * 0.22;
      ctx.moveTo(A.x, A.y);
      ctx.quadraticCurveTo(cpX, cpY, B.x, B.y);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
    } else {
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.04)';
    }
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // 3. Composite offscreen Trail Canvas with 'lighter' blend mode
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(tCanvas, 0, 0, displayWidth, displayHeight);

  // 4. Draw localized screen anchor pulse target ("You Are Here" anchor)
  var anchorPos = project(screenLat, screenLng, displayWidth, displayHeight);
  var pulseVal = (Math.sin(now / 200) + 1) / 2;
  
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.2;
  
  // Pulsing neon rings
  ctx.beginPath();
  ctx.arc(anchorPos.x, anchorPos.y, 4 + pulseVal * 8, 0, Math.PI * 2);
  ctx.stroke();
  
  // Neon center core dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(anchorPos.x, anchorPos.y, 2, 0, Math.PI * 2);
  ctx.fill();

  // 5. Draw sliding Proximity Alert HUD banner
  if (instance.activeAlert && instance.activeAlert.timer > 0) {
    instance.activeAlert.timer -= dt;
    var progress = 5.0 - instance.activeAlert.timer;
    var yOffset = -30; // hidden height
    
    if (progress < 0.4) {
      yOffset = -30 + (progress / 0.4) * 50; // slides down to y=20
    } else if (instance.activeAlert.timer < 0.4) {
      yOffset = 20 - (1 - (instance.activeAlert.timer / 0.4)) * 50; // slides up
    } else {
      yOffset = 20; // resting position
    }

    ctx.font = 'bold 8.5px "SF Mono", Consolas, monospace';
    var textWidth = ctx.measureText(instance.activeAlert.text).width;
    var boxWidth = textWidth + 32;
    var boxHeight = 22;
    var boxX = (displayWidth - boxWidth) / 2;

    ctx.save();
    // Glassmorphic panel background
    ctx.fillStyle = 'rgba(8, 9, 13, 0.94)';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    
    ctx.beginPath();
    // Draw rounded rect
    if (ctx.roundRect) {
      ctx.roundRect(boxX, yOffset, boxWidth, boxHeight, 6);
    } else {
      ctx.rect(boxX, yOffset, boxWidth, boxHeight);
    }
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Blinking red warning indicator light
    var blink = Math.floor(now / 200) % 2 === 0;
    ctx.beginPath();
    ctx.arc(boxX + 12, yOffset + 11, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = blink ? '#ff453a' : 'rgba(255, 69, 58, 0.2)';
    ctx.shadowColor = '#ff453a';
    ctx.shadowBlur = blink ? 6 : 0;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Alert details text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(instance.activeAlert.text, boxX + 22, yOffset + 11);
    ctx.restore();
  }

  ctx.restore();

  // Queue next frame
  instance.animationFrameId = requestAnimationFrame(function() {
    window.LogisticsTransitHUD._drawFrame(containerSelector);
  });
};
