// Velvet Hour — level parsing. One ASCII map becomes the walls, the cover, the
// loot and the spawn points the rest of the game reasons about. Everything here
// is pure data: no drawing, no input, no sound.

import { COLS, ROWS } from './config.js';

/** True when the tile at (tx, ty) stops the thief from walking through it. */
export function isSolidTile(level, tx, ty) {
  tx = Math.floor(tx);
  ty = Math.floor(ty);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  const ch = level.map[ty][tx];
  return ch === '#' || ch === 'C' || ch === 'P';
}

/** True when the tile at (tx, ty) stops a guard's line of sight. */
export function blocksSight(level, tx, ty) {
  tx = Math.floor(tx);
  ty = Math.floor(ty);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  const ch = level.map[ty][tx];
  return ch === '#' || ch === 'C' || ch === 'P' || ch === 'B';
}

/** True when the tile at (tx, ty) is a shadow rug. */
export function isShadowTile(level, tx, ty) {
  tx = Math.floor(tx);
  ty = Math.floor(ty);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
  return level.map[ty][tx] === '~';
}

/** True when the tile at (tx, ty) holds a potted palm to hide inside. */
export function isPalmTile(level, tx, ty) {
  tx = Math.floor(tx);
  ty = Math.floor(ty);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
  return level.map[ty][tx] === 'B';
}

/** The tile character under a point given in tile coordinates (floats). */
export function tileAt(level, x, y) {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return level.map[ty][tx];
}

/**
 * Find the one tile holding `letter` and return its centre in tile
 * coordinates, or null when the map has none.
 */
export function findTile(level, letter) {
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (level.map[y][x] === letter) return { x: x + 0.5, y: y + 0.5 };
    }
  }
  return null;
}

/** Every coin tile, as centres in tile coordinates. */
export function findCoins(level) {
  const coins = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (level.map[y][x] === '*') coins.push({ x: x + 0.5, y: y + 0.5, taken: false });
    }
  }
  return coins;
}

/**
 * Check a level map for the mistakes that would make it unplayable: rows of
 * the wrong length, a missing spawn, Moonstone or exit, and a Moonstone or
 * exit the thief cannot reach on foot. Returns a list of problems (empty is
 * good). Used by the development harness, not by the game loop.
 */
export function validateLevel(level) {
  const problems = [];
  if (level.map.length !== ROWS) problems.push(`map has ${level.map.length} rows, needs ${ROWS}`);
  level.map.forEach((row, y) => {
    if (row.length !== COLS) problems.push(`row ${y} is ${row.length} wide, needs ${COLS}`);
  });
  const spawn = findTile(level, 'S');
  const stone = findTile(level, 'M');
  const exit = findTile(level, 'E');
  if (!spawn) problems.push('no S spawn tile');
  if (!stone) problems.push('no M Moonstone tile');
  if (!exit) problems.push('no E exit tile');
  if (spawn && stone && exit) {
    const reached = new Set([`${Math.floor(spawn.x)},${Math.floor(spawn.y)}`]);
    const queue = [[Math.floor(spawn.x), Math.floor(spawn.y)]];
    while (queue.length > 0) {
      const [cx, cy] = queue.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        const key = `${nx},${ny}`;
        if (reached.has(key) || isSolidTile(level, nx, ny)) continue;
        reached.add(key);
        queue.push([nx, ny]);
      }
    }
    if (!reached.has(`${Math.floor(stone.x)},${Math.floor(stone.y)}`)) problems.push('Moonstone is unreachable');
    if (!reached.has(`${Math.floor(exit.x)},${Math.floor(exit.y)}`)) problems.push('exit is unreachable');
  }
  for (const guard of level.guards ?? []) {
    for (const [wx, wy] of guard.waypoints) {
      if (isSolidTile(level, wx, wy)) problems.push(`guard waypoint ${wx},${wy} sits in a solid tile`);
    }
  }
  return problems;
}
