// Velvet Hour — tuning constants and the three museum floors.
//
// The game is a top-down stealth heist: slip past the night guards, lift the
// Moonstone, and walk out the green exit door unseen. Every floor is one ASCII
// map, 32 columns by 18 rows, one tile 40 px, so the whole level fits the
// 1280 x 720 canvas with no camera and no scrolling: the player always sees
// the full patrol picture and can plan a route.
//
// Map letters:
//   #  wall — blocks movement and sight
//   C  display case — blocks movement and sight, low enough to read as cover
//   P  pillar — blocks movement and sight
//   B  potted palm — blocks sight, and hides a player standing inside it
//   ~  shadow rug — dark floor; a player standing on it is spotted far slower
//   .  open floor
//   S  the thief's spawn   M  the Moonstone   E  the exit door
//   *  a coin, worth points, always a small risk to grab
//   1-4  a guard's spawn tile (patrol routes live beside the map)

export const TILE = 36;
export const COLS = 32;
export const ROWS = 18;
export const VIEW_W = COLS * TILE;
export const VIEW_H = ROWS * TILE;

// How fast the thief moves, in tiles per second.
export const WALK_SPEED = 3.4;
export const SNEAK_SPEED = 1.7;
// How far a guard sees, in tiles, and how wide its cone is (half-angle).
export const CONE_RANGE = 6.0;
export const CONE_HALF_ANGLE = 0.61; // about 35 degrees
// A guard hears a thrown pebble land within this many tiles.
export const EARSHOT = 7.5;
// Alert meter: 0 calm, 35 suspicious, 70 investigating, 100 full alarm.
export const ALERT_SUSPICIOUS = 35;
export const ALERT_INVESTIGATE = 70;
export const ALERT_FULL = 100;
// How fast the meter fills while the thief is in plain view of a guard.
export const SPOT_RATE = 55; // points per second, standing in the open
export const SPOT_RATE_SNEAK = 26; // sneaking halves the fill rate
export const SPOT_RATE_SHADOW = 16; // shadow rugs slow it further
export const SPOT_RATE_PALM = 10; // inside a palm the thief is barely there
export const SPOT_RATE_CLOSE = 95; // closer than 2 tiles: almost instant
export const ALERT_DECAY = 14; // points per second while the thief is unseen
// Guard paces, in tiles per second.
export const GUARD_PATROL_SPEED = 1.5;
export const GUARD_INVESTIGATE_SPEED = 2.2;
export const GUARD_CHASE_SPEED = 3.1;
export const GUARD_CATCH_DISTANCE = 0.62; // tiles: closer than this, caught
export const PEBBLE_MAX = 5;
export const LIVES_START = 3;

// One guard's route: waypoints in tile coordinates, walked in order and back.
export const LEVELS = [
  {
    name: 'The Lantern Gallery',
    sub: 'Two guards, one long hall — learn their rhythm, then walk it.',
    par: 75,
    map: [
      '################################',
      '#......C............C..........#',
      '#..S......................*....#',
      '#.........P........P...........#',
      '#......C............C..........#',
      '#..............................#',
      '#...####......C......####......#',
      '#...#..................#.......#',
      '#...#..1......M.......2.#......#',
      '#...#..................#.......#',
      '#...####......C......####......#',
      '#..............................#',
      '#......P............P..........#',
      '#..C........C..........C.......#',
      '#..............................#',
      '#....~~~~......~~~~......~.....#',
      '#..........................E...#',
      '################################',
    ],
    guards: [
      { spawn: [7, 8], waypoints: [[8, 8], [12, 8], [12, 5], [8, 5]], pause: 1.4 },
      { spawn: [22, 8], waypoints: [[23, 8], [23, 12], [19, 12], [19, 8]], pause: 1.2 },
    ],
  },
  {
    name: 'The Vault Hall',
    sub: 'A wall splits the hall and three guards cross it — use the doors, not the open floor.',
    par: 100,
    map: [
      '################################',
      '#..C..........#.........*......#',
      '#..S..........#................#',
      '#......P......#.....P..........#',
      '#............D.................#',
      '#..*..........#....C...........#',
      '#......C......#................#',
      '#............D........P........#',
      '#..1..........#.....2..........#',
      '#............D.................#',
      '#......P......#....C...........#',
      '#............D........*........#',
      '#..C..........#................#',
      '#......B......#.....B..........#',
      '#............D.......M.........#',
      '#..~~~~.......#......~~~~......#',
      '#..........................E...#',
      '################################',
    ],
    guards: [
      { spawn: [3, 8], waypoints: [[3, 3], [3, 13], [10, 13], [10, 3]], pause: 1.0 },
      { spawn: [22, 8], waypoints: [[22, 3], [28, 3], [28, 13], [22, 13]], pause: 1.0 },
      { spawn: [16, 14], waypoints: [[16, 14], [16, 6], [26, 6], [26, 14]], pause: 1.6 },
    ],
  },
  {
    name: 'The Moonstone Vault',
    sub: 'Four guards, a tight vault, no easy line — palms and shadow are your friends.',
    par: 130,
    map: [
      '################################',
      '#..C......B........B......C....#',
      '#..S...........................#',
      '#......P....C......C....P......#',
      '#..............................#',
      '#..1.......####...####.......3.#',
      '#..........#........#..........#',
      '#..B.......#...M....#.......B..#',
      '#..........#........#..........#',
      '#..2.......####...####.......4.#',
      '#..............................#',
      '#......C....P......P....C......#',
      '#..............................#',
      '#..~~~~....B........B....~~~~..#',
      '#..............................#',
      '#..*..........C..........*.....#',
      '#..........................E...#',
      '################################',
    ],
    guards: [
      { spawn: [3, 5], waypoints: [[3, 5], [3, 9], [9, 9], [9, 5]], pause: 0.9 },
      { spawn: [3, 9], waypoints: [[3, 9], [3, 13], [9, 13], [9, 9]], pause: 0.9 },
      { spawn: [28, 5], waypoints: [[28, 5], [28, 9], [22, 9], [22, 5]], pause: 0.9 },
      { spawn: [28, 9], waypoints: [[28, 9], [28, 13], [22, 13], [22, 9]], pause: 0.9 },
    ],
  },
];

// Points: coins are a risk, the Moonstone is the job, staying unseen pays best.
export const SCORE_COIN = 50;
export const SCORE_MOONSTONE = 500;
export const SCORE_GHOST_BONUS = 300; // finish a level never spotted
export const SCORE_TIME_BONUS_PER_SECOND = 4; // under par time
export const BEST_KEY = 'velvet-hour-best';
