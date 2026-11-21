// Velvet Hour — the screenshot scenes behind ?shot=cover|patrol|alarm|win.
// Each one is composed from the game's own parts — a real floor, real guards
// on their real routes, a real clock — so the frame is a real moment of a
// real game and the same seed always gives the same frame.

import { SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, startLevel } from './state.js';
import { LEVELS } from './config.js';

/** The title screen over the first floor, nothing stolen yet. */
function stageTitle(game) {
  game.screen = SCREEN_TITLE;
  game.levelIndex = 0;
  game.now = 0;
}

/**
 * The cover: mid-play on the Lantern Gallery. The thief crouches behind a
 * display case in the middle hall while a guard's cone sweeps just past,
 * the Moonstone glows on its pedestal ahead and the green EXIT waits at the
 * far right. One coin already pocketed, the clock at 0:31.
 */
function stageCover(game) {
  startLevel(game, 0);
  game.now = 31;
  game.levelElapsed = 31;
  game.player.x = 12.5;
  game.player.y = 9.5;
  game.player.facing = Math.PI / 2;
  game.player.sneaking = true;
  game.guards[0].x = 9.5;
  game.guards[0].y = 7.5;
  game.guards[0].facing = Math.PI * 0.85;
  game.guards[0].alert = 18;
  game.guards[0].state = 'suspicious';
  game.guards[0].lastSeen = { x: 12.5, y: 9.5 };
  game.guards[1].x = 22.5;
  game.guards[1].y = 8.5;
  game.guards[1].facing = -Math.PI * 0.6;
  game.coins[0].taken = true;
  game.score = 50;
  game.screen = SCREEN_PLAY;
  game.message = 'The guard is suspicious — hold still in the shadow.';
  game.messageUntil = game.now + 3;
}

/**
 * The Vault Hall: the thief waits in a shadow rug at the bottom while two
 * cones cross the hall above and the third guard turns toward the doors.
 */
function stagePatrol(game) {
  startLevel(game, 1);
  game.now = 47;
  game.levelElapsed = 47;
  game.player.x = 4.5;
  game.player.y = 15.5;
  game.player.facing = Math.PI / 2;
  game.player.sneaking = true;
  game.guards[0].x = 6.5;
  game.guards[0].y = 8.5;
  game.guards[0].facing = 0;
  game.guards[1].x = 25.5;
  game.guards[1].y = 8.5;
  game.guards[1].facing = Math.PI;
  game.guards[2].x = 20.5;
  game.guards[2].y = 10.5;
  game.guards[2].facing = Math.PI * 0.5;
  game.guards[2].alert = 12;
  game.screen = SCREEN_PLAY;
  game.message = 'Three cones, one hall — wait for the gap.';
  game.messageUntil = game.now + 3;
}

/**
 * The near miss: a guard's meter at 88, its cone red and closing on the
 * thief at the edge of a case, the alarm word on the HUD reading HUNTED.
 */
function stageAlarm(game) {
  startLevel(game, 0);
  game.now = 58;
  game.levelElapsed = 58;
  game.player.x = 13.5;
  game.player.y = 7.5;
  game.player.facing = -Math.PI / 2;
  game.guards[0].x = 9.5;
  game.guards[0].y = 7.5;
  game.guards[0].facing = 0;
  game.guards[0].alert = 88;
  game.guards[0].state = 'investigate';
  game.guards[0].lastSeen = { x: 13.5, y: 7.5 };
  game.guards[1].x = 22.5;
  game.guards[1].y = 11.5;
  game.guards[1].facing = Math.PI * 0.75;
  game.screen = SCREEN_PLAY;
  game.message = 'SPOTTED — break line of sight and vanish!';
  game.messageUntil = game.now + 3;
}

/** The win screen: all three floors stolen, the final score on the board. */
function stageWin(game) {
  startLevel(game, 2);
  game.now = 210;
  game.levelElapsed = 62;
  game.score = 2140;
  game.timesSpotted = 2;
  game.ghostRun = false;
  game.screen = SCREEN_WIN;
  game.best = 2140;
}

/** Set `game` to the named scene (cover, patrol, alarm or win; else title). */
export function stageShot(name, game) {
  if (name === 'cover') return stageCover(game);
  if (name === 'patrol') return stagePatrol(game);
  if (name === 'alarm') return stageAlarm(game);
  if (name === 'win') return stageWin(game);
  return stageTitle(game);
}

/** The shot names this entry ships, in the order the dossier shows them. */
export function shotNames() {
  return ['cover', 'patrol', 'alarm', 'win'];
}

export { LEVELS };
