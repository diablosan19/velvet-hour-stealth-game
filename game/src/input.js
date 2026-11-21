// Velvet Hour — keyboard and mouse. WASD or arrows move, Shift sneaks, click
// throws a pebble at the mouse, E grabs, P pauses, R restarts, M mutes.
// The module keeps the raw state; the game loop reads it each frame.

export const ACTION_PAUSE = 'KeyP';
export const ACTION_RESTART = 'KeyR';
export const ACTION_MUTE = 'KeyM';
export const ACTION_GRAB = 'KeyE';
export const ACTION_SNEAK = 'ShiftLeft';

/** Fresh input state: nothing pressed, mouse off the canvas. */
export function createInput() {
  return {
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    /** Clicks since the last frame, in canvas pixels. */
    clicks: [],
    /** Keys pressed since the last frame (edge-triggered actions). */
    pressed: new Set(),
  };
}

/** Wire the listeners onto the window and the canvas. */
export function attachInput(input, canvas) {
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    input.keys.add(event.code);
    input.pressed.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    input.mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.clicks.push({
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
      button: event.button,
    });
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}

/** True while the named key is held down. */
export function keyDown(input, code) {
  return input.keys.has(code);
}

/** True only on the frame the named key went down. */
export function keyPressed(input, code) {
  return input.pressed.has(code);
}

/** The movement axes from WASD or the arrow keys, each -1, 0 or 1. */
export function moveAxes(input) {
  const left = keyDown(input, 'KeyA') || keyDown(input, 'ArrowLeft') ? -1 : 0;
  const right = keyDown(input, 'KeyD') || keyDown(input, 'ArrowRight') ? 1 : 0;
  const up = keyDown(input, 'KeyW') || keyDown(input, 'ArrowUp') ? -1 : 0;
  const down = keyDown(input, 'KeyS') || keyDown(input, 'ArrowDown') ? 1 : 0;
  return { ax: left + right, ay: up + down };
}

/** Clear the per-frame edges: call once at the end of every game frame. */
export function endFrameInput(input) {
  input.clicks.length = 0;
  input.pressed.clear();
}
