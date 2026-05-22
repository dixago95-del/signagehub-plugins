# SignageHub HUD Overlay Plugins & Widgets

This repository contains browser-native, static-first, and lightweight HUD (Head-Up Display) overlay plugins and widgets for SignageHub. These overlays run completely detached from the core Next.js application server and are optimized to execute efficiently in edge/browser environments.

---

## 1. Strict Lifecycle Contract

Every plugin must be implemented as a clean ES module (or factory function) and **must export** the following lifecycle methods:

| Method | Signature | Description |
| :--- | :--- | :--- |
| `init` | `async init(config)` | Sets up initial state, registers configurations, and initializes local storage or cache handles. |
| `mount` | `mount(container)` | Spawns the DOM element, styles it as a transparent absolute-positioned overlay, and appends it to the provided host `container`. |
| `update` | `update(payload)` | Receives new real-time telemetry or API data, sanitizes it, and safely updates the DOM. |
| `suspend`| `suspend()` | Halts active animations, pauses timers/intervals, and hides the UI to conserve client CPU. |
| `resume` | `resume()` | Restarts timers/animations and restores UI visibility. |
| `destroy`| `destroy()` | Unmounts elements, detaches all event listeners, and cancels timers to prevent memory leaks. |

---

## 2. Technical Stack Constraints

* **Strictly Lightweight**: Built with Vanilla JS (ES6+), native Web Components, or pre-compiled static Svelte.
* **No Framework Bloat**: Heavy libraries and virtual DOM frameworks (React, Redux, Angular, Vue, etc.) are **strictly forbidden**.
* **Zero Dependency Mindset**: Rely on native browser APIs (`fetch`, `AbortController`, CSS animations) to keep bundle sizes minimal and boot times near-instant.

---

## 3. Offline-First & Resiliency Guidelines

* **Strict Network Timeouts**: Any network request must enforce a strict **2-3 second timeout** using an `AbortController`.
* **Graceful Degradation**: Always fall back to `localStorage` or a cached state (`last_good_payload.json`) when offline or on network failure.
* **Silent Failure / Smooth Fade-out**: If the network is down and the cache is expired/empty, do **not** show spinning loading indicators or browser error messages. Instead, apply a CSS opacity fade-out to transition the widget out of view cleanly.
* **Data Sanitization**: Always sanitize and validate incoming payloads in `update()` before injecting them into the DOM (e.g., avoiding `innerHTML` with untrusted data).

---

## 4. Surgical Development Scope

* **Subdirectory Isolation**: Only touch files within the specific plugin subdirectory you are assigned to (e.g., `apps/glass-weather-hud/*`).
* Do not introduce global dependencies or alter cross-widget configurations unless explicitly instructed.
