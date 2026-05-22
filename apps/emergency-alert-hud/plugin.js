/**
 * SignageHub Emergency Alert HUD Overlay Plugin
 * High-priority overlay system with strict error gating to handle severe alerts (e.g. facility evacuations, system failures).
 */

// Private state scoped to the module instance
const state = {
  initialized: false,
  suspended: false,
  container: null,
  overlayElement: null,
  config: null,
  cacheKey: 'sh_emergency_alert_cache',
  networkTimeoutMs: 2000 // Very fast timeout for critical warnings
};

/**
 * Resilient fetch wrapper with short timeouts for urgent responsiveness.
 * @param {string} url - Target alert feed
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
    console.error('[Emergency Alert HUD] Failed to fetch critical alerts:', error);
    throw error;
  }
}

/**
 * 1. init(config)
 * Configures emergency levels and sets up cache keys.
 * @param {Object} config - Configuration options
 */
export async function init(config = {}) {
  state.config = {
    apiUrl: null,
    minPriorityLevel: 3, // Only show alerts with priority level >= 3 (e.g. 1=Info, 2=Warn, 3=Critical, 4=Danger)
    allowScreenTakeover: true,
    ...config
  };

  // Seed local storage offline fallback
  try {
    if (!localStorage.getItem(state.cacheKey)) {
      // By default, no active alerts are cached (clean slate)
      localStorage.setItem(state.cacheKey, JSON.stringify({
        activeAlert: null,
        timestamp: Date.now()
      }));
    }
  } catch (e) {
    console.warn('[Emergency Alert HUD] localStorage is unavailable:', e);
  }

  state.initialized = true;
  console.log('[Emergency Alert HUD] Initialized with config:', state.config);
}

/**
 * 2. mount(container)
 * Instantiates the DOM overlay. Designed to span the entire screen with emergency red flashing banners
 * if a critical alert passes the priority gate.
 * @param {HTMLElement} container - The target browser container/wrapper element
 */
