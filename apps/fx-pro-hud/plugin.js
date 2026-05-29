window.FXProBoard = window.FXProBoard || {};
window.FXProBoard._instances = window.FXProBoard._instances || {};

window.FXProBoard.currencyMeta = {
  USD: { flag: '🇺🇸', name: 'US Dollar' },
  EUR: { flag: '🇪🇺', name: 'Euro' },
  GBP: { flag: '🇬🇧', name: 'British Pound' },
  JPY: { flag: '🇯🇵', name: 'Japanese Yen' },
  DKK: { flag: '🇩🇰', name: 'Danish Krone' },
  CHF: { flag: '🇨🇭', name: 'Swiss Franc' },
  CAD: { flag: '🇨🇦', name: 'Canadian Dollar' },
  AUD: { flag: '🇦🇺', name: 'Australian Dollar' },
  CNY: { flag: '🇨🇳', name: 'Chinese Yuan' }
};

// Base exchange matrix defaults for complete offline fallback
window.FXProBoard.fallbackRates = {
  USD: { EUR: 0.92, GBP: 0.79, JPY: 156.2, DKK: 6.87, CHF: 0.91, CAD: 1.36, AUD: 1.50, CNY: 7.24 },
  EUR: { USD: 1.08, GBP: 0.85, JPY: 169.5, DKK: 7.46, CHF: 0.99, CAD: 1.48, AUD: 1.63, CNY: 7.85 },
  GBP: { USD: 1.27, EUR: 1.17, JPY: 198.4, DKK: 8.73, CHF: 1.15, CAD: 1.73, AUD: 1.91, CNY: 9.20 },
  JPY: { USD: 0.0064, EUR: 0.0059, GBP: 0.0050, DKK: 0.044, CHF: 0.0058, CAD: 0.0087, AUD: 0.0096, CNY: 0.046 },
  DKK: { USD: 0.15, EUR: 0.13, GBP: 0.11, JPY: 22.74, CHF: 0.13, CAD: 0.20, AUD: 0.22, CNY: 1.05 },
  CHF: { USD: 1.10, EUR: 1.01, GBP: 0.87, JPY: 171.8, DKK: 7.54, CAD: 1.50, AUD: 1.65, CNY: 7.96 }
};

window.FXProBoard._getInstance = function(containerSelector) {
  var selector = containerSelector || '#hud-container';
  if (!window.FXProBoard._instances[selector]) {
    var defaultSettings = {
      fxBase: 'EUR',
      fxTargets: 'USD,EUR,GBP,JPY,CHF,CAD',
      fxMarkup: 0.0,
      glassOpacity: 0.8,
      scale: 1.0,
      customTitle: undefined,
      fitBehavior: 'auto'
    };
    window.FXProBoard._instances[selector] = {
      containerSelector: selector,
      settings: defaultSettings,
      overlayElement: null,
      fetchedData: {},
      fetchIntervalId: null
    };
  }
  return window.FXProBoard._instances[selector];
};

window.FXProBoard.init = function(options) {
  try {
    options = options || {};
    var containerSelector = options.container || '#hud-container';
    var defaultSettings = {
      fxBase: 'EUR',
      fxTargets: 'USD,EUR,GBP,JPY,CHF,CAD',
      fxMarkup: 0.0,
      glassOpacity: 0.8,
      scale: 1.0,
      customTitle: undefined,
      fitBehavior: 'auto'
    };
    var instance = {
      containerSelector: containerSelector,
      settings: Object.assign({}, defaultSettings, options.settings || {}),
      overlayElement: null,
      fetchedData: {},
      fetchIntervalId: null
    };
    window.FXProBoard._instances[containerSelector] = instance;
    console.log("FXProBoard: Initialized for " + containerSelector);
  } catch (err) {
    console.error("FXProBoard Init Error:", err);
  }
};

