/**
 * SignageHub Finance Feed HUD Overlay Plugin
 * Displays real-time stock and cryptocurrency pricing indices with green/red market indicators.
 */

// Private state scoped to the module instance
const state = {
  initialized: false,
  suspended: false,
  container: null,
  overlayElement: null,
  config: null,
  cacheKey: 'sh_finance_feed_cache',
  networkTimeoutMs: 2500,
  refreshIntervalId: null
};

/**
 * Resilient fetch wrapper with strict abort logic.
 * @param {string} url - Target market endpoint
 * @returns {Promise<any>}
 */
async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), state.networkTimeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('[Finance Feed HUD] Pricing fetch timed out/failed. Fallback active.', error);
    throw error;
  }
}

/**
 * 1. init(config)
 * Configures the stocks/crypto indices to track and cache keys.
 * @param {Object} config - Configuration options
 */
export async function init(config = {}) {
  state.config = {
    apiUrl: null,
    symbols: ['BTC/USD', 'ETH/USD', 'NDAQ', 'SPX'],
    refreshIntervalMs: 30000,
    ...config
  };

  // Seed local storage offline fallback
  try {
    if (!localStorage.getItem(state.cacheKey)) {
      const defaultData = [
        { symbol: 'BTC/USD', price: '64,250.00', change: '+1.45%' },
        { symbol: 'ETH/USD', price: '3,480.20', change: '-0.32%' },
        { symbol: 'NDAQ', price: '16,210.50', change: '+0.88%' },
        { symbol: 'SPX', price: '5,120.30', change: '+0.42%' }
      ];
      localStorage.setItem(state.cacheKey, JSON.stringify({
        quotes: defaultData,
        timestamp: Date.now()
      }));
    }
  } catch (e) {
    console.warn('[Finance Feed HUD] localStorage is unavailable:', e);
  }

  state.initialized = true;
  console.log('[Finance Feed HUD] Initialized with config:', state.config);
}

/**
 * 2. mount(container)
 * Instantiates the DOM element at the top-left of the viewport as an absolute overlay
 * containing a clean grid of financial quotes.
 * @param {HTMLElement} container - The target browser container/wrapper element
 */
export function mount(container) {
  if (!state.initialized) {
    throw new Error('[Finance Feed HUD] Cannot mount. Run init() first.');
  }
  if (!container) {
    throw new Error('[Finance Feed HUD] Container element is required.');
  }

  state.container = container;

  // Create absolute-positioned transparent overlay
  const overlay = document.createElement('div');
  overlay.id = 'sh-finance-feed-hud';

  // Apply strict absolute positioning constraints
  Object.assign(overlay.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '1000',
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: '24px',
    boxSizing: 'border-box',
    opacity: '0',
    transition: 'opacity 0.6s ease-in-out',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  });

  // Create UI card
  overlay.innerHTML = `
    <div class="finance-card" style="
      pointer-events: auto; /* Enable hover/clicks on quotes list specifically */
      background: rgba(18, 18, 24, 0.7);
      backdrop-filter: blur(14px) saturate(120%);
      -webkit-backdrop-filter: blur(14px) saturate(120%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 16px;
      color: #ffffff;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 280px;
    ">
      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255, 255, 255, 0.4); border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 6px;">
        Market Indexes
      </div>
      <div id="finance-quotes-list" style="display: flex; flex-direction: column; gap: 8px;">
        <!-- Quotes will be injected here dynamically -->
      </div>
    </div>
  `;

  state.overlayElement = overlay;
  state.container.appendChild(overlay);

  // Synchronously draw cache on initial render
  try {
    const cached = JSON.parse(localStorage.getItem(state.cacheKey));
    if (cached && cached.quotes) {
      updateDOM(cached.quotes);
      overlay.style.opacity = '1';
    }
  } catch (e) {
    console.error('[Finance Feed HUD] Error loading cache:', e);
  }

  // Setup periodic updates if configured
  if (state.config.apiUrl) {
    startPolling();
  }

  console.log('[Finance Feed HUD] Mounted.');
}

/**
 * Handles periodic API polling for market information.
 */
function startPolling() {
  stopPolling();
  state.refreshIntervalId = setInterval(() => {
    if (!state.suspended) {
      update();
    }
  }, state.config.refreshIntervalMs);
}

/**
 * Clears the polling interval.
 */
function stopPolling() {
  if (state.refreshIntervalId) {
    clearInterval(state.refreshIntervalId);
    state.refreshIntervalId = null;
  }
}

