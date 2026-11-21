// Velvet Hour — the night guards. Each guard walks a patrol route it can be
// learned, and reacts to what it sees through a small state machine:
//
//   patrol      walk the waypoints, pause at each one and look around
//   suspicious  something caught its eye: stop, stare, meter still rising
//   investigate walk to the last place it saw (or heard) the thief
//   chase      the alarm is full: run the thief down
//   return     the trail went cold: walk back to the nearest waypoint
//
// The alert meter is the whole detection system: it fills while the thief is
// visible and drains while hidden, so a near miss is a scare, not a sentence.

import {
  ALERT_DECAY,
  ALERT_FULL,
  ALERT_INVESTIGATE,
  ALERT_SUSPICIOUS,
  GUARD_CATCH_DISTANCE,
  GUARD_CHASE_SPEED,
  GUARD_INVESTIGATE_SPEED,
  GUARD_PATROL_SPEED,
  SPOT_RATE,
  SPOT_RATE_CLOSE,
  SPOT_RATE_PALM,
  SPOT_RATE_SHADOW,
  SPOT_RATE_SNEAK,
} from './config.js';
import { isPalmTile, isShadowTile, tileAt } from './levels.js';
import { angleDifference, guardCanSee } from './vision.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_INVESTIGATE = 'investigate';
export const GUARD_CHASE = 'chase';
export const GUARD_RETURN = 'return';

/** One guard, fresh at its spawn tile, facing along its first patrol leg. */
export function createGuard(def) {
  const start = def.waypoints[0];
  const next = def.waypoints[1] ?? def.waypoints[0];
  return {
    x: def.spawn[0] + 0.5,
    y: def.spawn[1] + 0.5,
    facing: Math.atan2(next[1] - start[1], next[0] - start[0]),
    waypoints: def.waypoints,
    waypointIndex: 1,
    pause: def.pause ?? 1,
    pauseLeft: 0,
    scanAngle: 0,
    state: GUARD_PATROL,
    alert: 0,
    lastSeen: null,
    lastHeard: null,
    lookTimer: 0,
    lostTimer: 0,
    stepTimer: 0,
    stepped: false,
  };
}

/** The nearest waypoint to the guard, for walking back after a false alarm. */
function nearestWaypointIndex(guard) {
  let best = 0;
  let bestDistance = Infinity;
  guard.waypoints.forEach(([wx, wy], i) => {
    const d = (wx + 0.5 - guard.x) ** 2 + (wy + 0.5 - guard.y) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  });
  return best;
}

/**
 * How fast this guard's alert meter fills right now: closer is faster, and
 * sneaking, shadow and palms all slow it down. A thief at arm's length fills
 * it almost at once; one crouched in a palm barely moves it.
 */
export function spotRateFor(level, guard, player) {
  const distance = Math.hypot(player.x - guard.x, player.y - guard.y);
  if (distance < 2) return SPOT_RATE_CLOSE;
  const tile = tileAt(level, player.x, player.y);
  if (tile === 'B' || isPalmTile(level, player.x, player.y)) return SPOT_RATE_PALM;
  if (isShadowTile(level, player.x, player.y)) return SPOT_RATE_SHADOW;
  if (player.sneaking) return SPOT_RATE_SNEAK;
  return SPOT_RATE;
}

/**
 * Walk toward (tx, ty) at `speed` tiles per second without cutting corners
 * through solid tiles. Returns true when the guard arrives this frame.
 */
function walkToward(level, guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.03) return true;
  const step = Math.min(distance, speed * dt);
  const nx = guard.x + (dx / distance) * step;
  const ny = guard.y + (dy / distance) * step;
  // Axis-separated movement: slide along walls instead of sticking to them.
  if (tileAt(level, nx, guard.y) !== '#' && tileAt(level, nx, guard.y) !== 'C' && tileAt(level, nx, guard.y) !== 'P') {
    guard.x = nx;
  }
  if (tileAt(level, guard.x, ny) !== '#' && tileAt(level, guard.x, ny) !== 'C' && tileAt(level, guard.x, ny) !== 'P') {
    guard.y = ny;
  }
  guard.facing = Math.atan2(dy, dx);
  guard.stepTimer -= dt;
  if (guard.stepTimer <= 0) {
    guard.stepTimer = 0.42;
    guard.stepped = true;
  }
  return distance - step < 0.03;
}

/** A guard hears a pebble land: turn and go look, if it is close enough. */
export function guardHearsNoise(guard, x, y, distance) {
  if (guard.state === GUARD_CHASE) return;
  if (distance > 7.5) return;
  guard.lastHeard = { x, y };
  if (guard.alert < ALERT_INVESTIGATE) guard.alert = ALERT_INVESTIGATE - 15;
  guard.state = GUARD_INVESTIGATE;
  guard.lookTimer = 0;
}