window.FXProBoard.mount = function(containerSelector) {
  try {
    var instance = window.FXProBoard._getInstance(containerSelector);
    var container = document.querySelector(instance.containerSelector) || document.body;

    if (!container) {
      throw new Error("Target container not found: " + instance.containerSelector);
    }

    var existingPanel = container.querySelector('.fx-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    var panel = document.createElement('div');
    panel.className = 'fx-panel';

    Object.assign(panel.style, {
      pointerEvents: 'auto',
      transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      width: '100%',
      maxWidth: '100%'
    });

    panel.innerHTML = `
      <div class="panel-header" style="
        font-size: calc(10px * var(--widget-zoom, 1.0));
        line-height: calc(12px * var(--widget-zoom, 1.0));
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: calc(0.15em * var(--widget-zoom, 1.0));
        color: #ffffff;
        background: rgba(255, 255, 255, 0.1);
        padding: calc(6px * var(--widget-zoom, 1.0)) calc(14px * var(--widget-zoom, 1.0));
        border-radius: calc(20px * var(--widget-zoom, 1.0));
        border: calc(1px * var(--widget-zoom, 1.0)) solid rgba(255, 255, 255, 0.12);
        margin: 0 auto calc(12px * var(--widget-zoom, 1.0)) auto;
        white-space: nowrap;
        text-align: center;
        width: fit-content;
      ">
        EXCHANGE RATES (BASE: ${instance.settings.fxBase || 'EUR'})
      </div>
      <table class="fx-table">
        <thead>
          <tr>
            <th style="text-align: left;">Currency</th>
            <th>We Buy</th>
            <th>We Sell</th>
            <th style="width: calc(60px * var(--widget-zoom, 1.0));">Trend</th>
          </tr>
        </thead>
        <tbody class="fx-tbody">
          <!-- Exchange rates grid -->
        </tbody>
      </table>
    `;

    container.appendChild(panel);
    instance.overlayElement = panel;

    window.FXProBoard._updatePositionAndGlass(containerSelector);
    window.FXProBoard._updateDOM(containerSelector);

    // Initial rates pull
    window.FXProBoard._fetchLiveRates(containerSelector);

    // Dynamic rates refresh every 60 seconds (for local state sync)
    if (instance.fetchIntervalId) {
      clearInterval(instance.fetchIntervalId);
    }
    instance.fetchIntervalId = setInterval(function() {
      window.FXProBoard._fetchLiveRates(containerSelector);
    }, 60 * 1000);

    console.log("FXProBoard: Mounted to " + containerSelector);
  } catch (err) {
    console.error("FXProBoard Mount Error:", err);
  }
};

window.FXProBoard.update = function(containerSelector, newSettings) {
  try {
    var instance = window.FXProBoard._getInstance(containerSelector);
    if (!instance.settings) return;

    var baseCurrencyChanged = newSettings && newSettings.fxBase !== undefined && newSettings.fxBase !== instance.settings.fxBase;
    var targetsChanged = newSettings && newSettings.fxTargets !== undefined && newSettings.fxTargets !== instance.settings.fxTargets;

    instance.settings = Object.assign({}, instance.settings, newSettings || {});

    window.FXProBoard._updatePositionAndGlass(containerSelector);
    
    if (baseCurrencyChanged || targetsChanged) {
      window.FXProBoard._fetchLiveRates(containerSelector);
    } else {
      window.FXProBoard._updateDOM(containerSelector);
    }
    console.log("FXProBoard: Updated settings for " + containerSelector + ":", newSettings);
  } catch (err) {
    console.error("FXProBoard Update Error:", err);
  }
};

window.FXProBoard.unmount = function(containerSelector) {
  var selector = containerSelector || '#hud-container';
  var instance = window.FXProBoard._instances[selector];
  if (instance) {
    if (instance.fetchIntervalId) {
      clearInterval(instance.fetchIntervalId);
      instance.fetchIntervalId = null;
    }
    if (instance.overlayElement) {
      instance.overlayElement.remove();
      instance.overlayElement = null;
    }
  }
  console.log("FXProBoard: Unmounted " + selector);
};

window.FXProBoard.destroy = function(containerSelector) {
  var selector = containerSelector || '#hud-container';
  window.FXProBoard.unmount(selector);
  var instance = window.FXProBoard._instances[selector];
  if (instance) {
    instance.containerSelector = null;
    instance.settings = null;
    delete window.FXProBoard._instances[selector];
  }
  console.log("FXProBoard: Destroyed " + selector);
};

window.FXProBoard._updatePositionAndGlass = function(containerSelector) {
  var instance = window.FXProBoard._getInstance(containerSelector);
  if (!instance.overlayElement || !instance.settings) return;

  var panel = instance.overlayElement;
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.justifyContent = 'space-evenly';
  panel.style.position = 'relative';
  panel.style.maxWidth = 'none';
  panel.style.maxHeight = 'none';
  panel.style.boxSizing = 'border-box';

  var fit = instance.settings.fitBehavior || 'auto';
  if (fit === 'auto') {
    var targets = (instance.settings.fxTargets || 'USD,EUR,GBP,JPY,CHF,CAD').split(',').map(function(c) { return c.trim().toUpperCase(); });
    var currencyCount = targets.length || 6;
    var baseWidth = 450 + 48; // 498px
    var baseHeight = 36 * currencyCount + 80;
    panel.style.setProperty('width', 'calc(' + baseWidth + 'px * var(--widget-zoom, 1.0))', 'important');
    panel.style.setProperty('height', 'calc(' + baseHeight + 'px * var(--widget-zoom, 1.0))', 'important');
  } else {
    panel.style.setProperty('width', '100%', 'important');
    panel.style.setProperty('height', '100%', 'important');
  }

  // Inner container is completely transparent; master wrapper handles glass styling
  panel.classList.remove('elevation-level-1', 'elevation-level-0');
  panel.style.setProperty('background', 'transparent', 'important');
  panel.style.setProperty('border', 'none', 'important');
  panel.style.setProperty('box-shadow', 'none', 'important');
  panel.style.setProperty('backdrop-filter', 'none', 'important');
  panel.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
  panel.style.setProperty('border-radius', '0', 'important');
  panel.style.setProperty('padding', '0', 'important');
};

window.FXProBoard._updateDOM = function(containerSelector) {
  var instance = window.FXProBoard._getInstance(containerSelector);
  if (!instance.overlayElement || !instance.settings) return;

  var tbody = instance.overlayElement.querySelector('.fx-tbody');
  if (!tbody) return;

  var settings = instance.settings || {};
  var base = settings.fxBase || 'EUR';

  // Custom Title Display
  var titleEl = instance.overlayElement.querySelector('.panel-header');
  if (titleEl) {
    var customTitle = settings.customTitle;
    if (customTitle !== undefined && customTitle.trim() === '') {
      titleEl.style.display = 'none';
    } else {
      titleEl.style.display = 'block';
      var mainTitle = (customTitle !== undefined && customTitle.trim() !== '') ? customTitle : 'EXCHANGE RATES';
      titleEl.textContent = `${mainTitle} (BASE: ${base})`;
    }
  }
  var targets = (settings.fxTargets || 'USD,EUR,GBP,JPY,CHF,CAD').split(',').map(function(c) { return c.trim().toUpperCase(); });
  var limitedTargets = targets.slice(0, 8);
  var markup = parseFloat(settings.fxMarkup || 0);

  var rates = instance.fetchedData;
  if (!rates || Object.keys(rates).length === 0) {
    rates = window.FXProBoard.fallbackRates[base] || window.FXProBoard.fallbackRates['USD'];
  }

  var currentRows = tbody.querySelectorAll('tr');
  if (currentRows.length === limitedTargets.length) {
    // In-place updates to avoid text re-flow or stutters
    limitedTargets.forEach(function(code, index) {
      var row = currentRows[index];
      var baselineRate = rates[code] || 1;
      if (baselineRate <= 0) baselineRate = 1;
      
      // Calculate dual transactional values using Retail Direct Quotation formula
      var buyVal = (1 / baselineRate) * (1 - (markup / 100));
      var sellVal = (1 / baselineRate) * (1 + (markup / 100));

      var buyNumDOM = row.querySelector('.fx-rate-num.buy');
      var sellNumDOM = row.querySelector('.fx-rate-num.sell');

      if (buyNumDOM) {
        buyNumDOM.textContent = window.FXProBoard._formatRate(buyVal, code);
      }
      if (sellNumDOM) {
        sellNumDOM.textContent = window.FXProBoard._formatRate(sellVal, code);
      }
    });
  } else {
    // Full Repaint (Initial mount or base changed)
    tbody.innerHTML = limitedTargets.map(function(code) {
      var baselineRate = rates[code] || 1;
      if (baselineRate <= 0) baselineRate = 1;
      var meta = window.FXProBoard.currencyMeta[code] || { flag: '🌐', name: code };
      
      // Calculate dual transactional values using Retail Direct Quotation formula
      var buyVal = (1 / baselineRate) * (1 - (markup / 100));
      var sellVal = (1 / baselineRate) * (1 + (markup / 100));

      // Simulate a stable direction trend indicator based on currency name character counts
      var isTrendUp = (code.charCodeAt(0) + code.charCodeAt(1)) % 2 === 0;

      return `
        <tr>
          <td>
            <div class="fx-currency-code">
              <span class="fx-currency-flag">${meta.flag}</span>
              <span>${code}</span>
              <span style="font-size: calc(10px * var(--widget-zoom, 1.0)); font-weight: 600; color: rgba(255, 255, 255, 0.35); margin-left: calc(4px * var(--widget-zoom, 1.0));">${meta.name}</span>
            </div>
          </td>
          <td>
            <span class="fx-rate-num buy">${window.FXProBoard._formatRate(buyVal, code)}</span>
          </td>
          <td>
            <span class="fx-rate-num sell">${window.FXProBoard._formatRate(sellVal, code)}</span>
          </td>
          <td style="padding-right: calc(18px * var(--widget-zoom, 1.0));">
            <span class="fx-trend-val ${isTrendUp ? 'up' : 'down'}">${isTrendUp ? '▲' : '▼'}</span>
          </td>
        </tr>
      `;
    }).join('');
  }
};

window.FXProBoard._formatRate = function(rate, code) {
  if (rate < 0.1) {
    return rate.toFixed(5);
  }
  if (rate < 2.0) {
    return rate.toFixed(4);
  }
  if (code === 'JPY') {
    return rate.toFixed(2);
  }
  return rate.toFixed(3);
};

window.FXProBoard._fetchLiveRates = async function(containerSelector) {
  var instance = window.FXProBoard._getInstance(containerSelector);
  var base = instance.settings.fxBase || 'EUR';

  // Read from 12-hour TTL cache
  var cacheKey = 'sh-fx-cache-' + base;
  try {
    var rawCache = localStorage.getItem(cacheKey);
    if (rawCache) {
      var cacheObj = JSON.parse(rawCache);
      var age = Date.now() - (cacheObj.timestamp || 0);
      if (age < 12 * 60 * 60 * 1000) { // 12 hours TTL
        instance.fetchedData = cacheObj.rates;
        window.FXProBoard._updateDOM(containerSelector);
        return;
      }
    }
  } catch (err) {
    console.warn("Failed to read FX localStorage cache:", err);
  }

  // Open access API endpoint
  var url = "https://open.er-api.com/v6/latest/" + base;

  try {
    var res = await fetch(url);
    if (!res.ok) throw new Error("HTTP error " + res.status);
    var json = await res.json();
    if (json.result !== 'success' || !json.rates) throw new Error("Rates API call failed");

    instance.fetchedData = json.rates;

    // Cache results
    try {
      var cacheObj = {
        timestamp: Date.now(),
        rates: json.rates
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheObj));
    } catch (e) {}

    window.FXProBoard._updateDOM(containerSelector);

  } catch (err) {
    console.warn("FX rates fetch error, loading cache fallback:", err);
    // Fallback to expired cache if present
    try {
      var rawCache = localStorage.getItem(cacheKey);
      if (rawCache) {
        var cacheObj = JSON.parse(rawCache);
        instance.fetchedData = cacheObj.rates;
        window.FXProBoard._updateDOM(containerSelector);
        return;
      }
    } catch (e) {}

    // Offline hardcoded rates matrix fallback
    instance.fetchedData = window.FXProBoard.fallbackRates[base] || window.FXProBoard.fallbackRates['USD'] || {};
    window.FXProBoard._updateDOM(containerSelector);
  }
};
