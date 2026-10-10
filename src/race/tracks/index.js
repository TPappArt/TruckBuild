import { desert } from './desert.js';
import { snowy } from './snow.js';
import { swamp } from './swamp.js';

// Every track, in the order the picker shows them.
//
// A track theme provides:
//   layout     control points and widths for the centre line
//   surface    grip (how fast sideways speed dies away) and off-road speed
//   hazard     the track's own hazard, by name (race/hazards.js)
//   feature    the track's set piece, by name (race/features.js)
//   sky, fog, light, lighting, shadow   the look of the day
//   ground, road                        colours of the painted ground layers
//   paintGround(), marker(), decorate() terrain patches, edge posts, scenery
//   pulse(time)                         optional flicker for glowing things
//   preview                             colours for the picker card
export const TRACKS = [swamp, desert, snowy];

export function findTrack(id) {
  return TRACKS.find((track) => track.id === id) || TRACKS[0];
}
