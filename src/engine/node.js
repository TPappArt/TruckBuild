import { bounds } from './geometry.js';
import { compose, identity, multiply, transformPoint } from './math.js';

// A node in a small scene tree. A node may carry a mesh (`geometry` plus a
// material `role`), child nodes, or both.
export class Node {
  constructor() {
    this.position = [0, 0, 0];
    this.rotation = [0, 0, 0]; // radians: [pitch x, yaw y, roll z]
    this.scale = [1, 1, 1];
    this.children = [];
    this.geometry = null;
    this.role = null;
    this.motion = null; // idle animation, see garage/scene.js
    this.world = identity();
  }

  add(...nodes) {
    this.children.push(...nodes);
    return this;
  }

  /** Copies the tree. Geometry is shared, so copies are cheap. */
  clone() {
    const copy = new Node();
    copy.position = [...this.position];
    copy.rotation = [...this.rotation];
    copy.scale = [...this.scale];
    copy.geometry = this.geometry;
    copy.role = this.role;
    copy.motion = this.motion ? { ...this.motion } : null;
    copy.children = this.children.map((child) => child.clone());
    return copy;
  }

  /** Recomputes world matrices for this node and everything under it. */
  updateWorld(parent) {
    compose(this.world, this.position, this.rotation, this.scale);
    if (parent) multiply(this.world, parent, this.world);
    for (const child of this.children) child.updateWorld(this.world);
  }

  /** Calls `visit(node)` for this node and everything under it. */
  walk(visit) {
    visit(this);
    for (const child of this.children) child.walk(visit);
  }

  /** Total triangles in this node's subtree. */
  get triangles() {
    let total = 0;
    this.walk((node) => {
      if (node.geometry) total += node.geometry.triangles;
    });
    return total;
  }

  /** World-space bounds of the subtree: { min, max, center, radius }. */
  worldBounds() {
    this.updateWorld();
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    this.walk((node) => {
      if (!node.geometry) return;
      const b = bounds(node.geometry);
      for (let corner = 0; corner < 8; corner++) {
        const p = transformPoint(
          node.world,
          corner & 1 ? b.max[0] : b.min[0],
          corner & 2 ? b.max[1] : b.min[1],
          corner & 4 ? b.max[2] : b.min[2],
        );
        for (let k = 0; k < 3; k++) {
          if (p[k] < min[k]) min[k] = p[k];
          if (p[k] > max[k]) max[k] = p[k];
        }
      }
    });
    const center = [0, 1, 2].map((k) => (min[k] + max[k]) / 2);
    const radius = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2;
    return { min, max, center, radius };
  }
}
