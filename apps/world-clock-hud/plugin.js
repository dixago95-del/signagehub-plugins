/**
 * SignageHub World Clock HUD Overlay Plugin
 * Manages multiple timezone display cards using native browser Intl.DateTimeFormat APIs.
 */

// Private state scoped to the module instance
const state = {
  initialized: false,
  suspended: false,
  container: null,
  overlayElement: null,
  config: null,
  updateIntervalId: null
};

/**
 * 1. init(config)
 * Prepares the clock state, reading the desired timezones and format parameters.
 * @param {Object} config - Configuration options (e.g., timezones list, locale override)
 */
export async function init(config = {}) {
  state.config = {
    timezones: [
      { label: 'London', zone: 'Europe/London' },
      { label: 'New York', zone: 'America/New_York' },
      { label: 'Tokyo', zone: 'Asia/Tokyo' }
    ],
    locale: 'en-US',
    ...config
  };

  state.initialized = true;
  console.log('[World Clock HUD] Initialized with config:', state.config);
}

/**
 * 2. mount(container)
 * Instantiates the DOM element as a transparent overlay and appends it to the container.
 * Starts a timer to update the clock times every second.
 * @param {HTMLElement} container - The target browser container/wrapper element
 */
export function mount(container) {
  if (!state.initialized) {
    throw new Error('[World Clock HUD] Cannot mount. Run init() first.');
  }
  if (!container) {
    throw new Error('[World Clock HUD] Container element is required.');
  }

  state.container = container;

  // Create absolute-positioned transparent overlay
  const overlay = document.createElement('div');
  overlay.id = 'sh-world-clock-hud';

  // Apply strict overlay styling constraints
  Object.assign(overlay.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '1000',
    pointerEvents: 'none', // Allow overlay transparent pass-through
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '24px',
    boxSizing: 'border-box',
    opacity: '0',
    transition: 'opacity 0.5s ease-in-out',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  });

  // Create container card for the clocks
  overlay.innerHTML = `
    <div class="clocks-container" style="
      pointer-events: auto; /* Enable mouse clicks specifically on the clock bar */
      background: rgba(10, 10, 15, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 16px 24px;
      color: #ffffff;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      display: flex;
      gap: 24px;
      align-items: center;
    ">
      <!-- Individual timezones will render here -->
    </div>
  `;

  state.overlayElement = overlay;
  state.container.appendChild(overlay);

  // Initial draw and ticker startup
  updateDOM();
  startTicker();

  // Fade in overlay
  overlay.style.opacity = '1';
  console.log('[World Clock HUD] Mounted.');
}

/**
 * Starts the interval timer for updating localized timezone display.
 */
function startTicker() {
  stopTicker();
  state.updateIntervalId = setInterval(() => {
    if (!state.suspended) {
      updateDOM();
    }
  }, 1000);
}

/**
 * Stops the current interval ticker to eliminate CPU waste.
 */
function stopTicker() {
  if (state.updateIntervalId) {
    clearInterval(state.updateIntervalId);
    state.updateIntervalId = null;
  }
}

/**
 * Internal helper to safely format times using native browser Intl APIs
 * and redraw the clock segments.
 */
function updateDOM() {
  if (!state.overlayElement) return;

  const clocksCard = state.overlayElement.querySelector('.clocks-container');
  if (!clocksCard) return;

  const now = new Date();
  
  clocksCard.innerHTML = state.config.timezones.map(tz => {
    try {
      // Localized format using native Intl constraint
      const timeString = new Intl.DateTimeFormat(state.config.locale, {
        timeZone: tz.zone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);

      return `
        <div style="display: flex; flex-direction: column; align-items: center; min-width: 80px;">
          <span style="font-size: 10px; font-weight: 700; color: rgba(255, 255, 255, 0.4); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px;">
            ${tz.label}
          </span>
          <span style="font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; color: #ffffff;">
            ${timeString}
          </span>
        </div>
      `;
    } catch (e) {
      return `<div style="color: #ff3b30; font-size: 11px;">ERR: ${tz.label}</div>`;
    }
  }).join('<div style="width: 1px; height: 24px; background: rgba(255,255,255,0.15);"></div>');
}

/**
 * 3. update(payload)
 * Receives configuration changes (e.g. updating active timezone list or locale format).
 * @param {Object} [payload] - Updated parameters
 */
export async function update(payload) {
  if (!state.overlayElement) return;

  if (payload) {
    if (payload.timezones) state.config.timezones = payload.timezones;
    if (payload.locale) state.config.locale = payload.locale;
    updateDOM();
  }
}

/**
 * 4. suspend()
 * Stops clock interval updates and hides UI to save client CPU.
 */
export function suspend() {
  if (!state.overlayElement || state.suspended) return;

  state.suspended = true;
  stopTicker();
  state.overlayElement.style.opacity = '0';
  state.overlayElement.style.display = 'none';

  console.log('[World Clock HUD] Suspended.');
}

/**
 * 5. resume()
 * Restores visibility and resumes the interval ticker loop.
 */
export function resume() {
  if (!state.overlayElement || !state.suspended) return;

  state.suspended = false;
  state.overlayElement.style.display = 'flex';
  
  startTicker();
  requestAnimationFrame(() => {
    if (state.overlayElement) {
      state.overlayElement.style.opacity = '1';
    }
  });

  console.log('[World Clock HUD] Resumed.');
}

/**
 * 6. destroy()
 * Cleans up interval timers, clears DOM nodes, and purges state properties.
 */
export function destroy() {
  stopTicker();

  if (state.overlayElement) {
    state.overlayElement.remove();
    state.overlayElement = null;
  }

  state.container = null;
  state.initialized = false;
  state.suspended = false;
  state.config = null;

  console.log('[World Clock HUD] Destroyed.');
}
