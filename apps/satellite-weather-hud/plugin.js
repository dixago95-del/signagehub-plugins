window.FXSatelliteWeather = window.FXSatelliteWeather || {};
window.FXSatelliteWeather._instances = window.FXSatelliteWeather._instances || {};

window.FXSatelliteWeather._getInstance = function(containerSelector) {
  var selector = containerSelector || '#hud-container';
  if (!window.FXSatelliteWeather._instances[selector]) {
    var defaultSettings = {
      radarMode: 'rain',
      radarOpacity: 0.8,
      radarSpeed: 1.5,
      glassOpacity: 0.8,
      scale: 1.0,
      customTitle: undefined
    };
    
    // Pre-calculate 8 procedural weather cells
    var nodes = [];
    for (var i = 0; i < 8; i++) {
      nodes.push({
        x: Math.random(),
        y: Math.random(),
        r: 1.5 + Math.random() * 2.5,
        intensity: Math.random(),
        vx: (Math.random() - 0.5) * 2.0,
        vy: (Math.random() - 0.5) * 2.0
      });
    }

    window.FXSatelliteWeather._instances[selector] = {
      containerSelector: selector,
      settings: defaultSettings,
      overlayElement: null,
      canvas: null,
      animationFrameId: null,
      lastFrameTime: null,
      nodes: nodes,
      radarMetadata: null
    };
  }
  return window.FXSatelliteWeather._instances[selector];
};

window.FXSatelliteWeather.init = function(options) {
  try {
    options = options || {};
    var containerSelector = options.container || '#hud-container';
    var defaultSettings = {
      radarMode: 'rain',
      radarOpacity: 0.8,
      radarSpeed: 1.5,
      glassOpacity: 0.8,
      scale: 1.0,
      customTitle: undefined
    };
    
    var nodes = [];
    for (var i = 0; i < 8; i++) {
      nodes.push({
        x: Math.random(),
        y: Math.random(),
        r: 1.5 + Math.random() * 2.5,
        intensity: Math.random(),
        vx: (Math.random() - 0.5) * 2.0,
        vy: (Math.random() - 0.5) * 2.0
      });
    }

    var instance = {
      containerSelector: containerSelector,
      settings: Object.assign({}, defaultSettings, options.settings || {}),
      overlayElement: null,
      canvas: null,
      animationFrameId: null,
      lastFrameTime: null,
      nodes: nodes,
      radarMetadata: null
    };
    
    window.FXSatelliteWeather._instances[containerSelector] = instance;
    window.FXSatelliteWeather._fetchRadarData(containerSelector);
    console.log("FXSatelliteWeather: Initialized for " + containerSelector);
  } catch (err) {
    console.error("FXSatelliteWeather Init Error:", err);
  }
};

window.FXSatelliteWeather._fetchRadarData = function(containerSelector) {
  var instance = window.FXSatelliteWeather._getInstance(containerSelector);
  if (!instance) return;

  var cacheKeyData = 'sh-radar-cache-data';
  var cacheKeyTs = 'sh-radar-cache-ts';

  var cachedData = localStorage.getItem(cacheKeyData);
  var cachedTs = localStorage.getItem(cacheKeyTs);
  var now = Date.now();

  if (cachedData && cachedTs && (now - parseInt(cachedTs, 10) < 15 * 60 * 1000)) {
    console.log("FXSatelliteWeather: Serving radar metadata from localStorage cache.");
    try {
      instance.radarMetadata = JSON.parse(cachedData);
      window.FXSatelliteWeather._onMetadataLoaded(containerSelector);
      return;
    } catch(e) {
      console.warn("FXSatelliteWeather: Failed to parse cached metadata, refetching.");
    }
  }

  fetch('https://api.rainviewer.com/public/weather-maps.json')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      localStorage.setItem(cacheKeyData, JSON.stringify(data));
      localStorage.setItem(cacheKeyTs, now.toString());
      instance.radarMetadata = data;
      console.log("FXSatelliteWeather: Metadata loaded from RainViewer API successfully.");
      window.FXSatelliteWeather._onMetadataLoaded(containerSelector);
    })
    .catch(function(err) {
      console.warn("FXSatelliteWeather: API Fetch failed. Serving fallback mock radar dataset.", err);
      if (cachedData) {
        try {
          instance.radarMetadata = JSON.parse(cachedData);
          window.FXSatelliteWeather._onMetadataLoaded(containerSelector);
          return;
        } catch(e) {}
      }
      instance.radarMetadata = null;
      window.FXSatelliteWeather._onMetadataLoaded(containerSelector);
    });
};

