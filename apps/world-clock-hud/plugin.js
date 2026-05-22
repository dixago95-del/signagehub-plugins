/**
 * SignageHub World Clock HUD Overlay Plugin
 * Fully functional, production-ready world clock overlay with Digital, Analog, and Flip (Split-Flap) layouts.
 * Attached to window.WorldClockHUD to support non-module local testing via file:///.
 */

(function() {
  // Private state scoped to the IIFE closure
  const state = {
    initialized: false,
    suspended: false,
    container: null,
    overlayElement: null,
    config: null,
    updateIntervalId: null
  };

  /**
   * 1. init(settings)
   * Map configuration settings, supports up to 6 capitals/timezones and displayType.
   * @param {Object} settings - Configuration overrides
   */
  async function init(settings = {}) {
    const incomingTimezones = Array.isArray(settings.timezones) ? settings.timezones : [];
    const defaultTimezones = [
      { label: 'Copenhagen', zone: 'Europe/Copenhagen' },
      { label: 'Tokyo', zone: 'Asia/Tokyo' },
      { label: 'New York', zone: 'America/New_York' }
    ];

    state.config = {
      timezones: incomingTimezones.length > 0 ? incomingTimezones.slice(0, 6) : defaultTimezones,
      displayType: settings.displayType || 'digital', // 'digital', 'analog', or 'flip'
      locale: settings.locale || 'en-US'
    };

    state.initialized = true;
    console.log('[World Clock HUD] Configured displayType:', state.config.displayType);
  }

  /**
   * 2. mount(container)
   * Renders a glassmorphic container and mounts the transparent HUD overlay.
   * Starts the active ticker cycle.
   * @param {HTMLElement} container - Host DOM container
   */
  function mount(container) {
    if (!state.initialized) {
      throw new Error('[World Clock HUD] Cannot mount before calling init().');
    }
    if (!container) {
      throw new Error('[World Clock HUD] A valid container is required for mounting.');
    }

    state.container = container;

    // Create absolute-positioned transparent overlay element
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
      pointerEvents: 'none', // Critical for overlays, allows clicks to pass through
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      boxSizing: 'border-box',
      opacity: '0', // Fades in on start
      transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      fontFamily: '"Outfit", system-ui, -apple-system, sans-serif'
    });

    // Frosted-glass panel configuration
    overlay.innerHTML = `
      <div class="clocks-panel" style="
        pointer-events: auto; /* Active pointer events specifically for the dashboard card */
        background: rgba(10, 14, 22, 0.35);
        backdrop-filter: blur(25px) saturate(140%);
        -webkit-backdrop-filter: blur(25px) saturate(140%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 24px;
        padding: 36px 48px;
        color: #ffffff;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
        max-width: 90%;
        text-shadow: 0 1px 3px rgba(0,0,0,0.3);
      ">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: rgba(255, 255, 255, 0.45); border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 8px; width: 100%; text-align: center;">
          WORLD TIME MONITOR
        </div>
        <div class="clocks-list" style="
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 32px;
        ">
          <!-- Rendered clocks list populated by updateDOM -->
        </div>
      </div>
    `;

    state.overlayElement = overlay;
    state.container.appendChild(overlay);

    // Perform initial rendering and start clock tickers
    updateDOM();
    startTicker();

    // Smooth fade-in
    requestAnimationFrame(() => {
      if (state.overlayElement) {
        state.overlayElement.style.opacity = '1';
      }
    });

    console.log('[World Clock HUD] Mounted successfully.');
  }

  /**
   * 3. update(payload)
   * Safely refreshes active settings configurations and force-updates the DOM immediately.
   * @param {Object} payload - Update parameters (e.g. { timezones, displayType })
   */
  async function update(payload) {
    if (!state.overlayElement) return;

    if (payload) {
      if (Array.isArray(payload.timezones)) {
        state.config.timezones = payload.timezones.slice(0, 6);
        // Empty the list to force a rebuild of structural elements
        const listContainer = state.overlayElement.querySelector('.clocks-list');
        if (listContainer) listContainer.innerHTML = '';
      }
      if (payload.displayType) {
        state.config.displayType = payload.displayType;
        // Rebuild structure
        const listContainer = state.overlayElement.querySelector('.clocks-list');
        if (listContainer) listContainer.innerHTML = '';
      }
      if (payload.locale) {
        state.config.locale = payload.locale;
      }
      updateDOM();
    }
  }

  /**
   * 4. suspend()
   * Halts active update intervals to prevent CPU cycles on inactive displays.
   */
  function suspend() {
    if (!state.overlayElement || state.suspended) return;

    state.suspended = true;
    stopTicker();

    state.overlayElement.style.opacity = '0';
    state.overlayElement.style.display = 'none';

    console.log('[World Clock HUD] Suspended.');
  }

  /**
   * 5. resume()
   * Restores clock intervals and visibility states.
   */
  function resume() {
    if (!state.overlayElement || !state.suspended) return;

    state.suspended = false;
    state.overlayElement.style.display = 'flex';

    startTicker();
    updateDOM();

    requestAnimationFrame(() => {
      if (state.overlayElement) {
        state.overlayElement.style.opacity = '1';
      }
    });

    console.log('[World Clock HUD] Resumed.');
  }

  /**
   * 6. destroy()
   * Completely clears tickers, unmounts overlays, and purges state references.
   */
  function destroy() {
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

  /**
   * Starts clock update tick interval.
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
   * Stops clock tick interval.
   */
  function stopTicker() {
    if (state.updateIntervalId) {
      clearInterval(state.updateIntervalId);
      state.updateIntervalId = null;
    }
  }

  /**
   * Internal logic to refresh timezone readings and paint visual structures.
   */
  function updateDOM() {
    if (!state.overlayElement) return;

    const listContainer = state.overlayElement.querySelector('.clocks-list');
    if (!listContainer) return;

    const now = new Date();
    const displayType = state.config.displayType;

    // Build structure layout if length or structure does not match settings
    const currentCount = listContainer.children.length;
    if (currentCount !== state.config.timezones.length) {
      listContainer.innerHTML = '';
      state.config.timezones.forEach((tz, index) => {
        const clockItem = document.createElement('div');
        clockItem.className = 'clock-item';
        clockItem.setAttribute('data-index', index);
        Object.assign(clockItem.style, {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: '200px',
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          boxSizing: 'border-box'
        });

        clockItem.innerHTML = `
          <div style="font-size: 13px; font-weight: 700; color: rgba(255, 255, 255, 0.85); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">
            ${tz.label}
          </div>
          <div class="clock-display-wrapper" style="
            display: flex;
            justify-content: center;
            align-items: center;
            height: 120px;
            width: 100%;
          ">
            <!-- Rendered Clock (digital/analog/flip) -->
          </div>
          <div class="clock-date" style="font-size: 11px; font-weight: 500; color: rgba(255, 255, 255, 0.45); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 12px;">
            --
          </div>
        `;

        listContainer.appendChild(clockItem);
      });
    }

    // Iterate and update each timezone card
    state.config.timezones.forEach((tz, index) => {
      const clockItem = listContainer.querySelector(`.clock-item[data-index="${index}"]`);
      if (!clockItem) return;

      const displayWrapper = clockItem.querySelector('.clock-display-wrapper');
      const dateEl = clockItem.querySelector('.clock-date');

      let timeParts = null;
      try {
        const formatter = new Intl.DateTimeFormat(state.config.locale, {
          timeZone: tz.zone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          day: '2-digit',
          month: 'short',
          weekday: 'short',
          hour12: false
        });

        const parts = formatter.formatToParts(now);
        timeParts = parts.reduce((acc, part) => {
          acc[part.type] = part.value;
          return acc;
        }, {});
      } catch (err) {
        if (displayWrapper) {
          displayWrapper.innerHTML = `<span style="color: #ff3b30; font-size: 12px;">TIMEZONE ERROR</span>`;
        }
        return;
      }

      if (!timeParts) return;

      // Redraw current date
      if (dateEl) {
        dateEl.textContent = `${timeParts.weekday}, ${timeParts.month} ${timeParts.day}`;
      }

      const hrs = parseInt(timeParts.hour, 10);
      const mins = parseInt(timeParts.minute, 10);
      const secs = parseInt(timeParts.second, 10);

      // Render mode switch
      if (displayType === 'analog') {
        // 1. Analog SVG Mode
        let svg = displayWrapper.querySelector('svg');
        if (!svg) {
          displayWrapper.innerHTML = `
            <svg viewBox="0 0 100 100" width="110" height="110" style="display: block;">
              <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(255, 255, 255, 0.15)" stroke-width="2" />
              <circle cx="50" cy="50" r="44" fill="rgba(0, 0, 0, 0.2)" />
              
              <!-- Clock Dial Markers (12, 3, 6, 9) -->
              <line x1="50" y1="8" x2="50" y2="13" stroke="rgba(255, 255, 255, 0.8)" stroke-width="2" stroke-linecap="round" />
              <line x1="92" y1="50" x2="87" y2="50" stroke="rgba(255, 255, 255, 0.8)" stroke-width="2" stroke-linecap="round" />
              <line x1="50" y1="92" x2="50" y2="87" stroke="rgba(255, 255, 255, 0.8)" stroke-width="2" stroke-linecap="round" />
              <line x1="8" y1="50" x2="13" y2="50" stroke="rgba(255, 255, 255, 0.8)" stroke-width="2" stroke-linecap="round" />

              <!-- Subtler 5-minute ticks -->
              <line x1="72.5" y1="11" x2="70" y2="15.3" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
              <line x1="89" y1="27.5" x2="84.7" y2="30" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
              <line x1="89" y1="72.5" x2="84.7" y2="70" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
              <line x1="72.5" y1="89" x2="70" y2="84.7" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
              <line x1="27.5" y1="89" x2="30" y2="84.7" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
              <line x1="11" y1="72.5" x2="15.3" y2="70" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
              <line x1="11" y1="27.5" x2="15.3" y2="30" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
              <line x1="27.5" y1="11" x2="30" y2="15.3" stroke="rgba(255,255,255,0.3)" stroke-width="1" />

              <!-- Hands -->
              <line class="h-hand" x1="50" y1="50" x2="50" y2="26" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
              <line class="m-hand" x1="50" y1="50" x2="50" y2="16" stroke="rgba(255, 255, 255, 0.85)" stroke-width="2" stroke-linecap="round" />
              <line class="s-hand" x1="50" y1="50" x2="50" y2="10" stroke="#007aff" stroke-width="1.2" stroke-linecap="round" />
              
              <circle cx="50" cy="50" r="3" fill="#ffffff" />
            </svg>
          `;
          svg = displayWrapper.querySelector('svg');
        }

        const hHand = svg.querySelector('.h-hand');
        const mHand = svg.querySelector('.m-hand');
        const sHand = svg.querySelector('.s-hand');

        const sAngle = secs * 6;
        const mAngle = mins * 6 + secs * 0.1;
        const hAngle = (hrs % 12) * 30 + mins * 0.5;

        hHand.setAttribute('transform', `rotate(${hAngle}, 50, 50)`);
        mHand.setAttribute('transform', `rotate(${mAngle}, 50, 50)`);
        sHand.setAttribute('transform', `rotate(${sAngle}, 50, 50)`);

      } else if (displayType === 'flip') {
        // 2. Airport Split-Flap Mode
        const hStr = timeParts.hour;
        const mStr = timeParts.minute;
        const sStr = timeParts.second;

        if (!displayWrapper.querySelector('.flip-clock-wrapper')) {
          displayWrapper.innerHTML = `
            <div class="flip-clock-wrapper" style="display: flex; align-items: center; gap: 4px;">
              <div class="flap f-h1">0</div>
              <div class="flap f-h2">0</div>
              <div style="font-size: 24px; font-weight: bold; color: rgba(255,255,255,0.4); padding: 0 4px;">:</div>
              <div class="flap f-m1">0</div>
              <div class="flap f-m2">0</div>
              <div style="font-size: 24px; font-weight: bold; color: rgba(255,255,255,0.4); padding: 0 4px;">:</div>
              <div class="flap f-s1">0</div>
              <div class="flap f-s2">0</div>
            </div>
            <style>
              .flap {
                position: relative;
                background: #12131a;
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 6px;
                width: 32px;
                height: 48px;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: 'SF Mono', Consolas, monospace;
                font-size: 28px;
                font-weight: 700;
                color: #ff9500;
                box-shadow: inset 0 -12px 12px rgba(0, 0, 0, 0.6), 0 4px 8px rgba(0, 0, 0, 0.5);
                overflow: hidden;
              }
              .flap::after {
                content: '';
                position: absolute;
                left: 0;
                top: 50%;
                width: 100%;
                height: 1px;
                background: rgba(0, 0, 0, 0.85);
                box-shadow: 0 1px 0 rgba(255, 255, 255, 0.1);
                z-index: 2;
              }
            </style>
          `;
        }

        const fH1 = displayWrapper.querySelector('.f-h1');
        const fH2 = displayWrapper.querySelector('.f-h2');
        const fM1 = displayWrapper.querySelector('.f-m1');
        const fM2 = displayWrapper.querySelector('.f-m2');
        const fS1 = displayWrapper.querySelector('.f-s1');
        const fS2 = displayWrapper.querySelector('.f-s2');

        if (fH1.textContent !== hStr[0]) fH1.textContent = hStr[0];
        if (fH2.textContent !== hStr[1]) fH2.textContent = hStr[1];
        if (fM1.textContent !== mStr[0]) fM1.textContent = mStr[0];
        if (fM2.textContent !== mStr[1]) fM2.textContent = mStr[1];
        if (fS1.textContent !== sStr[0]) fS1.textContent = sStr[0];
        if (fS2.textContent !== sStr[1]) fS2.textContent = sStr[1];

      } else {
        // 3. Monospace Digital Mode
        const timeStr = `${timeParts.hour}:${timeParts.minute}:${timeParts.second}`;
        displayWrapper.innerHTML = `
          <div style="
            font-family: 'SF Mono', Consolas, monospace;
            font-size: 34px;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            color: #ffffff;
            letter-spacing: 0.08em;
            text-shadow: 0 0 15px rgba(255,255,255,0.25);
          ">
            ${timeStr}
          </div>
        `;
      }
    });
  }

  // Attach strictly to the global window object
  window.WorldClockHUD = {
    init,
    mount,
    update,
    suspend,
    resume,
    destroy
  };
})();
