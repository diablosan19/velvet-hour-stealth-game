// Velvet Hour — sound, synthesized live with WebAudio: no audio files, no
// network, nothing to load. Footsteps are the mechanic that matters: a
// guard's step ticks louder the closer it is, so the player hears a patrol
// coming before the cone ever shows it.

/** Fresh audio state: silent until the player first interacts (browsers insist). */
export function createAudio() {
  return { context: null, muted: false, master: null };
}

/** Create the context on first user gesture; safe to call before any gesture. */
export function ensureAudio(audio) {
  if (audio.context || typeof window === 'undefined' || !window.AudioContext) return;
  try {
    audio.context = new window.AudioContext();
    audio.master = audio.context.createGain();
    audio.master.gain.value = 0.5;
    audio.master.connect(audio.context.destination);
  } catch {
    audio.context = null;
  }
}

/** One short tone: frequency, length, shape and loudness. */
function blip(audio, frequency, duration, type, volume, slideTo) {
  if (!audio.context || audio.muted) return;
  const now = audio.context.currentTime;
  const oscillator = audio.context.createOscillator();
  const gain = audio.context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain);
  gain.connect(audio.master);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

/** A soft footstep: low thud, quieter with distance (0 far, 1 on top of you). */
export function playFootstep(audio, closeness) {
  if (closeness <= 0.02) return;
  blip(audio, 90 + closeness * 40, 0.09, 'sine', 0.12 * closeness);
}

/** A guard's step: a sharper tick, so patrols sound different from the thief. */
export function playGuardStep(audio, closeness) {
  if (closeness <= 0.03) return;
  blip(audio, 140, 0.06, 'triangle', 0.1 * closeness);
}

/** The rising two-note sting when a guard's suspicion turns to alarm. */
export function playSpotted(audio) {
  blip(audio, 320, 0.14, 'square', 0.12, 520);
  if (!audio.context) return;
  const later = audio.context.currentTime;
  void later;
  setTimeout(() => blip(audio, 520, 0.2, 'square', 0.12, 780), 130);
}

/** A guard giving up: the falling note when the trail goes cold. */
export function playCalmed(audio) {
  blip(audio, 420, 0.18, 'sine', 0.1, 240);
}

/** A coin: a bright ping. The Moonstone: the same ping, an octave up. */
export function playPickup(audio, big) {
  blip(audio, big ? 880 : 660, 0.12, 'sine', 0.14);
  setTimeout(() => blip(audio, big ? 1320 : 990, 0.16, 'sine', 0.12), 70);
}

/** The pebble's clatter when it lands. */
export function playPebble(audio) {
  blip(audio, 1200, 0.05, 'triangle', 0.08, 700);
}

/** Caught: a low thud, then silence. */
export function playCaught(audio) {
  blip(audio, 160, 0.3, 'sawtooth', 0.16, 60);
}

/** A level cleared: three rising notes. The win: the same, slower and longer. */
export function playClear(audio, win) {
  const notes = win ? [523, 659, 784, 1047] : [523, 659, 784];
  notes.forEach((note, i) => setTimeout(() => blip(audio, note, 0.22, 'sine', 0.13), i * 110));
}

/** Flip the mute; returns the new state for the HUD button. */
export function toggleMute(audio) {
  audio.muted = !audio.muted;
  return audio.muted;
}