window.FXSatelliteWeather._onMetadataLoaded = function(containerSelector) {
  var instance = window.FXSatelliteWeather._getInstance(containerSelector);
  if (instance && instance.radarMetadata) {
    console.log("FXSatelliteWeather: Active radar timestamp available: " + instance.radarMetadata.generated);
  }
};

window.FXSatelliteWeather.mount = function(containerSelector) {
  try {
    var instance = window.FXSatelliteWeather._getInstance(containerSelector);
    var container = document.querySelector(instance.containerSelector) || document.body;

    if (!container) {
      throw new Error("Target container not found: " + instance.containerSelector);
    }

    var existingPanel = container.querySelector('.radar-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    var panel = document.createElement('div');
    panel.className = 'radar-panel';

    Object.assign(panel.style, {
      pointerEvents: 'auto',
      transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      borderRadius: '24px',
      boxSizing: 'border-box'
    });

    // Extract slot ID index for dynamic styling
    var slotId = 'default';
    var matches = instance.containerSelector.match(/slot-(\d+)/);
    if (matches && matches[1]) {
      slotId = matches[1];
    }

    panel.innerHTML = `
      <div class="panel-header" style="
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: #ffffff;
        background: rgba(255, 255, 255, 0.1);
        padding: 6px 14px;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        margin: 0 auto 12px auto;
        white-space: nowrap;
        text-align: center;
        width: fit-content;
      ">
        SATELLITE RADAR LAYER
      </div>
      <canvas class="radar-canvas-${slotId} radar-canvas-overlay" style="display: block;"></canvas>
    `;

    container.appendChild(panel);
    instance.overlayElement = panel;
    instance.canvas = panel.querySelector('.radar-canvas-overlay');

    window.FXSatelliteWeather._updatePositionAndGlass(containerSelector);
    window.FXSatelliteWeather._updateStyles(containerSelector);
    
    // Start animation loop
    instance.lastFrameTime = Date.now();
    window.FXSatelliteWeather._drawRadar(containerSelector);

    console.log("FXSatelliteWeather: Mounted to " + containerSelector);
  } catch (err) {
    console.error("FXSatelliteWeather Mount Error:", err);
  }
};

window.FXSatelliteWeather.update = function(containerSelector, newSettings) {
  try {
    var instance = window.FXSatelliteWeather._getInstance(containerSelector);
    if (!instance.settings) return;

    instance.settings = Object.assign({}, instance.settings, newSettings || {});
    window.FXSatelliteWeather._updatePositionAndGlass(containerSelector);
    window.FXSatelliteWeather._updateStyles(containerSelector);
  } catch (err) {
    console.error("FXSatelliteWeather Update Error:", err);
  }
};

window.FXSatelliteWeather._updateStyles = function(containerSelector) {
  var instance = window.FXSatelliteWeather._getInstance(containerSelector);
  if (!instance.settings) return;

  var slotId = 'default';
  var matches = instance.containerSelector.match(/slot-(\d+)/);
  if (matches && matches[1]) {
    slotId = matches[1];
  }

  var styleId = 'sh-radar-style-' + slotId;
  var existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  var settings = instance.settings;
  var opacityVal = settings.radarOpacity !== undefined ? parseFloat(settings.radarOpacity) : 0.8;

  var styleNode = document.createElement('style');
  styleNode.id = styleId;
  styleNode.textContent = `
    @keyframes radar-drift-sweep-${slotId} {
      0% {
        transform: translate3d(-4px, -3px, 0) scale(0.99);
        opacity: ${opacityVal * 0.9};
      }
      50% {
        transform: translate3d(4px, 3px, 0) scale(1.02);
        opacity: ${opacityVal * 1.1};
      }
      100% {
        transform: translate3d(-2px, 5px, 0) scale(0.97);
        opacity: ${opacityVal * 0.9};
      }
    }
    .radar-canvas-${slotId} {
      will-change: transform, opacity;
      animation: radar-drift-sweep-${slotId} 15s ease-in-out infinite alternate;
    }
  `;
  document.head.appendChild(styleNode);
};

window.FXSatelliteWeather.unmount = function(containerSelector) {
  var selector = containerSelector || '#hud-container';
  var instance = window.FXSatelliteWeather._instances[selector];
  if (instance) {
    if (instance.animationFrameId) {
      cancelAnimationFrame(instance.animationFrameId);
      instance.animationFrameId = null;
    }
    if (instance.overlayElement) {
      instance.overlayElement.remove();
      instance.overlayElement = null;
    }
    
    // Clear canvas reference and resize
    if (instance.canvas) {
      instance.canvas.width = 0;
      instance.canvas.height = 0;
      instance.canvas = null;
    }
    
    // Remove dynamic styles
    var slotId = 'default';
    var matches = selector.match(/slot-(\d+)/);
    if (matches && matches[1]) {
      slotId = matches[1];
    }
    var styleId = 'sh-radar-style-' + slotId;
    var styleNode = document.getElementById(styleId);
    if (styleNode) {
      styleNode.remove();
    }

    instance.lastFrameTime = null;
  }
  console.log("FXSatelliteWeather: Unmounted " + selector);
};

window.FXSatelliteWeather.destroy = function(containerSelector) {
  var selector = containerSelector || '#hud-container';
  window.FXSatelliteWeather.unmount(selector);
  var instance = window.FXSatelliteWeather._instances[selector];
  if (instance) {
    instance.containerSelector = null;
    instance.settings = null;
    instance.nodes = [];
    instance.radarMetadata = null;
    delete window.FXSatelliteWeather._instances[selector];
  }
  console.log("FXSatelliteWeather: Destroyed " + selector);
};

window.FXSatelliteWeather._updatePositionAndGlass = function(containerSelector) {
  var instance = window.FXSatelliteWeather._getInstance(containerSelector);
  if (!instance.overlayElement || !instance.settings) return;

  var panel = instance.overlayElement;
  panel.style.position = 'absolute';
  panel.style.width = '320px';
  panel.style.height = '360px';
  panel.style.boxSizing = 'border-box';

  var opacity = parseFloat(instance.settings.glassOpacity);
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
    panel.style.border = '1px solid rgba(255, 255, 255, 0.08)';
    panel.style.boxShadow = '0 20px 40px rgba(0,0,0,0.5)';
  }

  panel.style.top = 'auto';
  panel.style.bottom = 'auto';
  panel.style.left = 'auto';
  panel.style.right = 'auto';
  panel.style.transform = 'none';

  var normalized = containerSelector.toLowerCase();
  var scale = (instance.settings.scale !== undefined) ? parseFloat(instance.settings.scale) : 1.0;

  if (normalized.indexOf('1') !== -1 || normalized.indexOf('top-left') !== -1) {
    panel.style.top = '30px';
    panel.style.left = '30px';
    panel.style.transformOrigin = 'top left';
    panel.style.transform = 'scale(' + scale + ')';
  } else if (normalized.indexOf('2') !== -1 || normalized.indexOf('top-center') !== -1) {
    panel.style.top = '30px';
    panel.style.left = '50%';
    panel.style.transformOrigin = 'top center';
    panel.style.transform = 'translateX(-50%) scale(' + scale + ')';
  } else if (normalized.indexOf('3') !== -1 || normalized.indexOf('top-right') !== -1) {
    panel.style.top = '30px';
    panel.style.right = '30px';
    panel.style.transformOrigin = 'top right';
    panel.style.transform = 'scale(' + scale + ')';
  } else if (normalized.indexOf('4') !== -1 || normalized.indexOf('middle-left') !== -1) {
    panel.style.top = '50%';
    panel.style.left = '30px';
    panel.style.transformOrigin = 'center left';
    panel.style.transform = 'translateY(-50%) scale(' + scale + ')';
  } else if (normalized.indexOf('5') !== -1 || normalized.indexOf('middle-center') !== -1) {
    panel.style.top = '50%';
    panel.style.left = '50%';
    panel.style.transformOrigin = 'center center';
    panel.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
  } else if (normalized.indexOf('6') !== -1 || normalized.indexOf('middle-right') !== -1) {
    panel.style.top = '50%';
    panel.style.right = '30px';
    panel.style.transformOrigin = 'center right';
    panel.style.transform = 'translateY(-50%) scale(' + scale + ')';
  } else if (normalized.indexOf('7') !== -1 || normalized.indexOf('bottom-left') !== -1) {
    panel.style.bottom = '30px';
    panel.style.left = '30px';
    panel.style.transformOrigin = 'bottom left';
    panel.style.transform = 'scale(' + scale + ')';
  } else if (normalized.indexOf('8') !== -1 || normalized.indexOf('bottom-center') !== -1) {
    panel.style.bottom = '30px';
    panel.style.left = '50%';
    panel.style.transformOrigin = 'bottom center';
    panel.style.transform = 'translateX(-50%) scale(' + scale + ')';
  } else if (normalized.indexOf('9') !== -1 || normalized.indexOf('bottom-right') !== -1) {
    panel.style.bottom = '30px';
    panel.style.right = '30px';
    panel.style.transformOrigin = 'bottom right';
    panel.style.transform = 'scale(' + scale + ')';
  } else {
    panel.style.transformOrigin = 'center center';
    panel.style.transform = 'scale(' + scale + ')';
  }
};

