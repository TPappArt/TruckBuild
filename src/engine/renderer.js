import { materials } from './materials.js';
import { determinant3, identity, lookAt, multiply, normalMatrix, perspective } from './math.js';

// A deliberately small WebGL renderer: one shader, soft "toy plastic"
// lighting, and a flat projected shadow on the ground. That is everything
// a handful of ~200-triangle parts on a turntable needs, and it runs on any
// phone. WebGL 1 is used on purpose for the widest device support.

const VERTEX = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uViewProj;
uniform mat4 uModel;
uniform mat3 uNormal;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorld = world.xyz;
  vNormal = uNormal * aNormal;
  gl_Position = uViewProj * world;
}`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec3 uColor;
uniform vec3 uEye;
uniform vec3 uLight;
uniform vec3 uSky;
uniform vec3 uBounce;
uniform float uSpec;
uniform float uShine;
uniform float uGlow;
uniform float uShadow;
uniform float uClip;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  // Shadow pass: geometry is flattened onto the ground and drawn in the
  // ground's own unlit shade, clipped to the edge of the turntable.
  if (uShadow > 0.5 && dot(vWorld.xz, vWorld.xz) > uClip * uClip) discard;
  vec3 n = uShadow > 0.5 ? vec3(0.0, 1.0, 0.0) : normalize(vNormal);
  vec3 v = normalize(uEye - vWorld);

  // Wrapped diffuse keeps the dark side soft and readable, like a toy.
  float wrap = dot(n, uLight) * 0.5 + 0.5;
  float direct = (1.0 - uShadow) * wrap * wrap;
  vec3 ambient = mix(uBounce, uSky, n.y * 0.5 + 0.5);
  vec3 color = uColor * (ambient * 0.5 + direct * 0.95);

  vec3 h = normalize(uLight + v);
  color += (1.0 - uShadow) * uSpec * pow(max(dot(n, h), 0.0), uShine);
  color += uSky * pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.16 * (n.y * 0.5 + 0.5);

  color = mix(color, uColor * 1.35, uGlow);
  gl_FragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.0);
}`;

export function createRenderer(canvas) {
  const options = { antialias: true, alpha: true };
  const gl = canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
  if (!gl) throw new Error('WebGL is not available');

  let program;
  let uniforms;
  let attributes;
  let buffers;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`Shader failed to compile: ${gl.getShaderInfoLog(shader)}`);
    }
    return shader;
  }

  function setup() {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Shader failed to link: ${gl.getProgramInfoLog(program)}`);
    }
    uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const { name } = gl.getActiveUniform(program, i);
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    attributes = {
      position: gl.getAttribLocation(program, 'aPosition'),
      normal: gl.getAttribLocation(program, 'aNormal'),
    };
    buffers = new WeakMap();
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);
  }
  setup();

  // Phones drop the GL context when the app is backgrounded for a while.
  canvas.addEventListener('webglcontextlost', (event) => event.preventDefault());
  canvas.addEventListener('webglcontextrestored', setup);

  function upload(geometry) {
    let entry = buffers.get(geometry);
    if (!entry) {
      const make = (target, data) => {
        const buffer = gl.createBuffer();
        gl.bindBuffer(target, buffer);
        gl.bufferData(target, data, gl.STATIC_DRAW);
        return buffer;
      };
      entry = {
        position: make(gl.ARRAY_BUFFER, geometry.positions),
        normal: make(gl.ARRAY_BUFFER, geometry.normals),
        index: make(gl.ELEMENT_ARRAY_BUFFER, geometry.indices),
        count: geometry.indices.length,
      };
      buffers.set(geometry, entry);
    }
    return entry;
  }

  const model = identity();
  const normal = new Float32Array(9);

  function draw(node, flatten) {
    if (node.geometry) {
      const world = flatten ? multiply(model, flatten, node.world) : node.world;
      if (!flatten) {
        const look = materials[node.role] || materials.dark;
        gl.uniform3fv(uniforms.uColor, look.color);
        gl.uniform1f(uniforms.uSpec, look.spec);
        gl.uniform1f(uniforms.uShine, look.shine);
        gl.uniform1f(uniforms.uGlow, look.glow);
        // Mirrored nodes (negative scale) turn triangles inside out.
        gl.frontFace(determinant3(world) < 0 ? gl.CW : gl.CCW);
      }
      gl.uniformMatrix4fv(uniforms.uModel, false, world);
      gl.uniformMatrix3fv(uniforms.uNormal, false, normalMatrix(normal, world));

      const entry = upload(node.geometry);
      gl.bindBuffer(gl.ARRAY_BUFFER, entry.position);
      gl.enableVertexAttribArray(attributes.position);
      gl.vertexAttribPointer(attributes.position, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, entry.normal);
      gl.enableVertexAttribArray(attributes.normal);
      gl.vertexAttribPointer(attributes.normal, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, entry.index);
      gl.drawElements(gl.TRIANGLES, entry.count, gl.UNSIGNED_SHORT, 0);
    }
    for (const child of node.children) draw(child, flatten);
  }

  const view = identity();
  const projection = identity();
  const viewProj = identity();

  /**
   * scene = {
   *   camera: { eye, target, fov, near?, far? },
   *   light:  unit vector pointing from the scene toward the light,
   *   root:   Node drawn lit, and as the shadow caster,
   *   ground: optional Node drawn lit but casting no shadow,
   *   shadow: optional { radius, role } - where and how the shadow lands (y = 0),
   * }
   */
  function render(scene) {
    if (gl.isContextLost()) return;
    const { camera, light } = scene;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);

    perspective(projection, camera.fov, canvas.width / canvas.height, camera.near ?? 1, camera.far ?? 60);
    lookAt(view, camera.eye, camera.target);
    multiply(viewProj, projection, view);
    gl.uniformMatrix4fv(uniforms.uViewProj, false, viewProj);
    gl.uniform3fv(uniforms.uEye, camera.eye);
    gl.uniform3fv(uniforms.uLight, light);
    gl.uniform3f(uniforms.uSky, 1.0, 1.0, 1.0);
    gl.uniform3f(uniforms.uBounce, 0.42, 0.5, 0.68);
    gl.uniform1f(uniforms.uShadow, 0);
    gl.uniform1f(uniforms.uClip, 0);

    scene.root.updateWorld();

    if (scene.ground) {
      scene.ground.updateWorld();
      draw(scene.ground);
    }

    if (scene.shadow && light[1] > 0.01) {
      // Squash everything onto the ground plane along the light direction.
      const flatten = identity();
      flatten[4] = -light[0] / light[1];
      flatten[5] = 0;
      flatten[6] = -light[2] / light[1];
      flatten[13] = 0.012;

      const look = materials[scene.shadow.role];
      gl.uniform3fv(uniforms.uColor, look.color);
      gl.uniform1f(uniforms.uSpec, 0);
      gl.uniform1f(uniforms.uShine, 1);
      gl.uniform1f(uniforms.uGlow, 0);
      gl.uniform1f(uniforms.uShadow, 1);
      gl.uniform1f(uniforms.uClip, scene.shadow.radius);
      gl.disable(gl.CULL_FACE);
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(-1, -1);
      draw(scene.root, flatten);
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.enable(gl.CULL_FACE);
      gl.uniform1f(uniforms.uShadow, 0);
    }

    draw(scene.root);
  }

  function setSize(width, height, pixelRatio = 1) {
    const w = Math.max(1, Math.round(width * pixelRatio));
    const h = Math.max(1, Math.round(height * pixelRatio));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  return { canvas, render, setSize };
}
