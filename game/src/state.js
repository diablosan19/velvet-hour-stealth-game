// Velvet Hour — the game itself. The state machine (title, play, paused,
// caught, level clear, win) and the one tick that moves the thief, the
// guards and the pebble, hands out the loot, and decides when a floor is
// done. Nothing here draws or listens; main.js does that.

import {
  ALERT_FULL,
  LEVELS,
  LIVES_START,
  PEBBLE_MAX,
  SCORE_COIN,
  SCORE_GHOST_BONUS,
  SCORE_MOONSTONE,
  SCORE_TIME_BONUS_PER_SECOND,
  TILE,
} from './config.js';
import { createGuard, guardHearsNoise, highestAlert, updateGuard } from './guards.js';
import { createPlayer, updatePlayer } from './player.js';
import { findCoins, findTile } from './levels.js';
import {
  playCaught,
  playCalmed,
  playClear,
  playFootstep,
  playGuardStep,
  playPebble,
  playPickup,
  playSpotted,
} from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_LEVEL_CLEAR = 'levelclear';
export const SCREEN_WIN = 'win';

/** A fresh game: title screen, no score, three lives. */
export function createGame() {
  const game = {
    screen: SCREEN_TITLE,
    levelIndex: 0,
    level: LEVELS[0],
    player: null,
    guards: [],
    coins: [],
    stone: null,
    stoneTaken: false,
    exit: null,
    hasStone: false,
    pebble: null,
    score: 0,
    lives: LIVES_START,
    elapsed: 0,
    levelElapsed: 0,
    best: 0,
    message: '',
    messageUntil: 0,
    now: 0,
    levelClearScore: 0,
    levelClearGhost: false,
    timesSpotted: 0,
    ghostRun: true,
    levelSpotted: false,
    wasChasing: false,
  };
  startLevel(game, 0);
  game.screen = SCREEN_TITLE;
  return game;
}

/** Lay out a floor: the thief at its spawn, the guards on their routes. */
export function startLevel(game, index) {
  game.levelIndex = index;
  game.level = LEVELS[index];
  const spawn = findTile(game.level, 'S');
  game.player = createPlayer(spawn.x, spawn.y);
  game.player.pebbles = PEBBLE_MAX;
  game.guards = game.level.guards.map((def) => createGuard(def));
  game.coins = findCoins(game.level);
  game.stone = findTile(game.level, 'M');
  game.stoneTaken = false;
  game.exit = findTile(game.level, 'E');
  game.hasStone = false;
  game.pebble = null;
  game.levelElapsed = 0;
  game.levelSpotted = false;
  game.wasChasing = false;
  game.message = game.level.name;
  game.messageUntil = game.now + 3;
}

/** The floor the thief is on, for the HUD. */
export function currentLevel(game) {
  return game.level;
}

/** The state word the HUD's alarm bar shows. */
export function alarmWord(game) {
  const alert = highestAlert(game.guards);
  if (game.guards.some((g) => g.state === 'chase')) return 'CHASED';
  if (alert >= ALERT_FULL) return 'ALARM';
  if (alert >= 70) return 'HUNTED';
  if (alert >= 35) return 'SUSPICIOUS';
  if (alert > 0) return 'WARY';
  return 'HIDDEN';
}

/**
 * Throw a pebble at the point under the mouse. It arcs for half a second,
 * then clatters: every guard close enough leaves its route to look.
 */
export function throwPebble(game, targetX, targetY, audio) {
  const player = game.player;
  if (game.screen !== SCREEN_PLAY || player.pebbles <= 0 || game.pebble) return;
  player.pebbles -= 1;
  game.pebble = {
    fromX: player.x,
    fromY: player.y,
    x: player.x,
    y: player.y,
    targetX,
    targetY,
    flying: true,
    height: 0,
    flight: 0,
    ring: 0,
  };
  void audio;
}

/** One frame of the pebble's flight and landing. */
function tickPebble(game, dt, audio) {
  const pebble = game.pebble;
  if (!pebble) return;
  if (pebble.flying) {
    pebble.flight += dt / 0.5;
    if (pebble.flight >= 1) {
      pebble.flight = 1;
      pebble.flying = false;
      pebble.x = pebble.targetX;
      pebble.y = pebble.targetY;
      pebble.ring = 1;
      playPebble(audio);
      for (const guard of game.guards) {
        const distance = Math.hypot(guard.x - pebble.x, guard.y - pebble.y);
        guardHearsNoise(guard, pebble.x, pebble.y, distance);
      }
      game.message = 'The pebble clatters — a guard goes to look.';
      game.messageUntil = game.now + 2;
    } else {
      pebble.x = pebble.fromX + (pebble.targetX - pebble.fromX) * pebble.flight;
      pebble.y = pebble.fromY + (pebble.targetY - pebble.fromY) * pebble.flight;
      pebble.height = Math.sin(pebble.flight * Math.PI) * 0.9;
    }
  } else {
    pebble.ring -= dt * 1.4;
    if (pebble.ring <= 0) game.pebble = null;
  }
}

