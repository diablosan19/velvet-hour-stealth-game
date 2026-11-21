// Velvet Hour — the thief. Walks, sneaks, and throws the pebbles that pull
// guards away. Movement is axis-separated against solid tiles so the thief
// slides along walls instead of catching on their corners.

import { SNEAK_SPEED, TILE, WALK_SPEED } from './config.js';
import { isSolidTile } from './levels.js';

/** The thief, fresh at the level's spawn tile. */
export function createPlayer(x, y) {
  return {
    x,
    y,
    radius: 0.32, // tiles: the thief's collision circle
    facing: 0,
    sneaking: false,
    moving: false,
    pebbles: 5,
    stepTimer: 0,
    stepped: false,
  };
}

/**
 * Move the thief one frame from the input axes (-1..1 each). Returns nothing;
 * `player.moving` and `player.stepped` tell the loop whether to play steps.
 */
export function updatePlayer(level, player, ax, ay, sneaking, dt) {
  const speed = sneaking ? SNEAK_SPEED : WALK_SPEED;
  player.sneaking = sneaking;
  const length = Math.hypot(ax, ay);
  player.moving = length > 0.01;
  if (!player.moving) return;
  const nx = (ax / length) * speed * dt;
  const ny = (ay / length) * speed * dt;
  player.facing = Math.atan2(ay, ax);
  const r = player.radius;
  // Try the x step, then the y step; each is refused when the circle would
  // overlap a solid tile, which is what makes walls slide instead of stick.
  if (!circleHitsSolid(level, player.x + nx, player.y, r)) player.x += nx;
  if (!circleHitsSolid(level, player.x, player.y + ny, r)) player.y += ny;
  player.stepTimer -= dt;
  if (player.stepTimer <= 0) {
    player.stepTimer = sneaking ? 0.5 : 0.34;
    player.stepped = true;
  }
}

/** True when a circle of radius `r` at (x, y) overlaps any solid tile. */
export function circleHitsSolid(level, x, y, r) {
  const x0 = Math.floor(x - r);
  const x1 = Math.floor(x + r);
  const y0 = Math.floor(y - r);
  const y1 = Math.floor(y + r);
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      if (!isSolidTile(level, tx, ty)) continue;
      const nearestX = Math.max(tx, Math.min(x, tx + 1));
      const nearestY = Math.max(ty, Math.min(y, ty + 1));
      if ((x - nearestX) ** 2 + (y - nearestY) ** 2 < r * r) return true;
    }
  }
  return false;
}

/** The thief's position in pixels, for the renderer. */
export function playerPixels(player) {
  return { x: player.x * TILE, y: player.y * TILE };
}
