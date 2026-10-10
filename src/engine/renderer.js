import { resolveMaterial } from './materials.js';
import { determinant3, identity, lookAt, multiply, normalMatrix, perspective } from './math.js';

// A small WebGL renderer built for this game: one shader, soft "toy plastic"
// lighting, distance fog and a flat projected shadow.
//
// It is fast because of what it does not do. A whole track, or a whole
// vehicle, is a single merged mesh with colour stored per vertex (see
// bake.js), so a race is a few dozen draw calls. There are no shadow maps
// and no material textures. WebGL 1 is used on purpose for the widest
// device support.
//
// The one texture is a 64 x 64 tile of noise, made here at start-up. It is
// looked up by position on the ground, never by a mesh's own coordinates,
// so nothing needs unwrapping. It does two cheap jobs: it breaks up flat
// ground with a little grain, and it puts drifting banks of mist in the fog.

const VERTEX = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;
attribute vec3 aParams; // highlight strength, highlight tightness, glow
uniform mat4 uViewProj;
uniform mat4 uModel;
uniform mat3 uNormal;
uniform vec3 uEye;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vColor;
varying vec3 vParams;
varying vec3 vWorld;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vNormal = uNormal * aNormal;
  vView = uEye - world.xyz;
  vColor = aColor;
  vParams = aParams;
  vWorld = world.xyz;
  gl_Position = uViewProj * world;
}`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float; // distances run to hundreds of metres
#else
precision mediump float;
#endif
uniform vec3 uLight;
uniform vec3 uSun;
uniform vec3 uSky;
uniform vec3 uBounce;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uPass; // 0 lit, 1 shadow, 2 unlit backdrop, 3 glow
uniform float uShadow;
uniform float uClip;
uniform float uPulse;
uniform sampler2D uNoise; // r: fine grain, g: soft clouds; tiles in both directions
uniform vec4 uMist; // strength, pattern scale, drift x, drift z
uniform float uGrain;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vColor;
varying vec3 vParams;
varying vec3 vWorld;
void main() {
  if (uPass > 1.5 && uPass < 2.5) {
    gl_FragColor = vec4(pow(vColor, vec3(1.0 / 2.2)), 1.0);
    return;
  }

  // Fog thickens with the square of distance. Mist adds to it in drifting
  // banks that hug the ground and keep clear of the camera.
  float range = length(vView);
  float d = range * uFogDensity;
  float fog = 1.0 - exp(-d * d);
  float bank = 0.5;
  if (uMist.x > 0.0) {
    bank = texture2D(uNoise, vWorld.xz * uMist.y + uMist.zw).g;
    float low = exp(-max(vWorld.y, 0.0) * 0.2);
    fog = min(1.0, fog + uMist.x * bank * bank * low * smoothstep(8.0, 55.0, range));
  }

  if (uPass > 2.5) {
    // Glow: a see-through tint, strongest where the surface faces the
    // camera and fading to nothing at the rim, so a plain ball reads as a
    // soft halo. A tint rather than added light, so it shows up on snow
    // and sand as well as in the dark.
    float facing = max(dot(normalize(vNormal), normalize(vView)), 0.0);
    float glow = facing * facing * (1.0 - fog) * uPulse;
    gl_FragColor = vec4(pow(vColor, vec3(1.0 / 2.2)), min(glow * 0.5, 1.0));
    return;
  }
  if (uPass > 0.5) {
    // Shadow: darken whatever is already there, fading out with the fog.
    if (uClip > 0.0 && dot(vWorld.xz, vWorld.xz) > uClip * uClip) discard;
    gl_FragColor = vec4(0.0, 0.0, 0.0, uShadow * (1.0 - fog));
    return;
  }
  vec3 n = normalize(vNormal);
  vec3 v = vView / max(range, 0.001);

  // Grain: flat ground and anything else facing the sky is mottled a
  // little, finely and in broad patches, so big areas are never one tone.
  // The broad patches are the mist's own pattern, so they drift with it,
  // like the shadows of clouds.
  vec3 base = vColor;
  if (uGrain > 0.0) {
    float fine = texture2D(uNoise, vWorld.xz * 0.29).r;
    base *= 1.0 + uGrain * ((fine - 0.5) + (0.5 - bank) * 0.9) * max(n.y, 0.0);
  }

  // Wrapped diffuse keeps the dark side soft and readable, like a toy.
  float wrap = dot(n, uLight) * 0.5 + 0.5;
  vec3 ambient = mix(uBounce, uSky, n.y * 0.5 + 0.5);
  vec3 color = base * (ambient * 0.5 + uSun * (wrap * wrap * 0.95));

  vec3 h = normalize(uLight + v);
  color += uSun * vParams.x * pow(max(dot(n, h), 0.0), vParams.y);
  // A sheen of sky colour where a surface is seen edge on. It is held back
  // on anything lying flat: there it is seen edge on all the way to the
  // horizon, and would wash the road and the ground toward the same tone.
  float rim = 1.0 - max(dot(n, v), 0.0);
  color += uSky * (rim * rim * rim) * 0.16 * (n.y * 0.5 + 0.5) * (1.0 - 0.6 * n.y * n.y);

  color = mix(color, vColor * (1.35 * uPulse), vParams.z);
  // Glowing things stay visible further into the fog.
  color = mix(color, uFogColor, fog * (1.0 - 0.6 * vParams.z));
  gl_FragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.0);
}`;