/**
 * Safely inserts quotes into the container.
 * @param {Array} quotes - The listing of stock or crypto quotes
 */
function updateDOM(quotes) {
  if (!state.overlayElement) return;

  const listContainer = state.overlayElement.querySelector('#finance-quotes-list');
  if (!listContainer) return;

  listContainer.innerHTML = '';

  quotes.forEach(quote => {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '13px',
      fontWeight: '600'
    });

    const isPositive = !quote.change.startsWith('-');
    const color = isPositive ? '#34c759' : '#ff3b30'; // Green vs Red indicator
    const prefixSymbol = isPositive ? '▲' : '▼';

    const symSpan = document.createElement('span');
    symSpan.style.color = 'rgba(255, 255, 255, 0.85)';
    symSpan.textContent = quote.symbol;

    const dataWrap = document.createElement('div');
    Object.assign(dataWrap.style, {
      display: 'flex',
      gap: '12px',
      fontVariantNumeric: 'tabular-nums'
    });

    const priceSpan = document.createElement('span');
    priceSpan.textContent = quote.price;

    const changeSpan = document.createElement('span');
    changeSpan.style.color = color;
    changeSpan.textContent = `${prefixSymbol} ${quote.change.replace(/[+-]/g, '')}`;

    dataWrap.appendChild(priceSpan);
    dataWrap.appendChild(changeSpan);
    
    row.appendChild(symSpan);
    row.appendChild(dataWrap);

    listContainer.appendChild(row);
  });
}

/**
 * 3. update(payload)
 * Updates index values via real-time telemetry or periodic network polling.
 * @param {Object} [payload] - Optional payload containing pricing array
 */
export async function update(payload) {
  if (!state.overlayElement) return;

  let freshQuotes = null;

  if (payload && Array.isArray(payload.quotes)) {
    freshQuotes = payload.quotes;
  } else if (state.config && state.config.apiUrl) {
    try {
      const response = await fetchWithTimeout(state.config.apiUrl);
      if (response && Array.isArray(response.quotes)) {
        freshQuotes = response.quotes;

        // Update local storage cache
        try {
          localStorage.setItem(state.cacheKey, JSON.stringify({
            quotes: freshQuotes,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.warn('[Finance Feed HUD] Cache write failed:', e);
        }
      }
    } catch (err) {
      // Offline fallback
      try {
        const cached = JSON.parse(localStorage.getItem(state.cacheKey));
        // Valid for up to 1 hour (rapidly updating market values)
        if (cached && Array.isArray(cached.quotes) && (Date.now() - cached.timestamp < 3600000)) {
          freshQuotes = cached.quotes;
        }
      } catch (cacheErr) {
        console.error('[Finance Feed HUD] Resilient cache read failed:', cacheErr);
      }
    }
  }

  if (freshQuotes) {
    updateDOM(freshQuotes);
    if (!state.suspended) {
      state.overlayElement.style.opacity = '1';
    }
  } else {
    // Fade out silently on complete failure
    state.overlayElement.style.opacity = '0';
    console.warn('[Finance Feed HUD] Pricing data unavailable. Feed hidden.');
  }
}

/**
 * 4. suspend()
 * Halts polling timers and hides the overlay to save CPU.
 */
export function suspend() {
  if (!state.overlayElement || state.suspended) return;

  state.suspended = true;
  stopPolling();

  state.overlayElement.style.opacity = '0';
  state.overlayElement.style.display = 'none';

  console.log('[Finance Feed HUD] Suspended.');
}

/**
 * 5. resume()
 * Restores visual updates and restarts polling timers.
 */
export function resume() {
  if (!state.overlayElement || !state.suspended) return;

  state.suspended = false;
  state.overlayElement.style.display = 'flex';

  if (state.config.apiUrl) {
    startPolling();
  }

  requestAnimationFrame(() => {
    if (state.overlayElement) {
      state.overlayElement.style.opacity = '1';
    }
  });

  console.log('[Finance Feed HUD] Resumed.');
}

/**
 * 6. destroy()
 * Clears DOM, stops active intervals, and invalidates references to prevent leaks.
 */
export function destroy() {
  stopPolling();

  if (state.overlayElement) {
    state.overlayElement.remove();
    state.overlayElement = null;
  }

  state.container = null;
  state.initialized = false;
  state.suspended = false;
  state.config = null;

  console.log('[Finance Feed HUD] Destroyed.');
}
