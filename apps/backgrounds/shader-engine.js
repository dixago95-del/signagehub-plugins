/**
 * WebGL Shader Engine for SignageHub
 * Conforming to V4 Roadmap Technical Contract.
 * Highly optimized for low-power Digital Signage SOCs.
 */
(function() {
  'use strict';

  const ShaderEngine = {
    gl: null,
    program: null,
    animationFrameId: null,
    startTime: 0,
    activeShaderId: null,
    canvas: null,
    positionBuffer: null,

    // Vertex shader source: maps full screen clip space
    vertexShaderSrc: `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `,

    // Single-pass GLSL Fragment Shaders Catalog
    fragmentShaders: {
      slow_fluid: `
        precision mediump float;
        uniform float u_time;
        uniform vec2 u_resolution;

        void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          float t = u_time * 0.15;
          
          // Organic fluid style mix calculations using trig mixers (low computational load)
          float r = 0.15 + 0.15 * sin(uv.x * 2.0 + t + cos(uv.y * 3.0 + t));
          float g = 0.10 + 0.15 * cos(uv.y * 2.5 - t + sin(uv.x * 3.5 + t));
          float b = 0.25 + 0.20 * sin(uv.x * 1.5 + uv.y * 1.5 + t * 0.8);
          
          vec3 color = vec3(0.05, 0.02, 0.12) + vec3(r, g, b);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      liquid_atmosphere: `
        precision mediump float;
        uniform float u_time;
        uniform vec2 u_resolution;

        void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          float t = u_time * 0.1;
          
          // Domain warp using sine fields to simulate liquid movement
          vec2 warp = vec2(
            sin(uv.y * 3.0 + t) * 0.1,
            cos(uv.x * 3.0 - t) * 0.1
          );
          vec2 p = uv + warp;
          
          // Volumetric density mix field
          float f = 0.5 + 0.5 * cos(p.x * 4.0 + t + sin(p.y * 4.0 - t));
          
          // Fake depth using distance from center
          float dist = distance(uv, vec2(0.5, 0.5));
          float depth = smoothstep(1.0, 0.05, dist);
          
          // Bioluminescent ocean teal and dark navy base
          vec3 baseColor = vec3(0.01, 0.03, 0.08);
          vec3 teal = vec3(0.0, 0.45, 0.55);
          vec3 darkBlue = vec3(0.02, 0.08, 0.22);
          
          vec3 color = mix(baseColor, mix(darkBlue, teal, f), depth);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      aether_grid: `
        precision mediump float;
        uniform float u_time;
        uniform vec2 u_resolution;

        void main() {
          vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
          float t = u_time * 0.05;
          
          // Coordinate bending for curved perspective transform
          uv.x += sin(uv.y * 2.0 + t) * 0.15;
          uv.y += cos(uv.x * 2.0 - t) * 0.15;
          
          // Sub-grid coordinate calculation
          vec2 gridVal = abs(fract(uv * 4.0) - 0.5);
          float lineX = smoothstep(0.47, 0.5, gridVal.x);
          float lineY = smoothstep(0.47, 0.5, gridVal.y);
          float gridIntensity = max(lineX, lineY);
          
          // Much brighter cyan/neon blue grid lines
          vec3 bgColor = vec3(0.015, 0.015, 0.02);
          vec3 gridColor = vec3(0.0, 0.7, 1.0);
          
          vec3 color = mix(bgColor, gridColor, gridIntensity * 0.75);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      veil_current: `
        precision mediump float;
        uniform float u_time;
        uniform vec2 u_resolution;

        void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          float t = u_time * 0.1;
          
          // Faint cyan wave interference patterns
          float wave1 = sin(uv.x * 3.0 + t * 1.5) * cos(uv.y * 2.0 + t);
          float wave2 = cos(uv.y * 4.0 - t * 0.8) * sin(uv.x * 2.5 + t * 1.2);
          float waveMix = 0.5 + 0.5 * (wave1 + wave2);
          
          // Smoothstep glass edge masking for smoked Navy look
          float mask = smoothstep(0.3, 0.7, waveMix);
          
          // Smoked navy body with cyan current distortion highlights (brightened)
          vec3 smokedNavy = vec3(0.03, 0.04, 0.08);
          vec3 brightCyan = vec3(0.1, 0.5, 0.65);
          vec3 ambientHighlight = vec3(0.0, 0.25, 0.45);
          
          vec3 color = mix(smokedNavy, brightCyan, mask * 0.85) + ambientHighlight * waveMix * 0.55;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      orbital_core: `
        precision mediump float;
        uniform float u_time;
        uniform vec2 u_resolution;

        void main() {
          vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
          float t = u_time * 0.4;
          
          uv.y /= (uv.y + 2.5) * 0.4;
          float dist = length(uv);
          
          float ring1 = smoothstep(0.06, 0.0, abs(dist - 0.4 - sin(t) * 0.05));
          float ring2 = smoothstep(0.04, 0.0, abs(dist - 0.7 + cos(t * 0.8) * 0.04));
          float ring3 = smoothstep(0.03, 0.0, abs(dist - 1.1 + sin(t * 1.2) * 0.03));
          
          float angle = atan(uv.y, uv.x);
          float arc1 = step(0.15, sin(angle * 5.0 + t));
          float arc2 = step(0.2, cos(angle * 3.0 - t * 0.7));
          float arc3 = step(0.1, sin(angle * 7.0 + t * 1.5));
          
          float rings = (ring1 * arc1) + (ring2 * arc2 * 0.8) + (ring3 * arc3 * 0.6);
          
          float glow = 0.02 / (abs(dist - 0.4 - sin(t) * 0.05) + 0.02) * arc1;
          glow += 0.015 / (abs(dist - 0.7 + cos(t * 0.8) * 0.04) + 0.02) * arc2;
          
          vec3 bgColor = vec3(0.01, 0.01, 0.02);
          vec3 cyan = vec3(0.0, 0.85, 1.0);
          vec3 whiteGlow = vec3(0.9, 0.95, 1.0);
          
          vec3 color = bgColor + cyan * (rings + glow * 0.8) + whiteGlow * (rings * 0.4);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      quantum_horizon: `
        precision mediump float;
        uniform float u_time;
        uniform vec2 u_resolution;

        void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          float t = u_time * 0.5;
          
          float horizonY = 0.45 + sin(t * 0.5) * 0.05;
          
          float spike = sin(uv.x * 20.0 + t) * cos(uv.x * 8.0 - t * 1.5) * 0.04;
          spike += sin(uv.x * 45.0 + t * 2.0) * 0.015;
          
          float dist = abs(uv.y - horizonY - spike);
          float surface = smoothstep(horizonY + spike, horizonY + spike - 0.1, uv.y);
          float glow = 0.008 / (dist + 0.008);
          
          vec3 bgColor = vec3(0.005, 0.005, 0.01);
          vec3 glowColor = vec3(0.0, 0.9, 1.0);
          vec3 surfaceColor = vec3(0.01, 0.12, 0.25);
          vec3 coreColor = vec3(0.9, 0.95, 1.0);
          
          vec3 color = mix(bgColor, surfaceColor, surface * 0.6);
          color += glowColor * glow * 0.85;
          color += coreColor * smoothstep(0.012, 0.0, dist) * 0.7;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      astral_array: `
        precision mediump float;
        uniform float u_time;
        uniform vec2 u_resolution;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        void main() {
          vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
          float t = u_time * 0.2;
          
          float r = length(uv);
          float a = atan(uv.y, uv.x);
          
          vec2 gridCoord = vec2(r * 12.0, (a / 3.14159) * 16.0);
          vec2 ipos = floor(gridCoord);
          vec2 fpos = fract(gridCoord) - 0.5;
          
          float h = hash(ipos);
          float active = smoothstep(0.6, 0.8, sin(t + h * 6.28));
          
          float dotDist = length(fpos);
          float dots = smoothstep(0.18, 0.05, dotDist) * active;
          
          float sweeps = smoothstep(0.15, 0.0, abs(fract(r * 1.5 - t * 0.5) - 0.5)) * 0.15;
          
          vec3 bgColor = vec3(0.01, 0.01, 0.02);
          vec3 starColor = vec3(0.0, 0.95, 0.75);
          vec3 glowColor = vec3(0.0, 0.2, 0.35);
          
          vec3 color = bgColor + starColor * dots * 1.2 + glowColor * sweeps;
          color += vec3(0.0, 0.3, 0.4) * (0.05 / (r + 0.05));
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      event_plane: `
        precision mediump float;
        uniform float u_time;
        uniform vec2 u_resolution;

        void main() {
          vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
          float t = u_time * 0.3;
          
          if (uv.y < 0.0) {
            float py = -1.0 / uv.y;
            float px = uv.x * py;
            
            py += sin(px * 1.5 + t) * 0.15;
            px += cos(py * 1.5 - t) * 0.15;
            
            vec2 grid = abs(fract(vec2(px * 2.0, py * 2.0)) - 0.5);
            float lineX = smoothstep(0.46, 0.495, grid.x);
            float lineY = smoothstep(0.46, 0.495, grid.y);
            float gridLine = max(lineX, lineY);
            
            float depthFade = smoothstep(0.0, 8.0, py) * smoothstep(12.0, 6.0, py);
            
            vec3 bgColor = vec3(0.005, 0.005, 0.01);
            vec3 gridColor = vec3(0.0, 0.85, 1.0);
            
            vec3 color = mix(bgColor, gridColor, gridLine * depthFade * 0.85);
            gl_FragColor = vec4(color, 1.0);
          } else {
            float fade = smoothstep(0.0, 0.5, uv.y);
            gl_FragColor = vec4(vec3(0.005, 0.005, 0.01) * (1.0 - fade), 1.0);
          }
        }
      `,
      neural_aurora: `
        precision mediump float;
        uniform float u_time;
        uniform vec2 u_resolution;

        void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          float t = u_time * 0.15;
          
          float diag1 = uv.x + uv.y;
          float diag2 = uv.x - uv.y;
          
          float wave1 = sin(diag1 * 3.5 - t * 2.0) * cos(diag2 * 2.0 + t);
          float wave2 = cos(diag2 * 4.5 + t * 1.5) * sin(diag1 * 2.5 - t * 0.8);
          float mixWave = 0.5 + 0.5 * (wave1 + wave2);
          
          float auroraField = smoothstep(0.2, 0.8, mixWave);
          float tealCore = smoothstep(0.65, 0.85, mixWave);
          
          vec3 darkPurple = vec3(0.04, 0.01, 0.08);
          vec3 magenta = vec3(0.65, 0.0, 0.45);
          vec3 neonTeal = vec3(0.0, 0.95, 0.8);
          
          vec3 color = mix(darkPurple, magenta, auroraField * 0.7);
          color = mix(color, neonTeal, tealCore * 0.8);
          color += neonTeal * tealCore * 0.35;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    },

    init: function(canvas) {
      if (this.canvas === canvas && this.gl) return true;
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!this.gl) {
        console.warn("ShaderEngine: WebGL not supported.");
        return false;
      }
      return true;
    },

    createShader: function(gl, type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("ShaderEngine: Compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    },

    createProgram: function(gl, vertexSource, fragmentSource) {
      const vs = this.createShader(gl, gl.VERTEX_SHADER, vertexSource);
      const fs = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
      if (!vs || !fs) return null;

      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("ShaderEngine: Linking error:", gl.getProgramInfoLog(program));
        return null;
      }
      return program;
    },

    start: function(canvas, shaderId) {
      this.stop();
      if (!this.init(canvas)) return;

      const gl = this.gl;
      const fsSource = this.fragmentShaders[shaderId];
      if (!fsSource) {
        console.error("ShaderEngine: Unknown shader ID:", shaderId);
        return;
      }

      this.program = this.createProgram(gl, this.vertexShaderSrc, fsSource);
      if (!this.program) return;

      this.activeShaderId = shaderId;
      this.startTime = performance.now();

      // Setup static full-screen quad geometries
      this.positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]), gl.STATIC_DRAW);

      const render = (time) => {
        if (!this.activeShaderId) return;
        this.draw(time);
        this.animationFrameId = requestAnimationFrame(render);
      };

      this.animationFrameId = requestAnimationFrame(render);
    },

    draw: function(currentTime) {
      const gl = this.gl;
      const canvas = this.canvas;
      if (!gl || !canvas) return;

      // Fit canvas viewport to client boundary
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      gl.useProgram(this.program);

      const posLoc = gl.getAttribLocation(this.program, "position");
      gl.enableVertexAttribArray(posLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      const timeLoc = gl.getUniformLocation(this.program, "u_time");
      const resLoc = gl.getUniformLocation(this.program, "u_resolution");

      const elapsedSeconds = (currentTime - this.startTime) / 1000.0;
      gl.uniform1f(timeLoc, elapsedSeconds);
      gl.uniform2f(resLoc, canvas.width, canvas.height);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },

    stop: function() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      this.activeShaderId = null;
      if (this.gl && this.program) {
        this.gl.useProgram(null);
        this.gl.deleteProgram(this.program);
        this.program = null;
      }
      if (this.gl && this.positionBuffer) {
        this.gl.deleteBuffer(this.positionBuffer);
        this.positionBuffer = null;
      }
    }
  };

  window.ShaderEngine = ShaderEngine;
})();