/**
 * One guard, one frame. `events` collects what the game needs to know:
 * { caught: true } when this guard lays a hand on the thief, and
 * { spotted: true } the first frame the alarm goes full.
 */
export function updateGuard(level, guard, player, dt, events) {
  const sees = guardCanSee(level, guard.x, guard.y, guard.facing, player.x, player.y, player.sneaking);
  if (sees) {
    guard.lastSeen = { x: player.x, y: player.y };
    guard.alert = Math.min(ALERT_FULL, guard.alert + spotRateFor(level, guard, player) * dt);
    guard.lostTimer = 0;
  } else {
    guard.alert = Math.max(0, guard.alert - ALERT_DECAY * dt);
  }

  if (guard.alert >= ALERT_FULL && guard.state !== GUARD_CHASE) {
    guard.state = GUARD_CHASE;
    events.spotted = true;
  }

  switch (guard.state) {
    case GUARD_PATROL: {
      if (guard.alert >= ALERT_SUSPICIOUS) {
        guard.state = GUARD_SUSPICIOUS;
        break;
      }
      if (guard.pauseLeft > 0) {
        guard.pauseLeft -= dt;
        // Look around while waiting: sweep the cone across the hall.
        guard.scanAngle += dt * 1.4;
        guard.facing += Math.sin(guard.scanAngle) * dt * 0.9;
        break;
      }
      const [wx, wy] = guard.waypoints[guard.waypointIndex];
      if (walkToward(level, guard, wx + 0.5, wy + 0.5, GUARD_PATROL_SPEED, dt)) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseLeft = guard.pause;
        guard.scanAngle = 0;
      }
      break;
    }
    case GUARD_SUSPICIOUS: {
      // Stare at the last seen spot; the meter decides what happens next.
      if (guard.lastSeen) {
        const want = Math.atan2(guard.lastSeen.y - guard.y, guard.lastSeen.x - guard.x);
        let delta = want - guard.facing;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        guard.facing += Math.sign(delta) * Math.min(Math.abs(delta), 3.2 * dt);
      }
      if (guard.alert >= ALERT_INVESTIGATE) guard.state = GUARD_INVESTIGATE;
      else if (guard.alert < ALERT_SUSPICIOUS * 0.5) guard.state = GUARD_RETURN;
      break;
    }
    case GUARD_INVESTIGATE: {
      const target = guard.lastSeen ?? guard.lastHeard;
      if (!target) {
        guard.state = GUARD_RETURN;
        break;
      }
      if (walkToward(level, guard, target.x, target.y, GUARD_INVESTIGATE_SPEED, dt)) {
        guard.lookTimer += dt;
        guard.facing += dt * 2.2; // sweep the room once arrived
        if (guard.lookTimer > 2.2) {
          guard.lookTimer = 0;
          guard.lastSeen = null;
          guard.lastHeard = null;
          guard.state = GUARD_RETURN;
        }
      }
      if (guard.alert < ALERT_SUSPICIOUS * 0.5) guard.state = GUARD_RETURN;
      break;
    }
    case GUARD_CHASE: {
      if (sees) {
        walkToward(level, guard, player.x, player.y, GUARD_CHASE_SPEED, dt);
        guard.lostTimer = 0;
      } else {
        guard.lostTimer += dt;
        if (guard.lastSeen) walkToward(level, guard, guard.lastSeen.x, guard.lastSeen.y, GUARD_INVESTIGATE_SPEED, dt);
        if (guard.lostTimer > 3) {
          guard.alert = ALERT_INVESTIGATE - 10;
          guard.state = GUARD_INVESTIGATE;
        }
      }
      if (Math.hypot(player.x - guard.x, player.y - guard.y) < GUARD_CATCH_DISTANCE) {
        events.caught = true;
      }
      break;
    }
    case GUARD_RETURN: {
      const idx = nearestWaypointIndex(guard);
      const [wx, wy] = guard.waypoints[idx];
      if (walkToward(level, guard, wx + 0.5, wy + 0.5, GUARD_PATROL_SPEED, dt)) {
        guard.waypointIndex = (idx + 1) % guard.waypoints.length;
        guard.state = GUARD_PATROL;
      }
      if (guard.alert >= ALERT_SUSPICIOUS) guard.state = GUARD_SUSPICIOUS;
      break;
    }
    default:
      break;
  }
}

/** The highest alert meter among the guards: what the HUD's alarm bar shows. */
export function highestAlert(guards) {
  return guards.reduce((max, g) => Math.max(max, g.alert), 0);
}

/** True when any guard is actively chasing the thief. */
export function anyChasing(guards) {
  return guards.some((g) => g.state === GUARD_CHASE);
}
