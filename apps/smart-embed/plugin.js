/**
 * SignageHub SmartEmbed HUD Overlay Plugin
 * Renders passive iframe templates like Canva, Google Slides, or Video embeds inside a 3x3 layout-grid matrix.
 */

window.SmartEmbedHUD = window.SmartEmbedHUD || {};

window.SmartEmbedHUD._instances = window.SmartEmbedHUD._instances || {};

window.SmartEmbedHUD._getInstance = function(containerSelector) {
  var selector = containerSelector || (window.SmartEmbedHUD._state && window.SmartEmbedHUD._state.containerSelector) || '#hud-container';
  window.SmartEmbedHUD._instances = window.SkyWatchHUD._instances || {}; // Use general plugin instances dictionary
  if (!window.SmartEmbedHUD._instances[selector]) {
    var defaultSettings = {
      glassOpacity: 0.8,
      scale: 1.0,
      embedUrl: '',
      fitBehavior: 'fill'
    };
    window.SmartEmbedHUD._instances[selector] = {
      containerSelector: selector,
      settings: defaultSettings,
      overlayElement: null
    };
  }
  return window.SmartEmbedHUD._instances[selector];
};

window.SmartEmbedHUD._sanitizeUrl = function(url) {
  if (!url) return '';
  var cleanUrl = url.trim();
  
  if (cleanUrl.indexOf('canva.com/design/') !== -1) {
    // Swap BOTH /edit AND /watch to /view
    cleanUrl = cleanUrl.replace(/(\/edit|\/watch)(\b|(?=\?|\/))/i, '/view');
    
    // Ensure ?embed parameter is appended for vector-sharp, UI-free loading
    if (cleanUrl.indexOf('embed') === -1) {
      cleanUrl += (cleanUrl.indexOf('?') !== -1) ? '&embed' : '?embed';
    }
  }
  
  return cleanUrl;
};

window.SmartEmbedHUD.init = function(options) {
  try {
    options = options || {};
    var containerSelector = options.container || '#hud-container';
    
    var defaultSettings = {
      glassOpacity: 0.8,
      scale: 1.0,
      embedUrl: '',
      fitBehavior: 'fill'
    };
    
    var instance = {
      containerSelector: containerSelector,
      settings: Object.assign({}, defaultSettings, options.settings || {}),
      overlayElement: null
    };
    
    window.SmartEmbedHUD._instances = window.SmartEmbedHUD._instances || {};
    window.SmartEmbedHUD._instances[containerSelector] = instance;
    window.SmartEmbedHUD._state = instance;
    
    console.log("SmartEmbed HUD: Initialized for " + containerSelector);
  } catch (err) {
    console.error("SmartEmbed HUD Init Error:", err);
  }
};

window.SmartEmbedHUD.mount = function(containerSelector) {
  try {
    var instance = window.SmartEmbedHUD._getInstance(containerSelector);
    var container = document.querySelector(instance.containerSelector) || document.body;
    
    if (!container) {
      throw new Error("Target container not found: " + instance.containerSelector);
    }

    var existingPanel = container.querySelector('.smart-embed-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    // Inject styles tag if not already injected
    var styleTag = document.getElementById('sh-smart-embed-styles');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'sh-smart-embed-styles';
      document.head.appendChild(styleTag);
    }
    
    styleTag.textContent = `
      .smart-embed-panel {
        width: 100% !important;
        height: 100% !important;
        box-sizing: border-box !important;
        position: relative !important;
        overflow: hidden !important;
        padding: 0 !important;
        margin: 0 !important;
        background: transparent !important;
        pointer-events: none !important;
        transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }
      .smart-embed-panel iframe {
        width: 100% !important;
        height: 100% !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        pointer-events: none !important;
      }
    `;

    var panel = document.createElement('div');
    panel.className = 'smart-embed-panel';
    
    container.appendChild(panel);
    instance.overlayElement = panel;

    window.SmartEmbedHUD._updatePositionAndGlass(instance.containerSelector);
    window.SmartEmbedHUD._updateDOM(instance.containerSelector);

    console.log("SmartEmbed HUD: Mounted to " + instance.containerSelector);
  } catch (err) {
    console.error("SmartEmbed HUD Mount Error:", err);
  }
};

