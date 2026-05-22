/**
 * SignageHub Glass Weather HUD Overlay Plugin
 * Reference architecture showcasing the strict lifecycle contract and offline-first resiliency.
 */

// Private state scoped to the module instance
const state = {
  initialized: false,
  suspended: false,
  container: null,
  overlayElement: null,
  config: null,
  cacheKey: 'sh_glass_weather_cache',
  networkTimeoutMs: 2500, // Strict 2.5s network timeout limit
};

/**
 * Robust fetch wrapper implementing strict timeouts for edge performance.
 * @param {string} url - Target endpoint
 * @returns {Promise<any>}
 */
async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), state.networkTimeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP network error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('[Glass Weather HUD] Network request failed or timed out. Resiliency fallback active.', error);
    throw error;
  }
}

/**
 * 1. init(config)
 * Configures the plugin, validates input parameters, and prepares local caching layer.
 * @param {Object} config - Configuration options (e.g., api endpoints, location, update rules)
 */
export async function init(config = {}) {
  state.config = {
    city: 'San Francisco',
    units: 'metric', // 'metric' or 'imperial'
    apiUrl: null,
    ...config
  };

  // Pre-seed local storage fallback if empty
  try {
    if (!localStorage.getItem(state.cacheKey)) {
      const initialCache = {
        temp: '--',
        condition: 'Offline Cache Empty',
        timestamp: Date.now()
      };
      localStorage.setItem(state.cacheKey, JSON.stringify(initialCache));
    }
  } catch (e) {
    console.warn('[Glass Weather HUD] localStorage is unavailable:', e);
  }

  state.initialized = true;
  console.log('[Glass Weather HUD] Initialized with config:', state.config);
}

/**
 * 2. mount(container)
 * Instantiates the DOM node and appends it to the container as a transparent absolute-positioned overlay.
 * Uses inline premium styles (glassmorphic layout) rather than external utility dependencies.
 * @param {HTMLElement} container - The target browser container/wrapper element
 */
export function mount(container) {
  if (!state.initialized) {
    throw new Error('[Glass Weather HUD] Cannot mount. Run init() first.');
  }
  if (!container) {
    throw new Error('[Glass Weather HUD] Container element is required.');
  }

  state.container = container;

  // Create absolute-positioned transparent overlay
  const overlay = document.createElement('div');
  overlay.id = 'sh-glass-weather-hud';

  // Apply strict overlay styling constraints
  Object.assign(overlay.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '1000',
    pointerEvents: 'none', // Critical: allows mouse events to pass through to underlying layers
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: '24px',
    boxSizing: 'border-box',
    opacity: '0', // Start transparent, fade in when data arrives
    transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  });

  // Create UI card with premium glassmorphic styling
  overlay.innerHTML = `
    <div class="weather-card" style="
      pointer-events: auto; /* Enable mouse interaction only on the card itself */
      background: rgba(15, 18, 25, 0.4);
      backdrop-filter: blur(20px) saturate(120%);
      -webkit-backdrop-filter: blur(20px) saturate(120%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 20px;
      color: #ffffff;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 250px;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    ">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255, 255, 255, 0.5);">
        Current Weather
      </div>
      <div id="weather-city" style="font-size: 18px; font-weight: 600;">--</div>
      <div style="display: flex; align-items: baseline; gap: 4px;">
        <span id="weather-temp" style="font-size: 42px; font-weight: 700; line-height: 1;">--</span>
        <span id="weather-unit" style="font-size: 18px; font-weight: 400; color: rgba(255, 255, 255, 0.8);">°C</span>
      </div>
      <div id="weather-desc" style="font-size: 13px; font-weight: 500; color: rgba(255, 255, 255, 0.8);">--</div>
    </div>
  `;

  state.overlayElement = overlay;
  state.container.appendChild(overlay);

  // Synchronously populate UI with cached data if available to prevent flash of empty states
  try {
    const cached = JSON.parse(localStorage.getItem(state.cacheKey));
    if (cached && cached.temp !== '--') {
      updateDOM(cached);
      overlay.style.opacity = '1';
    }
  } catch (e) {
    console.error('[Glass Weather HUD] Error rendering cached data:', e);
  }

  console.log('[Glass Weather HUD] Mounted.');
}