export function mount(container) {
  if (!state.initialized) {
    throw new Error('[Emergency Alert HUD] Cannot mount. Run init() first.');
  }
  if (!container) {
    throw new Error('[Emergency Alert HUD] Container element is required.');
  }

  state.container = container;

  // Create full viewport absolute overlay
  const overlay = document.createElement('div');
  overlay.id = 'sh-emergency-alert-hud';

  // Apply strict fullscreen constraints
  Object.assign(overlay.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '9999', // Higher z-index to overlay all standard HUD widgets
    pointerEvents: 'none', // Failsafe pass-through, will be updated to 'auto' if takeover active
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxSizing: 'border-box',
    opacity: '0',
    transition: 'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  });

  // Inject empty layout, style will flash if active
  overlay.innerHTML = `
    <div id="alert-banner" style="
      background: #ff3b30;
      color: #ffffff;
      padding: 32px 48px;
      border-radius: 16px;
      box-shadow: 0 20px 80px rgba(255, 59, 48, 0.4);
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      max-width: 600px;
      text-align: center;
      border: 3px solid #ffffff;
      animation: alert-pulse 1.5s infinite alternate;
    ">
      <div style="font-size: 24px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">
        ⚠️ CRITICAL ALERT
      </div>
      <div id="alert-message" style="font-size: 18px; font-weight: 600; line-height: 1.4;">
        No Active Emergency Broadcasts
      </div>
      <div style="font-size: 11px; color: rgba(255, 255, 255, 0.8); text-transform: uppercase; font-weight: 700; border-top: 1px solid rgba(255, 255, 255, 0.3); padding-top: 12px; width: 100%;">
        AUTHORIZED PERSONNEL ONLY
      </div>
    </div>

    <style>
      @keyframes alert-pulse {
        0% { transform: scale(1); box-shadow: 0 20px 80px rgba(255, 59, 48, 0.4); }
        100% { transform: scale(1.03); box-shadow: 0 20px 90px rgba(255, 59, 48, 0.8); }
      }
    </style>
  `;

  state.overlayElement = overlay;
  state.container.appendChild(overlay);

  // Synchronously draw cache on initial render
  try {
    const cached = JSON.parse(localStorage.getItem(state.cacheKey));
    if (cached && cached.activeAlert) {
      processAlertGate(cached.activeAlert);
    }
  } catch (e) {
    console.error('[Emergency Alert HUD] Error loading cache:', e);
  }

  console.log('[Emergency Alert HUD] Mounted.');
}

/**
 * Validates, filters, and displays the alert only if it meets priority requirements (Error Gating).
 * @param {Object} alertData - The alert payload
 */
function processAlertGate(alertData) {
  if (!state.overlayElement) return;

  const banner = state.overlayElement.querySelector('#alert-banner');
  const messageEl = state.overlayElement.querySelector('#alert-message');

  if (!banner || !messageEl) return;

  // Gate the alert: Verify if priority level exists and matches config criteria
  const priority = alertData.priority !== undefined ? Number(alertData.priority) : 0;

  if (priority >= state.config.minPriorityLevel && alertData.message) {
    // Alert passes gate, render to screen
    messageEl.textContent = alertData.message;
    banner.style.display = 'flex';
    
    // If screen takeover is permitted, intercept user clicks
    if (state.config.allowScreenTakeover) {
      state.overlayElement.style.pointerEvents = 'auto';
    }

    if (!state.suspended) {
      state.overlayElement.style.opacity = '1';
    }
  } else {
    // Gated or cleared: Hide banner
    banner.style.display = 'none';
    state.overlayElement.style.opacity = '0';
    state.overlayElement.style.pointerEvents = 'none';
  }
}

/**
 * 3. update(payload)
 * Updates the emergency broadcast banner, checking security gates.
 * @param {Object} [payload] - Optional raw alert payload
 */
export async function update(payload) {
  if (!state.overlayElement) return;

  let activeAlert = null;

  if (payload) {
    activeAlert = payload;
  } else if (state.config && state.config.apiUrl) {
    try {
      activeAlert = await fetchWithTimeout(state.config.apiUrl);

      // Cache the alert state
      try {
        localStorage.setItem(state.cacheKey, JSON.stringify({
          activeAlert,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('[Emergency Alert HUD] Cache write failed:', e);
      }
    } catch (err) {
      // Offline fallback: load existing cache
      try {
        const cached = JSON.parse(localStorage.getItem(state.cacheKey));
        // Valid for up to 6 hours
        if (cached && (Date.now() - cached.timestamp < 21600000)) {
          activeAlert = cached.activeAlert;
        }
      } catch (cacheErr) {
        console.error('[Emergency Alert HUD] Resilient cache read failed:', cacheErr);
      }
    }
  }

  processAlertGate(activeAlert || { priority: 0, message: null });
}

/**
 * 4. suspend()
 * Dims overlay and overrides display to save client CPU.
 */
export function suspend() {
  if (!state.overlayElement || state.suspended) return;

  state.suspended = true;
  state.overlayElement.style.opacity = '0';
  state.overlayElement.style.display = 'none';

  console.log('[Emergency Alert HUD] Suspended.');
}

/**
 * 5. resume()
 * Restores visual updates.
 */
export function resume() {
  if (!state.overlayElement || !state.suspended) return;

  state.suspended = false;
  state.overlayElement.style.display = 'flex';

  // Force tick to trigger transition
  requestAnimationFrame(() => {
    if (state.overlayElement) {
      // Verify if display active before fading back in
      const banner = state.overlayElement.querySelector('#alert-banner');
      if (banner && banner.style.display === 'flex') {
        state.overlayElement.style.opacity = '1';
      }
    }
  });

  console.log('[Emergency Alert HUD] Resumed.');
}

/**
 * 6. destroy()
 * Clears DOM nodes and invalidates references to prevent memory leaks.
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

  console.log('[Emergency Alert HUD] Destroyed.');
}
