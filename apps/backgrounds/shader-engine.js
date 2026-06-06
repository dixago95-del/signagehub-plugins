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
          float lineX = smoothstep(0.485, 0.495, gridVal.x);
          float lineY = smoothstep(0.485, 0.495, gridVal.y);
          float gridIntensity = max(lineX, lineY);
          
          // Faint, high-tech matrix cybernetic grid on pitch dark backdrop
          vec3 bgColor = vec3(0.015, 0.015, 0.02);
          vec3 gridColor = vec3(0.0, 0.38, 0.52);
          
          vec3 color = mix(bgColor, gridColor, gridIntensity * 0.05);
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
          
          // Smoked navy body with cyan current distortion highlights
          vec3 smokedNavy = vec3(0.03, 0.04, 0.08);
          vec3 faintCyan = vec3(0.08, 0.28, 0.35);
          vec3 ambientHighlight = vec3(0.0, 0.12, 0.20);
          
          vec3 color = mix(smokedNavy, faintCyan, mask * 0.35) + ambientHighlight * waveMix * 0.2;
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
