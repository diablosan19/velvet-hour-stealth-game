// Velvet Hour — boot and the one loop: read the input, tick the game while
// it is playing, paint the frame, and keep the HUD in step. The game moves
// between six screens — title, play, paused, caught, level clear and win —
// and the synth answers the steps, the spots and the clears with sound.
//
// ?seed=N fixes the decorative random stream. ?shot=cover|patrol|alarm|win
// (with &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.

import { BEST_KEY } from './config.js';
import { createRandom } from './random.js';
import {
  ACTION_GRAB,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RESTART,
  attachInput,
  createInput,
  endFrameInput,
  keyPressed,
} from './input.js';
import { createRenderer, render } from './render.js';
import { createAudio, ensureAudio, toggleMute } from './audio.js';
import {
  SCREEN_CAUGHT,
  SCREEN_LEVEL_CLEAR,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  advanceScreen,
  alarmWord,
  createGame,
  currentLevel,
  startLevel,
  tickGame,
} from './state.js';
import { stageShot } from './shots.js';
import { highestAlert } from './guards.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const random = createRandom(seed);
void random;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const game = createGame();
const renderer = createRenderer(canvas);
const audio = createAudio();
const input = createInput();
attachInput(input, canvas);

const hudLevel = document.getElementById('hud-level');
const hudObjective = document.getElementById('hud-objective');
const hudAlarmFill = document.getElementById('hud-alarm-fill');
const hudAlarmText = document.getElementById('hud-alarm-text');
const hudScore = document.getElementById('hud-score');
const hudPebbles = document.getElementById('hud-pebbles');
const hudLives = document.getElementById('hud-lives');
const hudTimer = document.getElementById('hud-timer');
const hudMessage = document.getElementById('hud-message');
const btnMute = document.getElementById('btn-mute');

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score lasts one visit.
  }
}

game.best = readBest();

/** "1:23" from a seconds count. */
function clockText(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Keep the HUD bar and the message line in step with the game. */
function syncHud() {
  const level = currentLevel(game);
  hudLevel.textContent = `Floor ${game.levelIndex + 1} of 3 · ${level.name}`;
  hudObjective.textContent = game.hasStone
    ? 'Stone taken — reach the green EXIT'
    : 'Lift the Moonstone, then reach the EXIT';
  const alert = highestAlert(game.guards);
  hudAlarmFill.style.width = `${alert}%`;
  hudAlarmFill.classList.toggle('hot', alert >= 70);
  hudAlarmFill.classList.toggle('warm', alert >= 35 && alert < 70);
  hudAlarmText.textContent = alarmWord(game);
  hudScore.textContent = `SCORE ${game.score}`;
  hudPebbles.textContent = `PEBBLES ${game.player.pebbles}`;
  hudLives.textContent = `♥`.repeat(Math.max(0, game.lives));
  hudTimer.textContent = clockText(game.levelElapsed);
  hudMessage.textContent = game.now < game.messageUntil ? game.message : '';
  status.textContent = `${level.name}. ${hudObjective.textContent}. Alarm ${alarmWord(game)}. Score ${game.score}.`;
}

/** Enter, a click, or E advances a non-play screen; E also grabs nearby. */
function handleConfirm() {
  if (game.screen === SCREEN_PLAY) return;
  if (game.score > game.best) {
    game.best = game.score;
    saveBest(game.best);
  }
  advanceScreen(game);
}

btnMute.addEventListener('click', () => {
  ensureAudio(audio);
  const muted = toggleMute(audio);
  btnMute.textContent = muted ? 'Sound off' : 'Sound on';
});

canvas.addEventListener('mousedown', () => ensureAudio(audio));
window.addEventListener('keydown', (event) => {
  ensureAudio(audio);
  if (event.code === 'Enter' || event.code === 'Space') handleConfirm();
});

let lastTime = performance.now();

/** One frame: input edges, the tick while playing, the paint, the HUD. */
function frame(now) {
  const dt = Math.min(MAX_FRAME, (now - lastTime) / 1000);
  lastTime = now;

  if (keyPressed(input, ACTION_PAUSE) && (game.screen === SCREEN_PLAY || game.screen === SCREEN_PAUSED)) {
    game.screen = game.screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
  }
  if (keyPressed(input, ACTION_RESTART) && game.screen !== SCREEN_TITLE) {
    startLevel(game, game.levelIndex);
    game.screen = SCREEN_PLAY;
  }
  if (keyPressed(input, ACTION_MUTE)) {
    const muted = toggleMute(audio);
    btnMute.textContent = muted ? 'Sound off' : 'Sound on';
  }
  if (keyPressed(input, ACTION_GRAB)) handleConfirm();

  if (game.screen === SCREEN_PLAY) {
    tickGame(game, input, dt, audio);
  } else if (input.clicks.length > 0) {
    // A click on a waiting screen advances it, like Enter does.
    handleConfirm();
  }

  render(renderer, game, game.now);
  syncHud();
  endFrameInput(input);
  requestAnimationFrame(frame);
}

if (shot) {
  // A staged screenshot: paint the scene twice, then signal readiness.
  stageShot(shot, game);
  render(renderer, game, game.now);
  render(renderer, game, game.now);
  syncHud();
  window.__shotReady = true;
} else {
  requestAnimationFrame(frame);
}
