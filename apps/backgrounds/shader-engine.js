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
