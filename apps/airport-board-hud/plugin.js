/**
 * SignageHub Airport Flight Board HUD Overlay Plugin
 * Implementation showcasing the strict lifecycle contract and offline-first resiliency.
 */

// Private state scoped to the module instance
const state = {
  initialized: false,
  suspended: false,
  container: null,
  overlayElement: null,
  config: null,
  cacheKey: 'sh_airport_board_cache',
  networkTimeoutMs: 3000, // Strict 3s network timeout limit
};

/**
 * Robust fetch wrapper implementing strict timeouts.
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
    console.warn('[Airport Board HUD] Network request failed or timed out. Resiliency fallback active.', error);
    throw error;
  }
}

/**
 * 1. init(config)
 * Configures the flight board plugin, initializes configuration state, and sets up offline storage.
 * @param {Object} config - Configuration options (e.g., api endpoints, gate filters, terminal, refresh rates)
 */
export async function init(config = {}) {
  state.config = {
    terminal: 'T1',
    maxFlights: 4,
    apiUrl: null,
    ...config
  };

  // Seed local storage offline fallback
  try {
    if (!localStorage.getItem(state.cacheKey)) {
      const initialCache = {
        flights: [],
        timestamp: Date.now()
      };
      localStorage.setItem(state.cacheKey, JSON.stringify(initialCache));
    }
  } catch (e) {
    console.warn('[Airport Board HUD] localStorage is unavailable:', e);
  }

  state.initialized = true;
  console.log('[Airport Board HUD] Initialized with config:', state.config);
}

/**
 * 2. mount(container)
 * Instantiates the DOM element as a transparent overlay and appends it to the container.
 * Styled with high-contrast, digital airport signage styling.
 * @param {HTMLElement} container - The target browser container/wrapper element
 */
export function mount(container) {
  if (!state.initialized) {
    throw new Error('[Airport Board HUD] Cannot mount. Run init() first.');
  }
  if (!container) {
    throw new Error('[Airport Board HUD] Container element is required.');
  }

  state.container = container;

  // Create absolute-positioned transparent overlay
  const overlay = document.createElement('div');
  overlay.id = 'sh-airport-board-hud';

  // Apply strict overlay styling constraints
  Object.assign(overlay.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '1000',
    pointerEvents: 'none', // Allows clicks to pass through to lower visual components
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start', // Place on left/top of screen
    padding: '24px',
    boxSizing: 'border-box',
    opacity: '0', // Starts transparent, fades in once data is present
    transition: 'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
    fontFamily: '"SF Mono", "Courier New", Courier, monospace'
  });

  // Create UI card with premium digital flight board look
  overlay.innerHTML = `
    <div class="flight-board-card" style="
      pointer-events: auto; /* Re-enable pointer events for the UI component itself */
      background: rgba(10, 10, 12, 0.9);
      border: 2px solid #222226;
      border-radius: 12px;
      padding: 24px;
      color: #ffb000; /* Warm amber terminal text */
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 480px;
    ">
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #222226; padding-bottom: 8px;">
        <span style="font-weight: bold; font-size: 14px; color: #ffffff;">DEPARTURES • TERMINAL ${state.config.terminal}</span>
        <span id="board-time" style="font-size: 14px; color: rgba(255, 176, 0, 0.6);">--:--</span>
      </div>
      <div style="display: grid; grid-template-columns: 80px 140px 80px 80px 80px; gap: 8px; font-size: 11px; color: rgba(255, 255, 255, 0.4); text-transform: uppercase; font-weight: bold;">
        <span>Flight</span>
        <span>Destination</span>
        <span>Time</span>
        <span>Gate</span>
        <span>Status</span>
      </div>
      <div id="flight-rows" style="display: flex; flex-direction: column; gap: 8px;">
        <!-- Rows will be injected here dynamically -->
      </div>
    </div>
  `;

  state.overlayElement = overlay;
  state.container.appendChild(overlay);

  // Sync state with local cache if present to speed up display
  try {
    const cached = JSON.parse(localStorage.getItem(state.cacheKey));
    if (cached && cached.flights && cached.flights.length > 0) {
      updateDOM(cached.flights);
      overlay.style.opacity = '1';
    }
  } catch (e) {
    console.error('[Airport Board HUD] Error reading cache on mount:', e);
  }

  // Update clock on the board
  updateClock();

  console.log('[Airport Board HUD] Mounted.');
}

/**
 * Updates the board's static clock indicator.
 */
function updateClock() {
  if (!state.overlayElement) return;
  const timeEl = state.overlayElement.querySelector('#board-time');
  if (timeEl) {
    const now = new Date();
    timeEl.textContent = now.toTimeString().split(' ')[0].substring(0, 5);
  }
}

/**
 * Safely writes flight information into the board rows without innerHTML XSS vulnerabilities.
 * @param {Array} flights - Flight listing array
 */