/** The thief reaches the exit with the stone: the floor is done. */
function finishLevel(game, audio) {
  const level = game.level;
  const timeBonus = Math.max(0, Math.round((level.par - game.levelElapsed) * SCORE_TIME_BONUS_PER_SECOND));
  const ghostBonus = game.levelSpotted ? 0 : SCORE_GHOST_BONUS;
  game.levelClearScore = timeBonus + ghostBonus;
  game.levelClearGhost = !game.levelSpotted;
  game.score += game.levelClearScore;
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.screen = SCREEN_WIN;
    playClear(audio, true);
  } else {
    game.screen = SCREEN_LEVEL_CLEAR;
    playClear(audio, false);
  }
}

/** A guard caught the thief: lose a life, or the run, and restart the floor. */
function caughtByGuard(game, audio) {
  game.lives -= 1;
  playCaught(audio);
  if (game.lives <= 0) {
    game.score = 0;
    game.lives = LIVES_START;
    game.timesSpotted = 0;
    game.ghostRun = true;
    startLevel(game, 0);
    game.screen = SCREEN_TITLE;
    game.message = 'The museum woke up. The whole job starts over.';
    game.messageUntil = game.now + 4;
    return;
  }
  game.screen = SCREEN_CAUGHT;
}

/**
 * One frame of play: move the thief, run every guard, fly the pebble, pick
 * up loot, and check the exit. Returns nothing; the screen changes on the
 * game object itself.
 */
export function tickGame(game, input, dt, audio) {
  game.now += dt;
  game.elapsed += dt;
  game.levelElapsed += dt;

  const player = game.player;
  const sneaking = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
  const ax = (input.keys.has('KeyA') || input.keys.has('ArrowLeft') ? -1 : 0)
    + (input.keys.has('KeyD') || input.keys.has('ArrowRight') ? 1 : 0);
  const ay = (input.keys.has('KeyW') || input.keys.has('ArrowUp') ? -1 : 0)
    + (input.keys.has('KeyS') || input.keys.has('ArrowDown') ? 1 : 0);
  updatePlayer(game.level, player, ax, ay, sneaking, dt);
  if (player.stepped) {
    player.stepped = false;
    playFootstep(audio, 0.25);
  }

  // Clicks throw pebbles at the mouse point (in tile coordinates).
  for (const click of input.clicks) {
    throwPebble(game, click.x / TILE, click.y / TILE, audio);
  }
  tickPebble(game, dt, audio);

  const events = {};
  for (const guard of game.guards) {
    updateGuard(game.level, guard, player, dt, events);
    if (guard.stepped) {
      guard.stepped = false;
      const distance = Math.hypot(guard.x - player.x, guard.y - player.y);
      playGuardStep(audio, Math.max(0, 1 - distance / 9));
    }
  }
  if (events.spotted) {
    playSpotted(audio);
    game.timesSpotted += 1;
    game.levelSpotted = true;
    game.ghostRun = false;
    game.message = 'SPOTTED — break line of sight and vanish!';
    game.messageUntil = game.now + 2.5;
  }
  const chasing = game.guards.some((g) => g.state === 'chase');
  if (game.wasChasing && !chasing) playCalmed(audio);
  game.wasChasing = chasing;

  if (events.caught) {
    caughtByGuard(game, audio);
    return;
  }

  // Pickups: coins by walking over them, the stone with E (or by touch).
  for (const coin of game.coins) {
    if (!coin.taken && Math.hypot(coin.x - player.x, coin.y - player.y) < 0.6) {
      coin.taken = true;
      game.score += SCORE_COIN;
      playPickup(audio, false);
      game.message = `Coin pocketed — +${SCORE_COIN} points.`;
      game.messageUntil = game.now + 1.5;
    }
  }
  if (!game.stoneTaken && game.stone && Math.hypot(game.stone.x - player.x, game.stone.y - player.y) < 0.7) {
    game.stoneTaken = true;
    game.hasStone = true;
    game.score += SCORE_MOONSTONE;
    playPickup(audio, true);
    game.message = `The Moonstone is yours — +${SCORE_MOONSTONE}. Now reach the green EXIT.`;
    game.messageUntil = game.now + 3;
  }

  // The exit only opens the floor once the stone is taken.
  if (game.hasStone && game.exit && Math.hypot(game.exit.x - player.x, game.exit.y - player.y) < 0.8) {
    finishLevel(game, audio);
  }
}

/** Advance from a caught / cleared / won screen on Enter or a click. */
export function advanceScreen(game) {
  if (game.screen === SCREEN_TITLE) {
    startLevel(game, 0);
    game.screen = SCREEN_PLAY;
  } else if (game.screen === SCREEN_CAUGHT) {
    startLevel(game, game.levelIndex);
    game.screen = SCREEN_PLAY;
  } else if (game.screen === SCREEN_LEVEL_CLEAR) {
    startLevel(game, game.levelIndex + 1);
    game.screen = SCREEN_PLAY;
  } else if (game.screen === SCREEN_WIN) {
    game.score = 0;
    game.lives = LIVES_START;
    game.timesSpotted = 0;
    game.ghostRun = true;
    startLevel(game, 0);
    game.screen = SCREEN_PLAY;
  }
}
