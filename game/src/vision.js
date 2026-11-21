// Velvet Hour — seeing. A guard sees the thief only when three things are
// true at once: the thief is inside the guard's cone, close enough, and no
// wall, case, pillar or palm stands on the line between them. Everything here
// works in tile coordinates.

import { blocksSight } from './levels.js';
import { CONE_HALF_ANGLE, CONE_RANGE } from './config.js';

/** Smallest absolute difference between two angles, in radians. */
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/**
 * True when nothing blocks sight between two points. Walks the segment in
 * quarter-tile steps and asks each tile it crosses; a palm counts as blocking
 * because a thief hiding in one cannot be seen through it.
 */
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance * 4));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (blocksSight(level, x0 + dx * t, y0 + dy * t)) return false;
  }
  return true;
}

/**
 * True when the guard at (gx, gy) facing `facing` can see the point (px, py):
 * inside the cone's angle and range, with a clear line of sight. The range
 * shortens a little when the thief is sneaking, so a slow crouch buys room.
 */
export function guardCanSee(level, gx, gy, facing, px, py, sneaking) {
  const dx = px - gx;
  const dy = py - gy;
  const distance = Math.hypot(dx, dy);
  const range = sneaking ? CONE_RANGE * 0.85 : CONE_RANGE;
  if (distance > range) return false;
  if (distance < 0.5) return true; // nose to nose: seen, cone or no cone
  const bearing = Math.atan2(dy, dx);
  if (angleDifference(bearing, facing) > CONE_HALF_ANGLE) return false;
  return hasLineOfSight(level, gx, gy, px, py);
}

/**
 * The points of a guard's cone polygon, for drawing: the guard's position,
 * then an arc of points at CONE_RANGE out to the cone's edges, clipped by
 * walls. Each ray walks out until it hits a sight-blocking tile, so the cone
 * hugs the furniture instead of shining through it.
 */
export function conePolygon(level, gx, gy, facing) {
  const points = [{ x: gx, y: gy }];
  const rays = 26;
  for (let i = 0; i <= rays; i += 1) {
    const angle = facing - CONE_HALF_ANGLE + (2 * CONE_HALF_ANGLE * i) / rays;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let reach = CONE_RANGE;
    for (let r = 0.4; r <= CONE_RANGE; r += 0.2) {
      if (blocksSight(level, gx + dx * r, gy + dy * r)) {
        reach = r;
        break;
      }
    }
    points.push({ x: gx + dx * reach, y: gy + dy * reach });
  }
  return points;
}
