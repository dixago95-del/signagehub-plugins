/**
 * SignageHub Ambient Ticker HUD Overlay Plugin
 * Manages aggregated feeds (RSS/Atom or API text feeds) in a scrolling marquee ticker.
 */

// Private state scoped to the module instance
const state = {
  initialized: false,
  suspended: false,
  container: null,
  overlayElement: null,
  config: null,
  cacheKey: 'sh_ambient_ticker_cache',
  networkTimeoutMs: 3000,
  feedFetchIntervalId: null
};

/**
 * Resilient fetch wrapper with strict abort logic.
 * @param {string} url - Target feed endpoint
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
    console.warn('[Ambient Ticker HUD] Feed fetch timed out/failed. Reading cache fallback.', error);
    throw error;
  }
}

/**
 * 1. init(config)
 * Sets up the ticker configuration, default news headlines, and storage caches.
 * @param {Object} config - Configuration settings
 */
export async function init(config = {}) {
  state.config = {
    feedUrl: null,
    scrollSpeedSec: 15,
    defaultFeeds: [
      'Welcome to SignageHub - Dynamic Overlay Network Active',
      'Environment telemetry matches normal operations profiles',
      'All local service connections reporting stable latency'
    ],
    ...config
  };

  // Seed local storage offline fallback
  try {
    if (!localStorage.getItem(state.cacheKey)) {
      localStorage.setItem(state.cacheKey, JSON.stringify({
        feeds: state.config.defaultFeeds,
        timestamp: Date.now()
      }));
    }
  } catch (e) {
    console.warn('[Ambient Ticker HUD] localStorage is unavailable:', e);
  }

  state.initialized = true;
  console.log('[Ambient Ticker HUD] Initialized with config:', state.config);
}

/**
 * 2. mount(container)
 * Instantiates the DOM element at the bottom of the viewport as an absolute overlay
 * with a scrolling glass-background banner.
 * @param {HTMLElement} container - The target browser container/wrapper element
 */
