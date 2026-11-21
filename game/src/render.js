// Velvet Hour — the canvas painter. One function paints a whole frame: the
// museum floor, the walls and cover, every guard's vision cone, the thief,
// the Moonstone and the exit, then a lighting pass that darkens the hall
// except around the lanterns, the guards and the thief. The painter never
// touches game state; it only reads it.

import { COLS, ROWS, TILE, VIEW_H, VIEW_W } from './config.js';
import { conePolygon } from './vision.js';
import { GUARD_CHASE, GUARD_INVESTIGATE, GUARD_SUSPICIOUS } from './guards.js';
import { createRandom } from './random.js';

/** A renderer bound to a canvas: holds the dust motes and the lighting layer. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const light = document.createElement('canvas');
  light.width = VIEW_W;
  light.height = VIEW_H;
  const lightCtx = light.getContext('2d');
  const random = createRandom(20261121);
  // Dust motes that drift in the lantern light: fixed positions, slow drift.
  const motes = Array.from({ length: 90 }, () => ({
    x: random() * VIEW_W,
    y: random() * VIEW_H,
    r: 0.8 + random() * 1.6,
    drift: 4 + random() * 10,
    phase: random() * Math.PI * 2,
  }));
  return { ctx, light, lightCtx, motes };
}

function tilePixels(tx, ty) {
  return { x: tx * TILE, y: ty * TILE };
}

/** The floor: alternating dark wood boards with a worn centre aisle. */
function drawFloor(ctx, level) {
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      const p = tilePixels(tx, ty);
      const even = (tx + ty) % 2 === 0;
      ctx.fillStyle = even ? '#3d3222' : '#362c1e';
      ctx.fillRect(p.x, p.y, TILE, TILE);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.strokeRect(p.x + 0.5, p.y + 0.5, TILE - 1, TILE - 1);
      if (level.map[ty][tx] === '~') {
        ctx.fillStyle = 'rgba(10, 8, 20, 0.55)';
        ctx.fillRect(p.x + 2, p.y + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = 'rgba(120, 90, 160, 0.35)';
        ctx.strokeRect(p.x + 4.5, p.y + 4.5, TILE - 9, TILE - 9);
      }
    }
  }
}

