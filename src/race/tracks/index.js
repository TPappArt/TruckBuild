import { city } from './city.js';
import { desert } from './desert.js';
import { haunted } from './haunted.js';
import { snowy } from './snow.js';
import { swamp } from './swamp.js';

// Every track, in the order the picker shows them and the order they open
// to a new player: the first is open from the start, and each one after
// that opens when the one before it has been won twice (or it is bought).
//
// A track theme provides:
//   layout     control points and widths for the centre line
//   surface    grip (how fast sideways speed dies away) and off-road speed
//   feature    the track's landmark, by name (race/features.js)
//   hazard     what goes wrong at the landmark, by name (race/hazards.js)
//   price      coins to open the track without winning the one before
//   sky, fog, light, lighting, shadow   the look of the day
//   air, mist, grain                    what hangs in the air (race/scene.js)
//   cinematic                           where its picture is taken from
//   ground, road                        colours of the painted ground layers
//   paintGround(), marker(), decorate() terrain patches, edge posts, scenery
//   pulse(time)                         optional flicker for glowing things
//   preview                             colours for the picker card
export const TRACKS = [desert, swamp, snowy, haunted, city];

export function findTrack(id) {
  return TRACKS.find((theme) => theme.id === id) || null;
}