window.SmartEmbedHUD._updatePositionAndGlass = function(containerSelector) {
  var instance = window.SmartEmbedHUD._instances[containerSelector];
  if (!instance || !instance.overlayElement || !instance.settings) return;
  
  var panel = instance.overlayElement;
  panel.style.setProperty('width', '100%', 'important');
  panel.style.setProperty('height', '100%', 'important');
  panel.style.setProperty('background', 'transparent', 'important');
  panel.style.setProperty('border', 'none', 'important');
  panel.style.setProperty('box-shadow', 'none', 'important');
  panel.style.setProperty('backdrop-filter', 'none', 'important');
  panel.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
  panel.style.setProperty('pointer-events', 'none', 'important');
};

window.SmartEmbedHUD._updateDOM = function(containerSelector) {
  var instance = window.SmartEmbedHUD._getInstance(containerSelector);
  if (!instance || !instance.overlayElement) return;
  
  var panel = instance.overlayElement;
  var iframe = panel.querySelector('iframe');
  var rawEmbedUrl = instance.settings.embedUrl || '';
  var embedUrl = window.SmartEmbedHUD._sanitizeUrl(rawEmbedUrl);
  
  if (embedUrl) {
    if (!iframe) {
      panel.innerHTML = `<iframe src="${embedUrl}" allowfullscreen="allowfullscreen" allow="fullscreen" style="pointer-events: none !important;"></iframe>`;
    } else if (iframe.getAttribute('src') !== embedUrl) {
      iframe.setAttribute('src', embedUrl);
      iframe.style.setProperty('pointer-events', 'none', 'important');
    }
  } else {
    panel.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: rgba(255,255,255,0.45); font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; border: 1px dashed rgba(255,255,255,0.15); box-sizing: border-box; pointer-events: none;">
        [ Smart Embed Empty ]
      </div>
    `;
  }
};

window.SmartEmbedHUD.update = function(arg1, arg2) {
  var newSettings, containerSelector;
  if (typeof arg1 === 'string') {
    containerSelector = arg1;
    newSettings = arg2;
  } else {
    newSettings = arg1;
    containerSelector = arg2;
  }

  var instance = window.SmartEmbedHUD._getInstance(containerSelector);
  if (!instance) return;

  if (newSettings) {
    if (newSettings.embedUrl !== undefined) {
      instance.settings.embedUrl = newSettings.embedUrl;
    }
    if (newSettings.glassOpacity !== undefined) {
      instance.settings.glassOpacity = newSettings.glassOpacity;
    }
    if (newSettings.scale !== undefined) {
      instance.settings.scale = newSettings.scale;
    }
    if (newSettings.fitBehavior !== undefined) {
      instance.settings.fitBehavior = newSettings.fitBehavior;
    }
  }

  window.SmartEmbedHUD._updatePositionAndGlass(containerSelector);
  window.SmartEmbedHUD._updateDOM(containerSelector);
};

window.SmartEmbedHUD.unmount = function(containerSelector) {
  var selector = containerSelector || (window.SmartEmbedHUD._state && window.SmartEmbedHUD._state.containerSelector) || '#hud-container';
  var instance = window.SmartEmbedHUD._instances[selector];
  if (instance && instance.overlayElement) {
    instance.overlayElement.remove();
    instance.overlayElement = null;
  }
  console.log("SmartEmbed HUD: Unmounted " + selector);
};

window.SmartEmbedHUD.destroy = function(containerSelector) {
  var selector = containerSelector || (window.SmartEmbedHUD._state && window.SkyWatchHUD._state.containerSelector) || '#hud-container';
  window.SmartEmbedHUD.unmount(selector);
  var instance = window.SmartEmbedHUD._instances[selector];
  if (instance) {
    instance.containerSelector = null;
    instance.settings = null;
    delete window.SmartEmbedHUD._instances[selector];
  }
  console.log("SmartEmbed HUD: Destroyed " + selector);
};

window.SmartEmbedHUD._state = {
  containerSelector: null,
  settings: null,
  overlayElement: null
};