window.FXSatelliteWeather._drawRadar = function(containerSelector) {
  var instance = window.FXSatelliteWeather._instances[containerSelector];
  if (!instance || !instance.overlayElement || !instance.canvas) return;

  var canvas = instance.canvas;
  var ctx = canvas.getContext('2d');
  var settings = instance.settings || {};

  var displayWidth = 280;
  var displayHeight = 280;

  if (canvas.width !== displayWidth * window.devicePixelRatio || canvas.height !== displayHeight * window.devicePixelRatio) {
    canvas.width = displayWidth * window.devicePixelRatio;
    canvas.height = displayHeight * window.devicePixelRatio;
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
  }

  ctx.save();
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  ctx.clearRect(0, 0, displayWidth, displayHeight);

  var cx = displayWidth / 2;
  var cy = displayHeight / 2;
  var maxR = displayWidth * 0.44;

  ctx.beginPath();
  ctx.arc(cx, cy, maxR, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(6, 10, 18, 0.65)';
  ctx.fill();

  ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
  ctx.lineWidth = 1;
  [0.3, 0.6, 0.9].forEach(function(pct) {
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * pct, 0, 2 * Math.PI);
    ctx.stroke();
  });

  ctx.beginPath();
  ctx.moveTo(cx - maxR, cy);
  ctx.lineTo(cx + maxR, cy);
  ctx.moveTo(cx, cy - maxR);
  ctx.lineTo(cx, cy + maxR);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
  for (var angleDeg = 30; angleDeg < 360; angleDeg += 30) {
    var rad = angleDeg * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + maxR * Math.cos(rad), cy + maxR * Math.sin(rad));
    ctx.stroke();
  }

  var now = Date.now();
  if (instance.lastFrameTime) {
    var dt = (now - instance.lastFrameTime) / 1000;
    instance.nodes.forEach(function(node) {
      node.x += node.vx * dt * 0.02;
      node.y += node.vy * dt * 0.02;
      
      if (node.x < 0) node.x = 1.0;
      if (node.x > 1.0) node.x = 0;
      if (node.y < 0) node.y = 1.0;
      if (node.y > 1.0) node.y = 0;
    });
  }
  instance.lastFrameTime = now;

  var mode = settings.radarMode || 'rain';
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, maxR - 2, 0, 2 * Math.PI);
  ctx.clip();

  instance.nodes.forEach(function(node) {
    var nx = cx - maxR + node.x * (maxR * 2);
    var ny = cy - maxR + node.y * (maxR * 2);
    var radius = node.r * (maxR / 10);
    
    var grad = ctx.createRadialGradient(nx, ny, 1, nx, ny, radius);

    if (mode === 'rain') {
      if (node.intensity > 0.75) {
        grad.addColorStop(0, 'rgba(255, 60, 0, 0.65)');
        grad.addColorStop(0.5, 'rgba(255, 200, 0, 0.3)');
        grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
      } else if (node.intensity > 0.4) {
        grad.addColorStop(0, 'rgba(0, 240, 120, 0.6)');
        grad.addColorStop(0.6, 'rgba(0, 240, 255, 0.25)');
        grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
      } else {
        grad.addColorStop(0, 'rgba(0, 180, 255, 0.4)');
        grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
      }
    } else if (mode === 'clouds') {
      var cloudAlpha = 0.25 * node.intensity;
      grad.addColorStop(0, 'rgba(240, 248, 255, ' + cloudAlpha + ')');
      grad.addColorStop(0.6, 'rgba(200, 220, 240, ' + (cloudAlpha * 0.4) + ')');
      grad.addColorStop(1, 'rgba(200, 220, 240, 0)');
    } else if (mode === 'temp') {
      if (node.intensity > 0.6) {
        grad.addColorStop(0, 'rgba(255, 0, 128, 0.55)');
        grad.addColorStop(0.6, 'rgba(255, 128, 0, 0.25)');
        grad.addColorStop(1, 'rgba(255, 255, 0, 0)');
      } else {
        grad.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
        grad.addColorStop(0.6, 'rgba(0, 128, 255, 0.2)');
        grad.addColorStop(1, 'rgba(0, 0, 255, 0)');
      }
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(nx, ny, radius, 0, 2 * Math.PI);
    ctx.fill();
  });

  var speedHz = settings.radarSpeed !== undefined ? parseFloat(settings.radarSpeed) : 1.5;
  var sweepAngle = (now / 1000) * speedHz * Math.PI * 2;
  sweepAngle = sweepAngle % (2 * Math.PI);

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, maxR, sweepAngle - 0.28, sweepAngle, false);
  ctx.lineTo(cx, cy);
  ctx.closePath();

  var sweepGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, maxR);
  sweepGrad.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
  sweepGrad.addColorStop(1, 'rgba(0, 240, 255, 0.02)');
  ctx.fillStyle = sweepGrad;
  ctx.fill();

  var beamX = cx + maxR * Math.cos(sweepAngle);
  var beamY = cy + maxR * Math.sin(sweepAngle);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(beamX, beamY);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, maxR, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
  ctx.font = '8px Outfit, Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', cx, cy - maxR - 8);
  ctx.fillText('S', cx, cy + maxR + 8);
  ctx.fillText('E', cx + maxR + 8, cy);
  ctx.fillText('W', cx - maxR - 8, cy);

  ctx.restore();

  var titleEl = instance.overlayElement.querySelector('.panel-header');
  if (titleEl) {
    var customTitle = settings.customTitle;
    if (customTitle !== undefined && customTitle.trim() === '') {
      titleEl.style.display = 'none';
    } else {
      titleEl.style.display = 'block';
      titleEl.textContent = (customTitle !== undefined && customTitle.trim() !== '') ? customTitle : 'SATELLITE RADAR LAYER';
    }
  }

  instance.animationFrameId = requestAnimationFrame(function() {
    window.FXSatelliteWeather._drawRadar(containerSelector);
  });
};
