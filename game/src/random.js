// Velvet Hour — a small seeded random stream, so a screenshot seed always
// paints the same dust motes and the same flicker.

/** A mulberry32 stream: fast, deterministic, good enough for decoration. */
export function createRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An integer in [min, max] from the stream. */
export function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** Pick one element of an array from the stream. */
export function randomPick(random, items) {
  return items[Math.floor(random() * items.length)];
}