/**
 * Internal helper to safely update HUD DOM values to prevent XSS.
 * @param {Object} data 
 */
function updateDOM(data) {
  if (!state.overlayElement) return;

  const cityEl = state.overlayElement.querySelector('#weather-city');
  const tempEl = state.overlayElement.querySelector('#weather-temp');
  const descEl = state.overlayElement.querySelector('#weather-desc');
  const unitEl = state.overlayElement.querySelector('#weather-unit');

  if (cityEl) cityEl.textContent = state.config?.city || 'Local';
  if (tempEl) tempEl.textContent = data.temp !== undefined ? data.temp : '--';
  if (descEl) descEl.textContent = data.condition || 'Unknown';
  if (unitEl && state.config) {
    unitEl.textContent = state.config.units === 'metric' ? '°C' : '°F';
  }
}

/**
 * 3. update(payload)
 * Receives telemetry or triggers a resilient offline-first API pull.
 * @param {Object} [payload] - Optional real-time weather update data
 */
export async function update(payload) {
  if (!state.overlayElement) return;

  let finalData = null;

  if (payload) {
    // Process external telemetry pushes directly
    finalData = payload;
  } else if (state.config && state.config.apiUrl) {
    // Perform self-fetching lifecycle with resiliency wrapper
    try {
      finalData = await fetchWithTimeout(state.config.apiUrl);
      
      // Update cache on success
      try {
        localStorage.setItem(state.cacheKey, JSON.stringify({
          ...finalData,
          timestamp: Date.now()
        }));
      } catch (cacheErr) {
        console.warn('[Glass Weather HUD] Failed to write cache update:', cacheErr);
      }
    } catch (netError) {
      // Offline-First Fallback
      try {
        const cached = JSON.parse(localStorage.getItem(state.cacheKey));
        // Check cache validity (must be less than 24 hours old)
        if (cached && (Date.now() - cached.timestamp < 86400000)) {
          console.info('[Glass Weather HUD] Operating on valid fallback cached state.');
          finalData = cached;
        }
      } catch (cacheError) {
        console.error('[Glass Weather HUD] Resilient cache parse failure:', cacheError);
      }
    }
  }

  // Update UI and toggle visibility
  if (finalData) {
    updateDOM(finalData);
    if (!state.suspended) {
      state.overlayElement.style.opacity = '1';
    }
  } else {
    // Fail-Silent: Fade out cleanly without showing browser errors
    state.overlayElement.style.opacity = '0';
    console.warn('[Glass Weather HUD] Resiliency limit reached. Screen cache dead. Faded out widget.');
  }
}

/**
 * 4. suspend()
 * Conserves screen/client CPU resources when the overlay goes out of focus.
 */
export function suspend() {
  if (!state.overlayElement || state.suspended) return;

  state.suspended = true;
  state.overlayElement.style.opacity = '0';
  
  // Fully deactivate visibility/layout processing for browser paint optimization
  state.overlayElement.style.display = 'none';
  console.log('[Glass Weather HUD] Suspended.');
}

/**
 * 5. resume()
 * Restores visibility and animations when screen focus returns.
 */
export function resume() {
  if (!state.overlayElement || !state.suspended) return;

  state.suspended = false;
  state.overlayElement.style.display = 'flex';

  // Force tick representation to prevent browser opacity transition skip
  requestAnimationFrame(() => {
    if (state.overlayElement) {
      state.overlayElement.style.opacity = '1';
    }
  });

  console.log('[Glass Weather HUD] Resumed.');
}

/**
 * 6. destroy()
 * Cleans up DOM, drops state, and invalidates references to prevent leaks.
 */
export function destroy() {
  if (state.overlayElement) {
    state.overlayElement.remove();
    state.overlayElement = null;
  }

  state.container = null;
  state.initialized = false;
  state.suspended = false;
  state.config = null;

  console.log('[Glass Weather HUD] Destroyed.');
}