/** Walls as dark stone blocks with a lit top edge; cases, pillars, palms. */
function drawFurniture(ctx, level, now) {
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      const ch = level.map[ty][tx];
      const p = tilePixels(tx, ty);
      if (ch === '#') {
        ctx.fillStyle = '#232839';
        ctx.fillRect(p.x, p.y, TILE, TILE);
        ctx.fillStyle = '#3d4460';
        ctx.fillRect(p.x, p.y, TILE, 5);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(p.x, p.y + TILE - 4, TILE, 4);
      } else if (ch === 'C') {
        ctx.fillStyle = '#3a2c17';
        ctx.fillRect(p.x + 3, p.y + 3, TILE - 6, TILE - 6);
        ctx.fillStyle = 'rgba(150, 200, 230, 0.28)';
        ctx.fillRect(p.x + 6, p.y + 6, TILE - 12, TILE - 12);
        ctx.strokeStyle = '#c9a227';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x + 3.5, p.y + 3.5, TILE - 7, TILE - 7);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(p.x + 9, p.y + 8, 5, TILE - 18);
      } else if (ch === 'P') {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.ellipse(p.x + TILE / 2 + 4, p.y + TILE / 2 + 5, 15, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4a4238';
        ctx.beginPath();
        ctx.arc(p.x + TILE / 2, p.y + TILE / 2, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6b5f4c';
        ctx.beginPath();
        ctx.arc(p.x + TILE / 2 - 3, p.y + TILE / 2 - 3, 9, 0, Math.PI * 2);
        ctx.fill();
      } else if (ch === 'B') {
        ctx.fillStyle = '#1d3a1e';
        for (const [ox, oy, r] of [[-8, -4, 12], [6, -8, 11], [8, 6, 12], [-6, 8, 10], [0, 0, 13]]) {
          ctx.beginPath();
          ctx.arc(p.x + TILE / 2 + ox, p.y + TILE / 2 + oy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#2f6b2f';
        ctx.beginPath();
        ctx.arc(p.x + TILE / 2 - 3, p.y + TILE / 2 - 3, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  void now;
}

/** The Moonstone: a pulsing cyan diamond on a pedestal. */
function drawMoonstone(ctx, stone, now) {
  if (!stone) return;
  const x = stone.x * TILE;
  const y = stone.y * TILE;
  const pulse = 0.7 + Math.sin(now * 2.4) * 0.3;
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 46 * pulse);
  glow.addColorStop(0, 'rgba(80, 230, 255, 0.55)');
  glow.addColorStop(1, 'rgba(80, 230, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 46 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2c17';
  ctx.fillRect(x - 14, y + 8, 28, 8);
  ctx.fillStyle = '#7df3ff';
  ctx.beginPath();
  ctx.moveTo(x, y - 14);
  ctx.lineTo(x + 10, y);
  ctx.lineTo(x, y + 12);
  ctx.lineTo(x - 10, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x + 4, y);
  ctx.lineTo(x, y + 5);
  ctx.lineTo(x - 4, y);
  ctx.closePath();
  ctx.fill();
}

/** Coins: small gold discs with a shine. */
function drawCoins(ctx, coins) {
  for (const coin of coins) {
    if (coin.taken) continue;
    const x = coin.x * TILE;
    const y = coin.y * TILE;
    ctx.fillStyle = '#c9a227';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe27a';
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The exit: a green door with an EXIT sign, glowing once the stone is taken. */
function drawExit(ctx, exit, hasStone, now) {
  if (!exit) return;
  const x = exit.x * TILE;
  const y = exit.y * TILE;
  const glowStrength = hasStone ? 0.55 + Math.sin(now * 3) * 0.15 : 0.18;
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 60);
  glow.addColorStop(0, `rgba(60, 220, 120, ${glowStrength})`);
  glow.addColorStop(1, 'rgba(60, 220, 120, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hasStone ? '#1f7a44' : '#234a30';
  ctx.fillRect(x - 16, y - 18, 32, 36);
  ctx.strokeStyle = hasStone ? '#5be584' : '#3f7a52';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 16.5, y - 18.5, 33, 37);
  ctx.fillStyle = hasStone ? '#b8ffcf' : '#7fae8c';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', x, y - 26);
  ctx.fillStyle = '#d8ffe2';
  ctx.beginPath();
  ctx.arc(x + 10, y, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

/** One guard's cone, coloured by how alarmed it is, clipped by the furniture. */
function drawCone(ctx, level, guard) {
  const polygon = conePolygon(level, guard.x, guard.y, guard.facing);
  let fill = 'rgba(255, 200, 60, 0.27)';
  let edge = 'rgba(255, 210, 90, 0.6)';
  if (guard.state === GUARD_SUSPICIOUS) {
    fill = 'rgba(255, 150, 40, 0.34)';
    edge = 'rgba(255, 160, 60, 0.75)';
  } else if (guard.state === GUARD_INVESTIGATE || guard.state === GUARD_CHASE) {
    fill = 'rgba(255, 60, 50, 0.36)';
    edge = 'rgba(255, 80, 70, 0.85)';
  }
  ctx.beginPath();
  ctx.moveTo(polygon[0].x * TILE, polygon[0].y * TILE);
  for (let i = 1; i < polygon.length; i += 1) ctx.lineTo(polygon[i].x * TILE, polygon[i].y * TILE);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/** The thief: a teal hooded figure, crouched lower while sneaking. */
function drawPlayer(ctx, player) {
  const x = player.x * TILE;
  const y = player.y * TILE;
  const crouch = player.sneaking ? 0.82 : 1;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 10, 13, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0e7c86';
  ctx.beginPath();
  ctx.arc(x, y, 13 * crouch + 2, 0, Math.PI * 2);
  ctx.fill();
  // Hood point in the facing direction.
  const hx = x + Math.cos(player.facing) * 13;
  const hy = y + Math.sin(player.facing) * 13;
  ctx.fillStyle = '#12a5b4';
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(x + Math.cos(player.facing + 2.4) * 10, y + Math.sin(player.facing + 2.4) * 10);
  ctx.lineTo(x + Math.cos(player.facing - 2.4) * 10, y + Math.sin(player.facing - 2.4) * 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8f6f8';
  ctx.beginPath();
  ctx.arc(x + Math.cos(player.facing) * 5, y + Math.sin(player.facing) * 5, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

/** One guard: a maroon uniform, a cap, and its alarm mark (? or !). */
function drawGuard(ctx, guard) {
  const x = guard.x * TILE;
  const y = guard.y * TILE;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 10, 13, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8c2f39';
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5d1d24';
  ctx.beginPath();
  ctx.arc(x, y - 4, 9, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - 9, y - 5, 18, 3);
  ctx.fillStyle = '#f4e8d8';
  ctx.beginPath();
  ctx.arc(x + Math.cos(guard.facing) * 6, y + Math.sin(guard.facing) * 6, 3, 0, Math.PI * 2);
  ctx.fill();
  // A lantern glow follows each guard: they carry the light.
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 70);
  glow.addColorStop(0, 'rgba(255, 190, 90, 0.14)');
  glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 70, 0, Math.PI * 2);
  ctx.fill();
  if (guard.state === GUARD_SUSPICIOUS || guard.alert >= 35) {
    ctx.fillStyle = '#ffb020';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('?', x, y - 40);
  }
  if (guard.state === GUARD_INVESTIGATE || guard.state === GUARD_CHASE) {
    ctx.fillStyle = '#ff4b3e';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('!', x, y - 40);
  }
  // The alert meter, a thin bar over a worried guard.
  if (guard.alert > 2) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 16, y - 34, 32, 5);
    ctx.fillStyle = guard.alert >= 70 ? '#ff4b3e' : '#ffb020';
    ctx.fillRect(x - 15, y - 33, 30 * (guard.alert / 100), 3);
  }
}

/** A thrown pebble in flight, with its landing ring. */
function drawPebble(ctx, pebble) {
  if (!pebble) return;
  const x = pebble.x * TILE;
  const y = pebble.y * TILE;
  if (pebble.flying) {
    ctx.fillStyle = '#c8c8c8';
    ctx.beginPath();
    ctx.arc(x, y - pebble.height * TILE, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,200,200,0.4)';
    ctx.beginPath();
    ctx.moveTo(pebble.fromX * TILE, pebble.fromY * TILE);
    ctx.lineTo(x, y - pebble.height * TILE);
    ctx.stroke();
  } else if (pebble.ring > 0) {
    ctx.strokeStyle = `rgba(255, 220, 120, ${pebble.ring})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, (1 - pebble.ring) * 30 + 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** The lighting pass: darkness everywhere except the lit pools. */
function drawLighting(renderer, game) {
  const { lightCtx } = renderer;
  lightCtx.clearRect(0, 0, VIEW_W, VIEW_H);
  lightCtx.fillStyle = 'rgba(5, 7, 18, 0.30)';
  lightCtx.fillRect(0, 0, VIEW_W, VIEW_H);
  lightCtx.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, strength) => {
    const g = lightCtx.createRadialGradient(x, y, 4, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${strength})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    lightCtx.fillStyle = g;
    lightCtx.beginPath();
    lightCtx.arc(x, y, r, 0, Math.PI * 2);
    lightCtx.fill();
  };
  hole(game.player.x * TILE, game.player.y * TILE, 175, 0.9);
  for (const guard of game.guards) hole(guard.x * TILE, guard.y * TILE, 140, 0.8);
  if (game.stone) hole(game.stone.x * TILE, game.stone.y * TILE, 110, 0.85);
  if (game.exit) hole(game.exit.x * TILE, game.exit.y * TILE, 110, 0.85);
  lightCtx.globalCompositeOperation = 'source-over';
  renderer.ctx.drawImage(renderer.light, 0, 0);
}

/** Dust motes drifting in the light. */
function drawMotes(renderer, now) {
  const { ctx, motes } = renderer;
  ctx.fillStyle = 'rgba(255, 220, 150, 0.35)';
  for (const mote of motes) {
    const y = mote.y + Math.sin(now * 0.3 + mote.phase) * mote.drift;
    ctx.beginPath();
    ctx.arc(mote.x, y, mote.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 10, 20, 0.88)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function centreText(ctx, text, x, y, font, colour) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = colour;
  ctx.fillText(text, x, y);
}

/** The title screen: the game's name, the job, and the controls. */
function drawTitle(ctx, game) {
  ctx.fillStyle = 'rgba(4, 5, 12, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 290, 130, 700, 460);
  centreText(ctx, 'VELVET HOUR', 640, 190, 'bold 64px system-ui, sans-serif', '#ffd93b');
  centreText(ctx, 'a lantern-lit heist in three museum floors', 640, 238, '20px system-ui, sans-serif', '#c8d4e8');
  centreText(ctx, 'Slip past the night guards. Lift the Moonstone.', 640, 300, '18px system-ui, sans-serif', '#f4f8ff');
  centreText(ctx, 'Reach the green EXIT door unseen.', 640, 328, '18px system-ui, sans-serif', '#f4f8ff');
  centreText(ctx, 'WASD / arrows — move      Shift — sneak, slower and harder to spot', 640, 390, '16px system-ui, sans-serif', '#9db2cc');
  centreText(ctx, 'Click — throw a pebble and pull a guard away      E — grab the stone', 640, 418, '16px system-ui, sans-serif', '#9db2cc');
  centreText(ctx, 'P — pause      R — restart      M — mute', 640, 446, '16px system-ui, sans-serif', '#9db2cc');
  centreText(ctx, 'Hide in shadow rugs and palms. Watch the cones —', 640, 492, '16px system-ui, sans-serif', '#9db2cc');
  centreText(ctx, 'a guard that sees you gives you a chance to vanish again.', 640, 516, '16px system-ui, sans-serif', '#9db2cc');
  centreText(ctx, 'Press Enter or click to begin', 640, 556, 'bold 18px system-ui, sans-serif', '#2fd47a');
  if (game.best > 0) centreText(ctx, `Best score: ${game.best}`, 640, 584, '15px system-ui, sans-serif', '#ffd93b');
}

/** The paused overlay. */
function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(4, 5, 12, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  centreText(ctx, 'PAUSED', 640, 330, 'bold 48px system-ui, sans-serif', '#f4f8ff');
  centreText(ctx, 'Press P to carry on', 640, 390, '18px system-ui, sans-serif', '#9db2cc');
}

/** The caught overlay: a guard has the thief. */
function drawCaught(ctx, game) {
  ctx.fillStyle = 'rgba(20, 4, 6, 0.66)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 340, 230, 600, 260);
  centreText(ctx, 'CAUGHT', 640, 285, 'bold 52px system-ui, sans-serif', '#ff5d5d');
  centreText(ctx, `A guard laid a hand on you. ${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left.`, 640, 340, '18px system-ui, sans-serif', '#f4f8ff');
  centreText(ctx, 'Press Enter to slip back to the start of this floor', 640, 380, '16px system-ui, sans-serif', '#9db2cc');
  centreText(ctx, 'Next time, wait for the cone to turn away.', 640, 412, '16px system-ui, sans-serif', '#9db2cc');
  centreText(ctx, `Score: ${game.score}`, 640, 448, '16px system-ui, sans-serif', '#ffd93b');
}

/** The level-clear overlay. */
function drawLevelClear(ctx, game) {
  ctx.fillStyle = 'rgba(4, 12, 6, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 340, 220, 600, 280);
  centreText(ctx, 'CLEAN GETAWAY', 640, 275, 'bold 44px system-ui, sans-serif', '#2fd47a');
  centreText(ctx, `Floor cleared — ${game.levelClearScore} points this floor.`, 640, 330, '18px system-ui, sans-serif', '#f4f8ff');
  centreText(ctx, game.levelClearGhost ? 'Ghost bonus: never spotted. Beautiful.' : 'Spotted once or twice — the next floor forgives nothing.', 640, 362, '16px system-ui, sans-serif', '#9db2cc');
  centreText(ctx, `Score: ${game.score}`, 640, 400, '16px system-ui, sans-serif', '#ffd93b');
  centreText(ctx, 'Press Enter for the next floor', 640, 448, 'bold 17px system-ui, sans-serif', '#2fd47a');
}

/** The win screen: all three floors, the Moonstone, the whole museum. */
function drawWin(ctx, game) {
  ctx.fillStyle = 'rgba(4, 8, 16, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 290, 150, 700, 420);
  centreText(ctx, 'THE MOONSTONE IS YOURS', 640, 210, 'bold 44px system-ui, sans-serif', '#7df3ff');
  centreText(ctx, 'Three floors, three guards\' rounds learned,', 640, 270, '18px system-ui, sans-serif', '#f4f8ff');
  centreText(ctx, 'one quiet walk out of the Velvet Hour museum.', 640, 298, '18px system-ui, sans-serif', '#f4f8ff');
  centreText(ctx, `Final score: ${game.score}`, 640, 352, 'bold 24px system-ui, sans-serif', '#ffd93b');
  centreText(ctx, game.ghostRun ? 'A full ghost run — no guard ever raised the alarm.' : `Spotted ${game.timesSpotted} ${game.timesSpotted === 1 ? 'time' : 'times'} along the way.`, 640, 392, '16px system-ui, sans-serif', '#9db2cc');
  centreText(ctx, `Best score: ${Math.max(game.best, game.score)}`, 640, 424, '16px system-ui, sans-serif', '#ffd93b');
  centreText(ctx, 'Press Enter to steal it all over again', 640, 500, 'bold 17px system-ui, sans-serif', '#2fd47a');
}

/**
 * Paint one frame. `game.screen` decides whether the level is painted under
 * an overlay (title, paused, caught, level clear, win) or on its own.
 */
export function render(renderer, game, now) {
  const { ctx } = renderer;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const level = game.level;
  drawFloor(ctx, level);
  drawMoonstone(ctx, game.stoneTaken ? null : game.stone, now);
  drawCoins(ctx, game.coins);
  drawExit(ctx, game.exit, game.hasStone, now);
  for (const guard of game.guards) drawCone(ctx, level, guard);
  drawFurniture(ctx, level, now);
  drawPebble(ctx, game.pebble);
  drawPlayer(ctx, game.player);
  for (const guard of game.guards) drawGuard(ctx, guard);
  drawMotes(renderer, now);
  drawLighting(renderer, game);
  if (game.screen === 'title') drawTitle(ctx, game);
  else if (game.screen === 'paused') drawPaused(ctx);
  else if (game.screen === 'caught') drawCaught(ctx, game);
  else if (game.screen === 'levelclear') drawLevelClear(ctx, game);
  else if (game.screen === 'win') drawWin(ctx, game);
}
