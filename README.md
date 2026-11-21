# Velvet Hour — a lantern-lit heist

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/diablosan19/velvet-hour-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/diablosan19/velvet-hour-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down stealth game that runs entirely in the browser: three lantern-lit museum floors, guards with vision cones on patrol routes you can learn, display cases and palms to hide behind, shadow rugs that slow a guard's suspicion, and one Moonstone to lift before you walk out the green exit unseen. No asset files, no network requests, all art drawn on canvas and all sound synthesized live.

## How to play

- **WASD / arrows** — move the thief.
- **Shift** — sneak: slower, quieter, harder to spot.
- **Click** — throw a pebble (5 per floor) and pull a nearby guard off its route to look at the noise.
- **E** — grab the Moonstone when you reach it (walking over it works too).
- **P** — pause. **R** — restart the floor. **M** — mute.

A guard's vision cone is its whole world: step into it and its alert meter fills — faster up close, slower while you sneak, slower still in shadow or inside a palm. At 35 it stops and stares, at 70 it walks over to look, at 100 it runs you down. Break line of sight and the meter drains, the guard gives up and goes back to its patrol, so a near miss is a scare, not a sentence. Get caught and you lose a life and restart the floor.

## The three floors

1. **The Lantern Gallery** — two guards, one long hall. Learn their rhythm, then walk it.
2. **The Vault Hall** — a wall splits the hall and three guards cross it. Use the doors, not the open floor.
3. **The Moonstone Vault** — four guards, a tight vault, no easy line. Palms and shadow are your friends.

Coins are a risk worth taking (+50 each), the Moonstone is the job (+500), finishing a floor never spotted pays a ghost bonus (+300), and beating par time pays a little more. Lose all three lives and the whole job starts over.

## Run it

Serve the game locally:

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Click (or press Enter) to begin.

Package the entry the way the judge receives it:

```sh
node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=6k9kp9d0&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
