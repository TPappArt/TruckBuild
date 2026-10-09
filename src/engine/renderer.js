import { resolveMaterial } from './materials.js';
import { determinant3, identity, lookAt, multiply, normalMatrix, perspective } from './math.js';

// A small WebGL renderer built for this game: one shader, soft "toy plastic"
// lighting, distance fog and a flat projected shadow.
//
// It is fast because of what it does not do. A whole track, or a whole
// vehicle, is a single merged mesh with colour stored per vertex (see
// bake.js), so a race is a few dozen draw calls. There are no textures and
// no shadow maps. WebGL 1 is used on purpose for the widest device support.

const VERTEX = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;
attribute vec3 aParams; // highlight strength, highlight tightness, glow
uniform mat4 uViewProj;
uniform mat4 uModel;
uniform mat3 uNormal;
uniform vec3 uEye;
uniform float uFogDensity;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vColor;
varying vec3 vParams;
varying vec2 vGround;
varying float vFog;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vNormal = uNormal * aNormal;
  vView = uEye - world.xyz;
  vColor = aColor;
  vParams = aParams;
  vGround = world.xz;
  float d = length(vView) * uFogDensity;
  vFog = 1.0 - exp(-d * d);
  gl_Position = uViewProj * world;
}`;

const FRAGMENT = `
precision mediump float;
uniform vec3 uLight;
uniform vec3 uSun;
uniform vec3 uSky;
uniform vec3 uBounce;
uniform vec3 uFogColor;
uniform float uPass; // 0 lit, 1 shadow, 2 unlit backdrop, 3 glow
uniform float uShadow;
uniform float uClip;
uniform float uPulse;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vColor;
varying vec3 vParams;
varying vec2 vGround;
varying float vFog;
void main() {
  if (uPass > 2.5) {
    // Glow: a see-through tint, strongest where the surface faces the
    // camera and fading to nothing at the rim, so a plain ball reads as a
    // soft halo. A tint rather than added light, so it shows up on snow
    // and sand as well as in the dark.
    float facing = max(dot(normalize(vNormal), normalize(vView)), 0.0);
    float glow = facing * facing * (1.0 - vFog) * uPulse;
    gl_FragColor = vec4(pow(vColor, vec3(1.0 / 2.2)), min(glow * 0.5, 1.0));
    return;
  }
  if (uPass > 1.5) {
    gl_FragColor = vec4(pow(vColor, vec3(1.0 / 2.2)), 1.0);
    return;
  }
  if (uPass > 0.5) {
    // Shadow: darken whatever is already there, fading out with the fog.
    if (uClip > 0.0 && dot(vGround, vGround) > uClip * uClip) discard;
    gl_FragColor = vec4(0.0, 0.0, 0.0, uShadow * (1.0 - vFog));
    return;
  }
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vView);

  // Wrapped diffuse keeps the dark side soft and readable, like a toy.
  float wrap = dot(n, uLight) * 0.5 + 0.5;
  vec3 ambient = mix(uBounce, uSky, n.y * 0.5 + 0.5);
  vec3 color = vColor * (ambient * 0.5 + uSun * (wrap * wrap * 0.95));

  vec3 h = normalize(uLight + v);
  color += uSun * vParams.x * pow(max(dot(n, h), 0.0), vParams.y);
  color += uSky * pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.16 * (n.y * 0.5 + 0.5);

  color = mix(color, vColor * (1.35 * uPulse), vParams.z);
  // Glowing things stay visible further into the fog.
  color = mix(color, uFogColor, vFog * (1.0 - 0.6 * vParams.z));
  gl_FragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.0);
}`;

const WHITE = [1, 1, 1];
const DEFAULT_BOUNCE = [0.42, 0.5, 0.68];

export function createRenderer(canvas) {
  const options = { antialias: true, alpha: true, stencil: true };
  const gl = canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
  if (!gl) throw new Error('WebGL is not available');

  let program;
  let uniforms;
  let buffers;
  const ATTR = { position: 0, normal: 1, color: 2, params: 3 };

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
    gl.bindAttribLocation(program, ATTR.position, 'aPosition');
    gl.bindAttribLocation(program, ATTR.normal, 'aNormal');
    gl.bindAttribLocation(program, ATTR.color, 'aColor');
    gl.bindAttribLocation(program, ATTR.params, 'aParams');
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
    buffers = new WeakMap();
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);
    gl.clearStencil(0);
  }
  setup();

  // Phones drop the GL context when the app is backgrounded for a while.
  canvas.addEventListener('webglcontextlost', (event) => event.preventDefault());
  canvas.addEventListener('webglcontextrestored', setup);

  function upload(geometry) {
    let entry = buffers.get(geometry);
    if (!entry) {
      const make = (target, data) => {
        if (!data) return null;
        const buffer = gl.createBuffer();
        gl.bindBuffer(target, buffer);
        gl.bufferData(target, data, gl.STATIC_DRAW);
        return buffer;
      };
      entry = {
        position: make(gl.ARRAY_BUFFER, geometry.positions),
        normal: make(gl.ARRAY_BUFFER, geometry.normals),
        color: make(gl.ARRAY_BUFFER, geometry.colors),
        params: make(gl.ARRAY_BUFFER, geometry.params),
        index: make(gl.ELEMENT_ARRAY_BUFFER, geometry.indices),
        count: geometry.indices.length,
      };
      buffers.set(geometry, entry);
    }
    return entry;
  }

  function bindAttribute(location, buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
  }

  const model = identity();
  const normal = new Float32Array(9);
  let drawCalls = 0;

  function draw(node, transform) {
    if (node.geometry) {
      const world = transform ? multiply(model, transform, node.world) : node.world;
      gl.uniformMatrix4fv(uniforms.uModel, false, world);
      gl.uniformMatrix3fv(uniforms.uNormal, false, normalMatrix(normal, world));
      // Mirrored nodes (negative scale) turn triangles inside out.
      gl.frontFace(determinant3(world) < 0 ? gl.CW : gl.CCW);

      const entry = upload(node.geometry);
      bindAttribute(ATTR.position, entry.position);
      bindAttribute(ATTR.normal, entry.normal);
      if (entry.color) {
        // Baked mesh: colour and material travel with each vertex.
        bindAttribute(ATTR.color, entry.color);
        bindAttribute(ATTR.params, entry.params);
      } else {
        // Plain mesh: one material for the whole thing.
        const look = resolveMaterial(node.role);
        gl.disableVertexAttribArray(ATTR.color);
        gl.disableVertexAttribArray(ATTR.params);
        gl.vertexAttrib3fv(ATTR.color, look.color);
        gl.vertexAttrib3f(ATTR.params, look.spec, look.shine, look.glow);
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, entry.index);
      gl.drawElements(gl.TRIANGLES, entry.count, gl.UNSIGNED_SHORT, 0);
      drawCalls++;
    }
    for (const child of node.children) draw(child, transform);
  }

  const view = identity();
  const projection = identity();
  const viewProj = identity();
  const follow = identity();
  const flatten = identity();

  /**
   * scene = {
   *   camera:   { eye, target, fov, near?, far? },
   *   light:    unit vector pointing from the scene toward the light,
   *   lighting: optional { sun, sky, bounce } linear colours,
   *   fog:      optional { color, density }, linear colour,
   *   pulse:    optional brightness multiplier for glowing surfaces,
   *   sky:      optional Node drawn unlit behind everything, centred on the camera,
   *   ground:   optional Node of flat layers at y = 0, drawn in order with no depth test,
   *   solids:   Nodes drawn lit and depth tested,
   *   casters:  Nodes whose shadow falls on the ground (usually also in solids),
   *   shadow:   optional { strength, clipRadius },
   *   glows:    optional Nodes drawn last as soft see-through halos,
   * }
   * Nodes must have up-to-date world matrices (Node.updateWorld).
   */
  function render(scene) {
    if (gl.isContextLost()) return;
    const { camera, light } = scene;
    const lighting = scene.lighting || {};
    const fog = scene.fog;
    drawCalls = 0;

    // With fog the far distance is the fog colour; without, leave the canvas
    // see-through so the page behind it shows.
    if (fog) gl.clearColor(...fog.color.map((c) => Math.pow(c, 1 / 2.2)), 1);
    else gl.clearColor(0, 0, 0, 0);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    gl.useProgram(program);

    perspective(projection, camera.fov, canvas.width / canvas.height, camera.near ?? 1, camera.far ?? 60);
    lookAt(view, camera.eye, camera.target);
    multiply(viewProj, projection, view);
    gl.uniformMatrix4fv(uniforms.uViewProj, false, viewProj);
    gl.uniform3fv(uniforms.uEye, camera.eye);
    gl.uniform3fv(uniforms.uLight, light);
    gl.uniform3fv(uniforms.uSun, lighting.sun || WHITE);
    gl.uniform3fv(uniforms.uSky, lighting.sky || WHITE);
    gl.uniform3fv(uniforms.uBounce, lighting.bounce || DEFAULT_BOUNCE);
    gl.uniform3fv(uniforms.uFogColor, fog ? fog.color : WHITE);
    gl.uniform1f(uniforms.uFogDensity, 0);
    gl.uniform1f(uniforms.uPulse, scene.pulse ?? 1);
    gl.uniform1f(uniforms.uClip, 0);

    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);

    if (scene.sky) {
      gl.uniform1f(uniforms.uPass, 2);
      follow[12] = camera.eye[0];
      follow[13] = camera.eye[1];
      follow[14] = camera.eye[2];
      gl.disable(gl.CULL_FACE); // seen from the inside
      draw(scene.sky, follow);
      gl.enable(gl.CULL_FACE);
    }

    gl.uniform1f(uniforms.uFogDensity, fog ? fog.density : 0);

    if (scene.ground) {
      gl.uniform1f(uniforms.uPass, 0);
      draw(scene.ground);
    }

    if (scene.shadow && scene.casters?.length && light[1] > 0.01) {
      // Squash the casters onto the ground along the light direction. The
      // stencil buffer stops overlapping parts from darkening a spot twice.
      flatten[4] = -light[0] / light[1];
      flatten[5] = 0;
      flatten[6] = -light[2] / light[1];
      gl.uniform1f(uniforms.uPass, 1);
      gl.uniform1f(uniforms.uShadow, scene.shadow.strength ?? 0.3);
      gl.uniform1f(uniforms.uClip, scene.shadow.clipRadius ?? 0);
      gl.disable(gl.CULL_FACE);
      gl.enable(gl.STENCIL_TEST);
      gl.stencilFunc(gl.EQUAL, 0, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
      for (const caster of scene.casters) draw(caster, flatten);
      gl.disable(gl.BLEND);
      gl.disable(gl.STENCIL_TEST);
      gl.enable(gl.CULL_FACE);
    }

    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.uniform1f(uniforms.uPass, 0);
    for (const solid of scene.solids) draw(solid);

    if (scene.glows?.length) {
      // Blended over what is there, hidden by anything in front, and
      // leaving the depth buffer alone so halos never cut into each other.
      gl.uniform1f(uniforms.uPass, 3);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
      for (const glow of scene.glows) draw(glow);
      gl.disable(gl.BLEND);
      gl.depthMask(true);
    }
  }

  function setSize(width, height, pixelRatio = 1) {
    const w = Math.max(1, Math.round(width * pixelRatio));
    const h = Math.max(1, Math.round(height * pixelRatio));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  return {
    canvas,
    render,
    setSize,
    /** Draw calls in the last frame, for keeping an eye on performance. */
    get drawCalls() {
      return drawCalls;
    },
  };
}