/**
 * A square tile of noise that repeats without a seam, as RGBA bytes.
 * Red is fine grain; green is soft and cloudy.
 */
function noiseTile(size) {
  let seed = 20240;
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  // Smooth noise: random values on a coarse grid that wraps, blended between.
  const layer = (cells) => {
    const grid = Float32Array.from({ length: cells * cells }, random);
    const at = (x, y) => grid[(y % cells) * cells + (x % cells)];
    const ease = (t) => t * t * (3 - 2 * t);
    return (u, v) => {
      const x = u * cells;
      const y = v * cells;
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const fx = ease(x - x0);
      const fy = ease(y - y0);
      const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * fx;
      const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * fx;
      return top + (bottom - top) * fy;
    };
  };
  const grain = [layer(32), layer(16)];
  const cloud = [layer(4), layer(8), layer(16)];
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const fine = grain[0](u, v) * 0.65 + grain[1](u, v) * 0.35;
      const soft = cloud[0](u, v) * 0.55 + cloud[1](u, v) * 0.3 + cloud[2](u, v) * 0.15;
      const i = (y * size + x) * 4;
      pixels[i] = Math.round(fine * 255);
      // Stretch the clouds so there are clear gaps between them.
      pixels[i + 1] = Math.round(Math.min(1, Math.max(0, (soft - 0.3) * 2.4)) * 255);
      pixels[i + 2] = 0;
      pixels[i + 3] = 255;
    }
  }
  return pixels;
}

const WHITE = [1, 1, 1];
const OPENING = 0x80; // stencil bit: the ground is cut away here
const SHADOW_LIFT = 0.08; // metres a shadow is drawn above what it falls on
const DEFAULT_BOUNCE = [0.42, 0.5, 0.68];

