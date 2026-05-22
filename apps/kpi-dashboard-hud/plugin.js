/**
 * SignageHub KPI Dashboard HUD Overlay Plugin
 * Visualizes operational key performance indicators (KPIs) such as server load, active sessions, and target completion progress.
 */

// Private state scoped to the module instance
const state = {
  initialized: false,
  suspended: false,
  container: null,
  overlayElement: null,
  config: null,
  cacheKey: 'sh_kpi_dashboard_cache',
  networkTimeoutMs: 2500,
  refreshIntervalId: null
};

/**
 * Resilient fetch wrapper with strict abort logic.
 * @param {string} url - Target metrics endpoint
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
    console.warn('[KPI Dashboard HUD] Metrics fetch timed out/failed. Fallback active.', error);
    throw error;
  }
}

/**
 * 1. init(config)
 * Configures the KPI metrics tracking configurations, target levels, and update speeds.
 * @param {Object} config - Configuration options
 */
export async function init(config = {}) {
  state.config = {
    apiUrl: null,
    refreshIntervalMs: 15000, // Update telemetry metrics every 15s
    ...config
  };

  // Seed local storage offline fallback
  try {
    if (!localStorage.getItem(state.cacheKey)) {
      const defaultMetrics = [
        { label: 'Active Users', value: '1,420', percent: 71, status: 'normal' },
        { label: 'API Response Time', value: '124ms', percent: 94, status: 'normal' },
        { label: 'Queue Load', value: '12%', percent: 12, status: 'normal' }
      ];
      localStorage.setItem(state.cacheKey, JSON.stringify({
        metrics: defaultMetrics,
        timestamp: Date.now()
      }));
    }
  } catch (e) {
    console.warn('[KPI Dashboard HUD] localStorage is unavailable:', e);
  }

  state.initialized = true;
  console.log('[KPI Dashboard HUD] Initialized with config:', state.config);
}

/**
 * 2. mount(container)
 * Instantiates the DOM element as an absolute overlay, positioning a clean grid
 * of performance metrics cards on the screen.
 * @param {HTMLElement} container - The target browser container/wrapper element
 */
export function mount(container) {
  if (!state.initialized) {
    throw new Error('[KPI Dashboard HUD] Cannot mount. Run init() first.');
  }
  if (!container) {
    throw new Error('[KPI Dashboard HUD] Container element is required.');
  }

  state.container = container;

  // Create absolute-positioned transparent overlay
  const overlay = document.createElement('div');
  overlay.id = 'sh-kpi-dashboard-hud';

  // Apply strict absolute positioning constraints
  Object.assign(overlay.style, {
    position: 'absolute',
    top: '0',
    right: '0', // Place on right side of the screen
    width: '100%',
    height: '100%',
    zIndex: '1000',
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: '24px',
    boxSizing: 'border-box',
    opacity: '0',
    transition: 'opacity 0.6s ease-in-out',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  });

  // Create UI card
  overlay.innerHTML = `
    <div class="kpi-card" style="
      pointer-events: auto; /* Enable interaction with metrics dashboard specifically */
      background: rgba(20, 24, 33, 0.7);
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 20px;
      color: #ffffff;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 300px;
    ">
      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255, 255, 255, 0.4); border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 6px;">
        Operations Telemetry
      </div>
      <div id="kpi-metrics-list" style="display: flex; flex-direction: column; gap: 14px;">
        <!-- Metrics rows will be injected here dynamically -->
      </div>
    </div>
  `;

  state.overlayElement = overlay;
  state.container.appendChild(overlay);

  // Synchronously draw cache on initial render
  try {
    const cached = JSON.parse(localStorage.getItem(state.cacheKey));
    if (cached && cached.metrics) {
      updateDOM(cached.metrics);
      overlay.style.opacity = '1';
    }
  } catch (e) {
    console.error('[KPI Dashboard HUD] Error loading cache:', e);
  }

  // Setup periodic updates if configured
  if (state.config.apiUrl) {
    startPolling();
  }

  console.log('[KPI Dashboard HUD] Mounted.');
}