export function mount(container) {
  if (!state.initialized) {
    throw new Error('[Ambient Ticker HUD] Cannot mount. Run init() first.');
  }
  if (!container) {
    throw new Error('[Ambient Ticker HUD] Container element is required.');
  }

  state.container = container;

  // Create bottom absolute overlay
  const overlay = document.createElement('div');
  overlay.id = 'sh-ambient-ticker-hud';

  // Apply absolute layout constraints (bottom align, full width)
  Object.assign(overlay.style, {
    position: 'absolute',
    bottom: '0',
    left: '0',
    width: '100%',
    height: '60px',
    zIndex: '1000',
    pointerEvents: 'none',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(5, 5, 10, 0.75)',
    backdropFilter: 'blur(10px)',
    -webkit-backdropFilter: 'blur(10px)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    overflow: 'hidden',
    opacity: '0',
    transition: 'opacity 0.8s ease',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  });

  // Inject marquee wrapper structure (Vanilla CSS animations preferred to avoid JS scheduler overhead)
  overlay.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      padding: 0 24px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #34c759; /* Accent status indicator */
      border-right: 1px solid rgba(255, 255, 255, 0.15);
      height: 100%;
      white-space: nowrap;
      z-index: 2;
    ">
      LIVE FEED
    </div>
    <div class="ticker-wrap" style="
      overflow: hidden;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      position: relative;
    ">
      <div id="ticker-track" style="
        display: flex;
        gap: 80px;
        white-space: nowrap;
        position: absolute;
        will-change: transform;
        animation: sh-ticker-slide ${state.config.scrollSpeedSec}s linear infinite;
        padding-left: 100%;
      ">
        <!-- Feed items will be populated dynamically -->
      </div>
    </div>

    <style>
      @keyframes sh-ticker-slide {
        0% { transform: translate3d(0, 0, 0); }
        100% { transform: translate3d(-100%, 0, 0); }
      }
    </style>
  `;

  state.overlayElement = overlay;
  state.container.appendChild(overlay);

  // Synchronously draw cache on initial render
  try {
    const cached = JSON.parse(localStorage.getItem(state.cacheKey));
    if (cached && cached.feeds) {
      updateDOM(cached.feeds);
      overlay.style.opacity = '1';
    }
  } catch (e) {
    console.error('[Ambient Ticker HUD] Error loading cache:', e);
  }

  // Setup periodic feed polling if configured
  if (state.config.feedUrl) {
    startFeedPolling();
  }

  console.log('[Ambient Ticker HUD] Mounted.');
}

/**
 * Handles polling interval for news headlines feed.
 */
function startFeedPolling() {
  stopFeedPolling();
  state.feedFetchIntervalId = setInterval(() => {
    if (!state.suspended) {
      update();
    }
  }, 120000); // Poll every 2 mins
}

/**
 * Clears the polling interval.
 */
function stopFeedPolling() {
  if (state.feedFetchIntervalId) {
    clearInterval(state.feedFetchIntervalId);
    state.feedFetchIntervalId = null;
  }
}

/**
 * Safely inserts feed items into the track node.
 * @param {Array<string>} items - The listing of scrolling headlines
 */
function updateDOM(items) {
  if (!state.overlayElement) return;

  const track = state.overlayElement.querySelector('#ticker-track');
  if (!track) return;

  track.innerHTML = '';
  items.forEach(text => {
    const item = document.createElement('span');
    Object.assign(item.style, {
      fontSize: '14px',
      fontWeight: '500',
      color: '#ffffff',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px'
    });

    // Unicode bullet separator
    item.innerHTML = `<span>${text}</span> <span style="color: rgba(255,255,255,0.3); margin-left: 40px;">•</span>`;
    track.appendChild(item);
  });

  // Adjust animation duration dynamically based on text length to keep speeds uniform
  const trackWidth = track.scrollWidth;
  const viewportWidth = state.overlayElement.clientWidth;
  const speedCoefficient = 100; // pixels per second
  const duration = Math.max(state.config.scrollSpeedSec, (trackWidth + viewportWidth) / speedCoefficient);
  track.style.animationDuration = `${duration}s`;
}

/**
 * 3. update(payload)
 * Updates the feed list via real-time telemetry or periodic network polling.
 * @param {Object} [payload] - Optional payload containing updated feeds array
 */
export async function update(payload) {
  if (!state.overlayElement) return;

  let freshFeeds = null;

  if (payload && Array.isArray(payload.feeds)) {
    freshFeeds = payload.feeds;
  } else if (state.config && state.config.feedUrl) {
    try {
      freshFeeds = await fetchWithTimeout(state.config.feedUrl);
      
      // Update cache
      try {
        localStorage.setItem(state.cacheKey, JSON.stringify({
          feeds: freshFeeds,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('[Ambient Ticker HUD] Cache write failed:', e);
      }
    } catch (err) {
      // Offline fallback
      try {
        const cached = JSON.parse(localStorage.getItem(state.cacheKey));
        if (cached && Array.isArray(cached.feeds)) {
          freshFeeds = cached.feeds;
        }
      } catch (cacheErr) {
        console.error('[Ambient Ticker HUD] Resilient cache read failed:', cacheErr);
      }
    }
  }

  if (freshFeeds) {
    updateDOM(freshFeeds);
    if (!state.suspended) {
      state.overlayElement.style.opacity = '1';
    }
  } else {
    // Fade out silently on complete failure
    state.overlayElement.style.opacity = '0';
    console.warn('[Ambient Ticker HUD] Feed content unavailable. Ticker hidden.');
  }
}

/**
 * 4. suspend()
 * Halts CSS animation tracking and hides the ticker.
 */
export function suspend() {
  if (!state.overlayElement || state.suspended) return;

  state.suspended = true;
  stopFeedPolling();
  
  // Pause animation to stop client graphics loop operations
  const track = state.overlayElement.querySelector('#ticker-track');
  if (track) {
    track.style.animationPlayState = 'paused';
  }

  state.overlayElement.style.opacity = '0';
  state.overlayElement.style.display = 'none';

  console.log('[Ambient Ticker HUD] Suspended.');
}

/**
 * 5. resume()
 * Restores the scrolling layout and restarts timers.
 */
export function resume() {
  if (!state.overlayElement || !state.suspended) return;

  state.suspended = false;
  state.overlayElement.style.display = 'flex';

  if (state.config.feedUrl) {
    startFeedPolling();
  }

  const track = state.overlayElement.querySelector('#ticker-track');
  if (track) {
    track.style.animationPlayState = 'running';
  }

  requestAnimationFrame(() => {
    if (state.overlayElement) {
      state.overlayElement.style.opacity = '1';
    }
  });

  console.log('[Ambient Ticker HUD] Resumed.');
}

/**
 * 6. destroy()
 * Clears DOM, stops active intervals, and invalidates references to prevent leaks.
 */
export function destroy() {
  stopFeedPolling();

  if (state.overlayElement) {
    state.overlayElement.remove();
    state.overlayElement = null;
  }

  state.container = null;
  state.initialized = false;
  state.suspended = false;
  state.config = null;

  console.log('[Ambient Ticker HUD] Destroyed.');
}
