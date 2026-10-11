// Lists every part's triangle count and fails if one is over budget.
//
//   npm run check
//
// The budget applies to one unit of a part: a single wheel, track or leg,
// or one side of a mirrored pair. A vehicle reuses that mesh for each copy.
import { GAME } from '../src/config.js';
import { CATEGORIES, SPECIAL } from '../src/parts/catalog.js';

let failed = false;

for (const category of CATEGORIES) {
  console.log(`\n${category.name}`);
  // (Including the parts that are not for sale: the villain's hat.)
  for (const part of [...category.parts, ...(SPECIAL[category.id] ?? [])]) {
    const triangles = part.unit().triangles;
    const over = triangles > GAME.triangleBudget;
    if (over) failed = true;
    console.log(`  ${part.name.padEnd(16)} ${String(triangles).padStart(4)}${over ? '  OVER BUDGET' : ''}`);
  }
}

console.log(`\nBudget: ${GAME.triangleBudget} triangles per part.`);
if (failed) {
  console.error('One or more parts are over budget.');
  process.exit(1);
}