/**
 * Handles periodic API polling for metrics.
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
 * Safely inserts metrics progress rows into the container.
 * @param {Array} metrics - The listing of performance metrics
 */
function updateDOM(metrics) {
  if (!state.overlayElement) return;

  const listContainer = state.overlayElement.querySelector('#kpi-metrics-list');
  if (!listContainer) return;

  listContainer.innerHTML = '';

  metrics.forEach(metric => {
    const itemDiv = document.createElement('div');
    Object.assign(itemDiv.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    });

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '12px',
      fontWeight: '600'
    });

    const labelSpan = document.createElement('span');
    labelSpan.style.color = 'rgba(255, 255, 255, 0.7)';
    labelSpan.textContent = metric.label;

    const valSpan = document.createElement('span');
    valSpan.style.fontVariantNumeric = 'tabular-nums';
    valSpan.textContent = metric.value;

    header.appendChild(labelSpan);
    header.appendChild(valSpan);

    // Progress bar container
    const barWrap = document.createElement('div');
    Object.assign(barWrap.style, {
      width: '100%',
      height: '6px',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '3px',
      overflow: 'hidden'
    });

    // Filled progress bar
    const barFill = document.createElement('div');
    Object.assign(barFill.style, {
      width: `${Math.min(100, Math.max(0, metric.percent))}%`,
      height: '100%',
      background: getStatusColor(metric.status),
      borderRadius: '3px',
      transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
    });

    barWrap.appendChild(barFill);
    itemDiv.appendChild(header);
    itemDiv.appendChild(barWrap);

    listContainer.appendChild(itemDiv);
  });
}

/**
 * Helper to retrieve metrics visual theme color.
 * @param {string} status 
 */
function getStatusColor(status = '') {
  switch (status.toLowerCase()) {
    case 'critical':
      return '#ff3b30'; // Red
    case 'warning':
      return '#ff9500'; // Amber
    default:
      return '#007aff'; // System Blue
  }
}

/**
 * 3. update(payload)
 * Updates dashboard telemetry via real-time telemetry or periodic network polling.
 * @param {Object} [payload] - Optional payload containing metrics array
 */
export async function update(payload) {
  if (!state.overlayElement) return;

  let freshMetrics = null;

  if (payload && Array.isArray(payload.metrics)) {
    freshMetrics = payload.metrics;
  } else if (state.config && state.config.apiUrl) {
    try {
      const response = await fetchWithTimeout(state.config.apiUrl);
      if (response && Array.isArray(response.metrics)) {
        freshMetrics = response.metrics;

        // Update local storage cache
        try {
          localStorage.setItem(state.cacheKey, JSON.stringify({
            metrics: freshMetrics,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.warn('[KPI Dashboard HUD] Cache write failed:', e);
        }
      }
    } catch (err) {
      // Offline fallback
      try {
        const cached = JSON.parse(localStorage.getItem(state.cacheKey));
        // Valid for up to 30 minutes (real-time telemetry cache limits)
        if (cached && Array.isArray(cached.metrics) && (Date.now() - cached.timestamp < 1800000)) {
          freshMetrics = cached.metrics;
        }
      } catch (cacheErr) {
        console.error('[KPI Dashboard HUD] Resilient cache read failed:', cacheErr);
      }
    }
  }

  if (freshMetrics) {
    updateDOM(freshMetrics);
    if (!state.suspended) {
      state.overlayElement.style.opacity = '1';
    }
  } else {
    // Fade out silently on complete failure
    state.overlayElement.style.opacity = '0';
    console.warn('[KPI Dashboard HUD] Operational metrics unavailable. Dashboard hidden.');
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

  console.log('[KPI Dashboard HUD] Suspended.');
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

  console.log('[KPI Dashboard HUD] Resumed.');
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

  console.log('[KPI Dashboard HUD] Destroyed.');
}