function updateDOM(flights) {
  if (!state.overlayElement) return;

  const rowsContainer = state.overlayElement.querySelector('#flight-rows');
  if (!rowsContainer) return;

  rowsContainer.innerHTML = '';
  updateClock();

  const activeFlights = flights.slice(0, state.config.maxFlights);

  if (activeFlights.length === 0) {
    const emptyRow = document.createElement('div');
    emptyRow.style.gridColumn = 'span 5';
    emptyRow.style.color = 'rgba(255, 176, 0, 0.4)';
    emptyRow.style.fontStyle = 'italic';
    emptyRow.style.fontSize = '13px';
    emptyRow.textContent = 'NO FLIGHTS SCHEDULED';
    rowsContainer.appendChild(emptyRow);
    return;
  }

  activeFlights.forEach(flight => {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'grid',
      gridTemplateColumns: '80px 140px 80px 80px 80px',
      gap: '8px',
      fontSize: '13px',
      lineHeight: '1.2'
    });

    const flightNo = document.createElement('span');
    flightNo.style.color = '#ffffff';
    flightNo.textContent = flight.flightNo || '---';

    const dest = document.createElement('span');
    dest.textContent = (flight.destination || '---------').toUpperCase();

    const time = document.createElement('span');
    time.textContent = flight.time || '--:--';

    const gate = document.createElement('span');
    gate.style.color = '#ffffff';
    gate.textContent = flight.gate || '--';

    const status = document.createElement('span');
    status.style.color = getStatusColor(flight.status);
    status.textContent = (flight.status || 'BOARDING').toUpperCase();

    row.appendChild(flightNo);
    row.appendChild(dest);
    row.appendChild(time);
    row.appendChild(gate);
    row.appendChild(status);

    rowsContainer.appendChild(row);
  });
}

/**
 * Color picker mapping flight status to terminal colors
 * @param {string} status 
 */
function getStatusColor(status = '') {
  const norm = status.toUpperCase();
  if (norm.includes('DELAY') || norm.includes('CANCEL')) return '#ff3b30'; // Red alerts
  if (norm.includes('BOARD') || norm.includes('NOW')) return '#34c759'; // Green call to action
  return '#ffb000'; // Default amber
}

/**
 * 3. update(payload)
 * Updates flight schedules, executing network fetches or processing pushes.
 * @param {Object} [payload] - Optional collection of raw flight information
 */
export async function update(payload) {
  if (!state.overlayElement) return;

  let finalData = null;

  if (payload && Array.isArray(payload.flights)) {
    finalData = payload.flights;
  } else if (state.config && state.config.apiUrl) {
    try {
      const response = await fetchWithTimeout(state.config.apiUrl);
      if (response && Array.isArray(response.flights)) {
        finalData = response.flights;

        // Cache the updated list
        try {
          localStorage.setItem(state.cacheKey, JSON.stringify({
            flights: finalData,
            timestamp: Date.now()
          }));
        } catch (cacheErr) {
          console.warn('[Airport Board HUD] Cache save failed:', cacheErr);
        }
      }
    } catch (netError) {
      // Offline-First cache reading fallback
      try {
        const cached = JSON.parse(localStorage.getItem(state.cacheKey));
        // Valid for up to 4 hours (rapidly updating content)
        if (cached && Array.isArray(cached.flights) && (Date.now() - cached.timestamp < 14400000)) {
          console.info('[Airport Board HUD] Using cached departures listings.');
          finalData = cached.flights;
        }
      } catch (cacheError) {
        console.error('[Airport Board HUD] Failed parsing stored flights:', cacheError);
      }
    }
  }

  // Bind values to UI or handle silence gracefully
  if (finalData) {
    updateDOM(finalData);
    if (!state.suspended) {
      state.overlayElement.style.opacity = '1';
    }
  } else {
    // Fail-Silent transition
    state.overlayElement.style.opacity = '0';
    console.warn('[Airport Board HUD] Data and cache exhausted. Board dimmed.');
  }
}

/**
 * 4. suspend()
 * Dims UI and ceases clock update routines.
 */
export function suspend() {
  if (!state.overlayElement || state.suspended) return;

  state.suspended = true;
  state.overlayElement.style.opacity = '0';
  state.overlayElement.style.display = 'none';

  console.log('[Airport Board HUD] Suspended.');
}

/**
 * 5. resume()
 * Restores visual updates and updates clocks.
 */
export function resume() {
  if (!state.overlayElement || !state.suspended) return;

  state.suspended = false;
  state.overlayElement.style.display = 'flex';

  requestAnimationFrame(() => {
    if (state.overlayElement) {
      state.overlayElement.style.opacity = '1';
      updateClock();
    }
  });

  console.log('[Airport Board HUD] Resumed.');
}

/**
 * 6. destroy()
 * Clears DOM elements and destroys instance state tracking.
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

  console.log('[Airport Board HUD] Destroyed.');
}
