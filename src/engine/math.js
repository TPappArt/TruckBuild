// Minimal matrix helpers. Matrices are column-major Float32Arrays, the layout
// WebGL expects.

export function identity() {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

/** out = a * b. `out` may be the same array as `a` or `b`. */
export function multiply(out, a, b) {
  const r = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      r[col * 4 + row] =
        a[row] * b[col * 4] +
        a[4 + row] * b[col * 4 + 1] +
        a[8 + row] * b[col * 4 + 2] +
        a[12 + row] * b[col * 4 + 3];
    }
  }
  out.set(r);
  return out;
}

/**
 * Builds translate * rotate * scale. Rotation is [x, y, z] in radians,
 * applied roll (z) first, then pitch (x), then yaw (y).
 */
export function compose(out, position, rotation, scale) {
  const cx = Math.cos(rotation[0]);
  const sx = Math.sin(rotation[0]);
  const cy = Math.cos(rotation[1]);
  const sy = Math.sin(rotation[1]);
  const cz = Math.cos(rotation[2]);
  const sz = Math.sin(rotation[2]);

  out[0] = (cy * cz + sy * sx * sz) * scale[0];
  out[1] = cx * sz * scale[0];
  out[2] = (-sy * cz + cy * sx * sz) * scale[0];
  out[3] = 0;

  out[4] = (-cy * sz + sy * sx * cz) * scale[1];
  out[5] = cx * cz * scale[1];
  out[6] = (sy * sz + cy * sx * cz) * scale[1];
  out[7] = 0;

  out[8] = sy * cx * scale[2];
  out[9] = -sx * scale[2];
  out[10] = cy * cx * scale[2];
  out[11] = 0;

  out[12] = position[0];
  out[13] = position[1];
  out[14] = position[2];
  out[15] = 1;
  return out;
}

export function perspective(out, fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}

export function lookAt(out, eye, target, up = [0, 1, 0]) {
  let zx = eye[0] - target[0];
  let zy = eye[1] - target[1];
  let zz = eye[2] - target[2];
  let len = Math.hypot(zx, zy, zz) || 1;
  zx /= len;
  zy /= len;
  zz /= len;

  let xx = up[1] * zz - up[2] * zy;
  let xy = up[2] * zx - up[0] * zz;
  let xz = up[0] * zy - up[1] * zx;
  len = Math.hypot(xx, xy, xz) || 1;
  xx /= len;
  xy /= len;
  xz /= len;

  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;

  out[0] = xx;
  out[1] = yx;
  out[2] = zx;
  out[3] = 0;
  out[4] = xy;
  out[5] = yy;
  out[6] = zy;
  out[7] = 0;
  out[8] = xz;
  out[9] = yz;
  out[10] = zz;
  out[11] = 0;
  out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
  out[15] = 1;
  return out;
}

/** Determinant of the upper 3x3. Negative means the matrix mirrors. */
export function determinant3(m) {
  return (
    m[0] * (m[5] * m[10] - m[6] * m[9]) -
    m[4] * (m[1] * m[10] - m[2] * m[9]) +
    m[8] * (m[1] * m[6] - m[2] * m[5])
  );
}

/** Inverse transpose of the upper 3x3, for transforming normals. */
export function normalMatrix(out, m) {
  const det = determinant3(m) || 1;
  out[0] = (m[5] * m[10] - m[6] * m[9]) / det;
  out[1] = (m[6] * m[8] - m[4] * m[10]) / det;
  out[2] = (m[4] * m[9] - m[5] * m[8]) / det;
  out[3] = (m[9] * m[2] - m[10] * m[1]) / det;
  out[4] = (m[10] * m[0] - m[8] * m[2]) / det;
  out[5] = (m[8] * m[1] - m[9] * m[0]) / det;
  out[6] = (m[1] * m[6] - m[2] * m[5]) / det;
  out[7] = (m[2] * m[4] - m[0] * m[6]) / det;
  out[8] = (m[0] * m[5] - m[1] * m[4]) / det;
  return out;
}

export function transformPoint(m, x, y, z) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}
