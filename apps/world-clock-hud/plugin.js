/**
 * SignageHub World Clock HUD Overlay Plugin
 * Fully functional world clock supporting a 6-Sector screen positioning grid,
 * dynamic glass opacity settings, and 3 visualization modes (Digital, Analog, and Flip).
 * Attached to window.WorldClockHUD for offline local execution.
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

  // 2x3 Grid positioning style map (Sectors 1-3 on top, Sectors 4-6 on bottom)
  const sectorStyles = {
    1: { gridRow: '1', gridColumn: '1', justifySelf: 'start', alignSelf: 'start' },
    2: { gridRow: '1', gridColumn: '2', justifySelf: 'center', alignSelf: 'start' },
    3: { gridRow: '1', gridColumn: '3', justifySelf: 'end', alignSelf: 'start' },
    4: { gridRow: '2', gridColumn: '1', justifySelf: 'start', alignSelf: 'end' },
    5: { gridRow: '2', gridColumn: '2', justifySelf: 'center', alignSelf: 'end' },
    6: { gridRow: '2', gridColumn: '3', justifySelf: 'end', alignSelf: 'end' }
  };

  /**
   * 1. init(settings)
   * Configures timezones, displayType, sector grid position, and glassmorphic opacity.
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
      locale: settings.locale || 'en-US',
      sector: settings.sector !== undefined ? Number(settings.sector) : 2, // 1 to 6 grid position
      glassOpacity: settings.glassOpacity !== undefined ? Number(settings.glassOpacity) : 0.35 // 0.0 to 1.0
    };

    state.initialized = true;
    console.log('[World Clock HUD] Configured with Sector:', state.config.sector, 'Opacity:', state.config.glassOpacity);
  }

  /**
   * 2. mount(container)
   * Spawns a full-screen grid wrapper and appends the glassmorphic clock panel.
   * @param {HTMLElement} container - Target host container
   */
  function mount(container) {
    if (!state.initialized) {
      throw new Error('[World Clock HUD] Cannot mount before calling init().');
    }
    if (!container) {
      throw new Error('[World Clock HUD] Container element is required.');
    }

    state.container = container;

    // Ensure the host container has absolute dimensions and is positioned
    // so that the grid positioning (align-self / justify-self) actually maps correctly onto the viewport.
    Object.assign(container.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      minWidth: '100vw',
      minHeight: '100vh',
      zIndex: '100',
      pointerEvents: 'none',
      boxSizing: 'border-box'
    });

    // Create absolute-positioned 2x3 grid overlay
    const overlay = document.createElement('div');
    overlay.id = 'sh-world-clock-hud';

    // Apply strict full-viewport 2x3 grid styling with absolute dimension guarantees
    Object.assign(overlay.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      minWidth: '100vw',
      minHeight: '100vh',
      zIndex: '100',
      pointerEvents: 'none', // Allow transparency pass-through
      display: 'grid',
      gridTemplateRows: '1fr 1fr',
      gridTemplateColumns: '1fr 1fr 1fr',
      padding: '24px',
      boxSizing: 'border-box',
      opacity: '0',
      transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
    });

    // Create clocks panel
    const panel = document.createElement('div');
    panel.className = 'clocks-panel';
    
    // Set basic clocks panel styles (premium high-contrast dark-glassmorphism layout with explicit size safety)
    Object.assign(panel.style, {
      pointerEvents: 'auto', // Enable pointer events for mouse interactions on the panel itself
      backdropFilter: 'blur(20px) saturate(120%)',
      -webkit-backdropFilter: 'blur(20px) saturate(120%)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '24px',
      padding: '24px 36px',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      width: '680px',
      minHeight: '220px',
      boxSizing: 'border-box',
      transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
    });

    panel.innerHTML = `
      <div class="panel-header" style="
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: #ffffff;
        background: rgba(255, 255, 255, 0.12);
        padding: 6px 16px;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
        text-align: center;
      ">
        WORLD TIME MONITOR
      </div>
      <div class="clocks-list" style="
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 20px;
      ">
        <!-- Rendered Clocks -->
      </div>
    `;

    overlay.appendChild(panel);
    state.overlayElement = overlay;
    state.container.appendChild(overlay);

    // Initial positioning and rendering
    updatePositionAndGlass();
    updateDOM();
    startTicker();

    // Fade in with a small timeout to ensure transition triggers reliably across all engines
    setTimeout(() => {
      if (state.overlayElement) {
        state.overlayElement.style.opacity = '1';
      }
    }, 50);

    console.log('[World Clock HUD] Mounted successfully.');
  }

  /**
   * Positions the panel in the correct sector cell and applies dynamic glass opacity.
   */
  function updatePositionAndGlass() {
    if (!state.overlayElement) return;

    const panel = state.overlayElement.querySelector('.clocks-panel');
    if (!panel) return;

    // Apply grid cell positioning based on configuration sector
    const position = sectorStyles[state.config.sector] || sectorStyles[2];
    Object.assign(panel.style, position);

    // Apply dynamic dark glass background style to guarantee high contrast against light/steaming backgrounds
    panel.style.background = `rgba(15, 18, 25, ${state.config.glassOpacity})`;
  }

  /**
   * 3. update(payload)
   * Updates coordinates, visual rendering styles, and layouts.
   * @param {Object} payload - Settings updates
   */
  async function update(payload) {
    if (!state.overlayElement) return;

    if (payload) {
      if (payload.sector !== undefined) {
        state.config.sector = Number(payload.sector);
      }
      if (payload.glassOpacity !== undefined) {
        state.config.glassOpacity = Number(payload.glassOpacity);
      }
      if (Array.isArray(payload.timezones)) {
        state.config.timezones = payload.timezones.slice(0, 6);
        const listContainer = state.overlayElement.querySelector('.clocks-list');
        if (listContainer) listContainer.innerHTML = '';
      }
      if (payload.displayType) {
        state.config.displayType = payload.displayType;
        const listContainer = state.overlayElement.querySelector('.clocks-list');
        if (listContainer) listContainer.innerHTML = '';
      }
      if (payload.locale) {
        state.config.locale = payload.locale;
      }

      // Redraw updates
      updatePositionAndGlass();
      updateDOM();
    }
  }

  /**
   * 4. suspend()
   * Halts active update intervals.
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
   * Restores update loop and visibility.
   */
  function resume() {
    if (!state.overlayElement || !state.suspended) return;

    state.suspended = false;
    state.overlayElement.style.display = 'grid';

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
   * Unmounts DOM, drops state references, and terminates timers.
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

  function startTicker() {
    stopTicker();
    state.updateIntervalId = setInterval(() => {
      if (!state.suspended) {
        updateDOM();
      }
    }, 1000);
  }

  function stopTicker() {
    if (state.updateIntervalId) {
      clearInterval(state.updateIntervalId);
      state.updateIntervalId = null;
    }
  }

  /**
   * Updates rendering layout cards for each clock.
   */
  function updateDOM() {
    if (!state.overlayElement) return;

    const listContainer = state.overlayElement.querySelector('.clocks-list');
    if (!listContainer) return;

    const now = new Date();
    const displayType = state.config.displayType;

    // Check if structural setup matches list length
    const currentCount = listContainer.children.length;
    if (currentCount !== state.config.timezones.length) {
      listContainer.innerHTML = '';
      state.config.timezones.forEach((tz, index) => {
        const clockItem = document.createElement('div');
        clockItem.className = 'clock-item';
        clockItem.setAttribute('data-index', index);
        
        // High visibility card styles: dark semi-transparent backgrounds with white text.
        // This guarantees readability on light glass and dark steaming screens alike.
        Object.assign(clockItem.style, {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: '180px',
          padding: '20px',
          background: 'rgba(12, 14, 20, 0.88)', 
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          color: '#ffffff',
          boxSizing: 'border-box',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
        });

        clockItem.innerHTML = `
          <div style="font-size: 12px; font-weight: 700; color: rgba(255, 255, 255, 0.65); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px;">
            ${tz.label}
          </div>
          <div class="clock-display-wrapper" style="
            display: flex;
            justify-content: center;
            align-items: center;
            height: 120px;
            width: 100%;
          ">
            <!-- Rendered Display -->
          </div>
          <div class="clock-date" style="font-size: 10px; font-weight: 600; color: rgba(255, 255, 255, 0.45); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 12px;">
            --
          </div>
        `;

        listContainer.appendChild(clockItem);
      });
    }

    // Refresh times in each item
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
          displayWrapper.innerHTML = `<span style="color: #ff453a; font-size: 11px;">TIMEZONE ERR</span>`;
        }
        return;
      }

      if (!timeParts) return;

      if (dateEl) {
        dateEl.textContent = `${timeParts.weekday}, ${timeParts.month} ${timeParts.day}`;
      }

      const hrs = parseInt(timeParts.hour, 10);
      const mins = parseInt(timeParts.minute, 10);
      const secs = parseInt(timeParts.second, 10);

      if (displayType === 'analog') {
        // High visibility white and red SVG dials on dark background cards
        let svg = displayWrapper.querySelector('svg');
        if (!svg) {
          displayWrapper.innerHTML = `
            <svg viewBox="0 0 100 100" width="105" height="105" style="display: block;">
              <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(255, 255, 255, 0.15)" stroke-width="2" />
              <circle cx="50" cy="50" r="44" fill="rgba(0, 0, 0, 0.2)" />
              
              <line x1="50" y1="8" x2="50" y2="13" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
              <line x1="92" y1="50" x2="87" y2="50" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
              <line x1="50" y1="92" x2="50" y2="87" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
              <line x1="8" y1="50" x2="13" y2="50" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />

              <line class="h-hand" x1="50" y1="50" x2="50" y2="28" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
              <line class="m-hand" x1="50" y1="50" x2="50" y2="18" stroke="rgba(255, 255, 255, 0.85)" stroke-width="2" stroke-linecap="round" />
              <line class="s-hand" x1="50" y1="50" x2="50" y2="12" stroke="#ff453a" stroke-width="1.2" stroke-linecap="round" />
              
              <circle cx="50" cy="50" r="3.5" fill="#ffffff" />
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
        // Split-Flap Board (stays dark to preserve genuine physical look)
        const hStr = timeParts.hour;
        const mStr = timeParts.minute;
        const sStr = timeParts.second;

        if (!displayWrapper.querySelector('.flip-clock-wrapper')) {
          displayWrapper.innerHTML = `
            <div class="flip-clock-wrapper" style="display: flex; align-items: center; gap: 4px;">
              <div class="flap f-h1">0</div>
              <div class="flap f-h2">0</div>
              <div style="font-size: 24px; font-weight: bold; color: rgba(255, 255, 255, 0.4); padding: 0 4px;">:</div>
              <div class="flap f-m1">0</div>
              <div class="flap f-m2">0</div>
              <div style="font-size: 24px; font-weight: bold; color: rgba(255, 255, 255, 0.4); padding: 0 4px;">:</div>
              <div class="flap f-s1">0</div>
              <div class="flap f-s2">0</div>
            </div>
            <style>
              .flap {
                position: relative;
                background: #0f1015;
                border: 1px solid rgba(255, 255, 255, 0.15);
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
        // High visibility white digital typography
        const timeStr = `${timeParts.hour}:${timeParts.minute}:${timeParts.second}`;
        displayWrapper.innerHTML = `
          <div style="
            font-family: 'SF Mono', Consolas, monospace;
            font-size: 34px;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            color: #ffffff;
            letter-spacing: 0.08em;
            text-shadow: 0 0 10px rgba(255,255,255,0.2);
          ">
            ${timeStr}
          </div>
        `;
      }
    });
  }

  // Bind to global window scope
  window.WorldClockHUD = {
    init,
    mount,
    update,
    suspend,
    resume,
    destroy
  };
})();
