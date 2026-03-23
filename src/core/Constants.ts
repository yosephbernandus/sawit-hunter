// World & Rendering
export const TICK_RATE = 1 / 60;
export const MAX_DELTA = 1 / 30;

// Lanes
export const LANE_COUNT = 3;
export const LANE_WIDTH = 2.5;
export const LANE_POSITIONS = [-LANE_WIDTH, 0, LANE_WIDTH];

// Player
export const PLAYER_LANE_LERP_SPEED = 12;
export const PLAYER_Y = 0.6;

// World Generation
export const CHUNK_DEPTH = 50;
export const VISIBLE_CHUNKS = 6;
export const TREES_PER_CHUNK_HIGH = 4;
export const TREES_PER_CHUNK_LOW = 2;
export const TREE_X_OFFSET = 5;

// Speed & Difficulty
export const BASE_SPEED = 10;
export const SPEED_INCREMENT = 2;
export const SPEED_INCREMENT_INTERVAL = 100; // score
export const MAX_SPEED = 30;

// Collectibles
export const SAWIT_POINTS = 10;
export const GOLDEN_SAWIT_POINTS = 50;
export const GOLDEN_SAWIT_CHANCE = 0.1;
export const SAWIT_SPAWN_INTERVAL = 1.2; // seconds
export const SAWIT_Y = 1.0;

// Obstacles
export const OBSTACLE_START_SCORE = 100;
export const OBSTACLE_SPAWN_INTERVAL_BASE = 3.0; // seconds
export const OBSTACLE_SPAWN_INTERVAL_MIN = 1.5;

// Power-ups
export const POWERUP_CHANCE = 0.1;
export const SHIELD_DURATION = 10;
export const MAGNET_DURATION = 8;
export const BIG_BUCKET_DURATION = 8;
export const MAGNET_RANGE = 12;

// Score milestones
export const MILESTONE_INTERVAL = 100;

// Camera
export const CAMERA_OFFSET_Y = 6;
export const CAMERA_OFFSET_Z = 10;
export const CAMERA_LOOK_AHEAD = 15;
export const CAMERA_LERP_SPEED = 5;

// Fog
export const FOG_NEAR_HIGH = 20;
export const FOG_FAR_HIGH = 200;
export const FOG_NEAR_LOW = 15;
export const FOG_FAR_LOW = 100;

// Colors
export const SKY_COLOR = 0x87ceeb;
export const FOG_COLOR = 0x87ceeb;
export const GROUND_COLOR = 0x4a7c2e;
export const BARK_COLOR = 0x8b6914;
export const LEAF_COLOR = 0x228b22;
export const SAWIT_COLOR = 0xff6b2b;
export const GOLDEN_COLOR = 0xffd700;
export const SNAKE_COLOR = 0xffffff;
export const LOG_COLOR = 0x6b4226;
export const BUCKET_COLOR = 0x888888;

// Goblin
export const GOBLIN_START_SCORE = 250;
export const GOBLIN_SPAWN_MIN = 7; // seconds between spawns
export const GOBLIN_SPAWN_MAX = 14;
export const GOBLIN_CROSS_SPEED_MIN = 3; // slow goblins
export const GOBLIN_CROSS_SPEED_MAX = 5.5; // fast goblins
export const GOBLIN_COLOR = 0x3d6b2e;
export const GOBLIN_SKIN_COLOR = 0x7fbf4f;

// Near-miss
export const NEAR_MISS_Z_RANGE = 3.0;
export const NEAR_MISS_POINTS = 5;
export const NEAR_MISS_COOLDOWN = 0.5;

// Double Score powerup
export const DOUBLE_SCORE_DURATION = 10;
export const DOUBLE_SCORE_MULTIPLIER = 2;

// Slow-Mo powerup
export const SLOW_MO_DURATION = 5;
export const SLOW_MO_FACTOR = 0.5;

// Biome
export const BIOME_TRANSITION_DISTANCE = 500;
export const BIOME_TRANSITION_DURATION = 3; // seconds of color lerp

// Boss battle
export const BOSS_TRIGGER_DISTANCE = 1000;
export const BOSS_WIN_BONUS = 500;

// Worker character
export const WORKER_SKIN_COLOR  = 0xc68642;
export const WORKER_SHIRT_COLOR = 0x4a7fcb;
export const WORKER_PANTS_COLOR = 0x3d5a3e;
export const WORKER_HAT_COLOR   = 0xd4aa70;