export function createRenderer(canvas) {
  const options = { antialias: true, alpha: true, stencil: true };
  const gl = canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
  if (!gl) throw new Error('WebGL is not available');

  let program;
  let uniforms;
  let buffers;
  let noise;
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

    const size = 64;
    noise = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, noise);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, noiseTile(size));
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

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
  let triangles = 0;

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
      triangles += entry.count / 3;
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
   *   mist:     optional { strength, scale, offset: [x, z] }: drifting banks
   *             of thicker fog near the ground (needs fog),
   *   grain:    optional strength of the mottling on upward-facing surfaces,
   *   pulse:    optional brightness multiplier for glowing surfaces,
   *   sky:      optional Node drawn unlit behind everything, centred on the camera,
   *   ground:   optional Node of flat layers at y = 0, painted one over the
   *             other in order. It hides whatever is below y = 0,
   *   openings: optional Node of flat shapes at y = 0 where the ground is
   *             cut away, so that what is below shows (a road in a cutting),
   *   decks:    optional Nodes drawn lit before the shadows, so that shadows
   *             can fall on them: stretches of road that are off the ground,
   *   solids:   Nodes drawn lit and depth tested,
   *   casters:  what casts a shadow (usually also in solids): Nodes, whose
   *             shadow falls on the ground, or { node, height } for one
   *             whose shadow falls on a surface at that height,
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
    triangles = 0;

    // With fog the far distance is the fog colour; without, leave the canvas
    // see-through so the page behind it shows.
    if (fog) gl.clearColor(...fog.color.map((c) => Math.pow(c, 1 / 2.2)), 1);
    else gl.clearColor(0, 0, 0, 0);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.depthMask(true);
    gl.stencilMask(0xff);
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
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, noise);
    gl.uniform1i(uniforms.uNoise, 0);
    const mist = fog && scene.mist;
    gl.uniform4f(uniforms.uMist, mist ? mist.strength : 0, mist ? mist.scale : 0, mist ? mist.offset[0] : 0, mist ? mist.offset[1] : 0);
    gl.uniform1f(uniforms.uGrain, scene.grain ?? 0);

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
    gl.uniform1f(uniforms.uPass, 0);

    // Where the ground is cut away is marked in the top bit of the stencil
    // buffer first, and the ground is then painted everywhere else.
    const holes = Boolean(scene.openings && scene.ground);
    if (holes) {
      gl.enable(gl.STENCIL_TEST);
      gl.stencilMask(OPENING);
      gl.stencilFunc(gl.ALWAYS, OPENING, OPENING);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
      gl.colorMask(false, false, false, false);
      gl.disable(gl.CULL_FACE);
      draw(scene.openings);
      gl.enable(gl.CULL_FACE);
      gl.colorMask(true, true, true, true);
      gl.stencilMask(0xff);
    }

    if (scene.ground) {
      // The layers all lie in one plane, so they are painted in order with
      // no depth comparison. They do record their depth, though: the ground
      // then hides anything under it, such as the buried part of a boulder
      // or a mummy that has not come up yet.
      // The depth is nudged a little further away, so that things resting
      // on the ground (a stretch of built road, a shadow) are never caught
      // in it, however shallow the angle they are seen at.
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.ALWAYS);
      gl.depthMask(true);
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(2, 24);
      if (holes) {
        gl.stencilFunc(gl.EQUAL, 0, OPENING);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      }
      draw(scene.ground);
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.depthFunc(gl.LEQUAL);
    }
    if (holes) gl.disable(gl.STENCIL_TEST);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    if (scene.decks) for (const deck of scene.decks) draw(deck);

    if (scene.shadow && scene.casters?.length && light[1] > 0.01) {
      // Squash the casters flat along the light direction, onto the ground
      // or onto a surface at the caster's own height. Shadows are drawn a
      // finger above that surface and are hidden by whatever is in front.
      // The stencil buffer stops overlapping parts from darkening a spot
      // twice, and keeps ground shadows from hanging over a cutting.
      gl.uniform1f(uniforms.uPass, 1);
      gl.uniform1f(uniforms.uShadow, scene.shadow.strength ?? 0.3);
      gl.uniform1f(uniforms.uClip, scene.shadow.clipRadius ?? 0);
      gl.depthMask(false);
      gl.disable(gl.CULL_FACE);
      gl.enable(gl.STENCIL_TEST);
      gl.stencilMask(0xff & ~OPENING);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
      const slopeX = light[0] / light[1];
      const slopeZ = light[2] / light[1];
      flatten[4] = -slopeX;
      flatten[5] = 0;
      flatten[6] = -slopeZ;
      for (const caster of scene.casters) {
        const node = caster.node || caster;
        const height = caster.node ? caster.height : 0;
        flatten[12] = height * slopeX;
        flatten[13] = height + SHADOW_LIFT;
        flatten[14] = height * slopeZ;
        gl.stencilFunc(gl.EQUAL, 0, height === 0 ? 0xff : 0xff & ~OPENING);
        draw(node, flatten);
      }
      gl.disable(gl.BLEND);
      gl.disable(gl.STENCIL_TEST);
      gl.stencilMask(0xff);
      gl.enable(gl.CULL_FACE);
      gl.uniform1f(uniforms.uClip, 0);
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

  /** Frees the graphics memory held for every mesh under `node`. */
  function release(node) {
    node.walk((child) => {
      const entry = child.geometry && buffers.get(child.geometry);
      if (!entry) return;
      for (const name of ['position', 'normal', 'color', 'params', 'index']) {
        if (entry[name]) gl.deleteBuffer(entry[name]);
      }
      buffers.delete(child.geometry);
    });
  }

  return {
    canvas,
    render,
    release,
    setSize,
    /** Draw calls and triangles in the last frame, for keeping an eye on performance. */
    get drawCalls() {
      return drawCalls;
    },
    get triangles() {
      return triangles;
    },
  };
}
