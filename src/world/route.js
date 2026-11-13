import { ROOMS, roomById, roomAt, wallFrame } from './layout.js';

// The visitor's way through the basement, and where each work is on it, read from the
// hang data. No browser APIs here: the walk and the text edition's build step both use it.
// Nothing in this file places anything; it only describes what layout.js and
// exhibition.json already say.

// Doorways between the rooms: a point before and a point after each opening (the guided
// tour walks through them).
export const DOORS = {
  'r1>r2': [[4.95, 4.12], [6.35, 4.12]],
  'r2>r3': [[9.382, 3.317], [10.65, 3.317]],
  'r3>r4': [[15.2, 3.792], [16.283, 3.792]],
};

// The works in visiting order: the catalogue order, which is also the tour's. The small
// screen of Paradise Factory is part of no. 3, not a stop of its own.
export const isPart = (w) => w.id.endsWith('-screen');
export const visitOrder = (works) => works.filter((w) => !isPart(w));

// Every room is entered walking towards +x: Room 1 down the stairs along its north wall,
// Rooms 2 to 4 through the doorways in DOORS. So, as you enter, a wall whose face looks
// +z is on your left, -z on your right, -x faces you and +x is behind you.
const WALL = { '+z': 'left', '-z': 'right', '-x': 'ahead', '+x': 'behind' };
const third = (f) => (f < 1 / 3 ? 'near' : f > 2 / 3 ? 'far' : 'mid');

// Which room a hung thing without a `room` (the exhibition text sheets) is in.
export function roomOfHang(h) {
  const f = wallFrame(h.face, h.at, h.along);
  return roomAt(f.x + f.nx * 0.3, f.z + f.nz * 0.3);
}

// Where an item is, as data for a sentence:
//   on a wall  { kind: 'wall', wall: 'left' | 'right' | 'ahead' | 'behind',
//                index, count   (its place among the works on that wall: side walls counted
//                               from the end you enter at, the other two from the left as
//                               you face them),
//                along: 'near' | 'mid' | 'far'   (side walls: how far along from the entrance),
//                door: 'left' | 'right', doorRoom   (wall ahead: which side of the way on to
//                               the next room; wall behind: which side of the doorway you
//                               came through, as you walk in) }
//   on the floor { kind: 'floor', depth: 'near' | 'mid' | 'far', side: 'left' | 'centre' | 'right' }
export function placeOf(item, works) {
  const room = item.room ? roomById(item.room) : roomOfHang(item.hang);
  if (!room) return null;
  const len = room.x1 - room.x0;
  const wid = room.z1 - room.z0;
  if (!item.hang) {
    const a = item.anchor;
    if (!a) return null;
    const g = (a.z - room.z0) / wid;
    return { kind: 'floor', room: room.id, depth: third((a.x - room.x0) / len), side: g < 1 / 3 ? 'left' : g > 2 / 3 ? 'right' : 'centre' };
  }
  const h = item.hang;
  const wall = WALL[h.face];
  const key = (o) => (wall === 'behind' ? -o.hang.along : o.hang.along);
  const same = works.filter((o) => o.hang && o.room === room.id && o.hang.face === h.face).sort((a, b) => key(a) - key(b));
  const out = { kind: 'wall', room: room.id, wall, index: same.indexOf(item) + 1, count: same.length };
  if (wall === 'left' || wall === 'right') out.along = third((h.along - room.x0) / len);
  else {
    const i = ROOMS.indexOf(room);
    const other = ROOMS[wall === 'ahead' ? i + 1 : i - 1];
    const door = other && DOORS[wall === 'ahead' ? `${room.id}>${other.id}` : `${other.id}>${room.id}`];
    if (door) {
      out.door = h.along < door[0][1] ? 'left' : 'right';
      out.doorRoom = other.id;
    }
  }
  return out;
}
