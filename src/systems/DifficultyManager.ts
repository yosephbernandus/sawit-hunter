import type { EventBus } from '../core/EventBus.ts';
import type { ObstacleManager } from './ObstacleManager.ts';
import type { ObstacleType } from './ObstacleManager.ts';
import {
  BASE_SPEED,
  SPEED_INCREMENT,
  SPEED_INCREMENT_INTERVAL,
  MAX_SPEED,
  OBSTACLE_START_SCORE,
  OBSTACLE_SPAWN_INTERVAL_BASE,
  OBSTACLE_SPAWN_INTERVAL_MIN,
} from '../core/Constants.ts';

// Multi-lane patterns start appearing at this score and ramp to full at this score
const MULTI_LANE_START_SCORE = 300;
const MULTI_LANE_MAX_SCORE = 1000;
const MULTI_LANE_MAX_CHANCE = 0.5; // 50% of spawns are patterns at peak

// Triple patterns (all 3 lanes) ramp in later
const TRIPLE_START_SCORE = 800;
const TRIPLE_MAX_SCORE = 1800;
const TRIPLE_MAX_CHANCE = 0.45; // 45% of multi-lane spawns become triple at peak

export class DifficultyManager {
  private currentSpeed = BASE_SPEED;
  private obstacles: ObstacleManager;
  private currentScore = 0;
  private speedMultiplier = 1;

  constructor(eventBus: EventBus, obstacles: ObstacleManager) {
    this.obstacles = obstacles;

    eventBus.on('SCORE_CHANGED', ({ score }) => {
      this.currentScore = score;
      this.recalculate();
    });
  }

  private recalculate(): void {
    // Speed ramp
    const increments = Math.floor(this.currentScore / SPEED_INCREMENT_INTERVAL);
    this.currentSpeed = Math.min(
      BASE_SPEED + increments * SPEED_INCREMENT,
      MAX_SPEED,
    );

    // Obstacle types
    const types: ObstacleType[] = [];
    if (this.currentScore >= OBSTACLE_START_SCORE) types.push('snake');
    if (this.currentScore >= 200) types.push('log');
    if (this.currentScore >= 350) types.push('branch');
    this.obstacles.setEnabledTypes(types);

    // Obstacle spawn rate
    if (types.length > 0) {
      const progress = Math.min((this.currentScore - OBSTACLE_START_SCORE) / 800, 1);
      const interval = OBSTACLE_SPAWN_INTERVAL_BASE -
        progress * (OBSTACLE_SPAWN_INTERVAL_BASE - OBSTACLE_SPAWN_INTERVAL_MIN);
      this.obstacles.setSpawnInterval(interval);
    }

    // Multi-lane pattern chance ramps up
    if (this.currentScore >= MULTI_LANE_START_SCORE) {
      const progress = Math.min(
        (this.currentScore - MULTI_LANE_START_SCORE) / (MULTI_LANE_MAX_SCORE - MULTI_LANE_START_SCORE),
        1,
      );
      this.obstacles.setMultiLaneChance(progress * MULTI_LANE_MAX_CHANCE);
    } else {
      this.obstacles.setMultiLaneChance(0);
    }

    // Triple pattern chance ramps up later
    if (this.currentScore >= TRIPLE_START_SCORE) {
      const progress = Math.min(
        (this.currentScore - TRIPLE_START_SCORE) / (TRIPLE_MAX_SCORE - TRIPLE_START_SCORE),
        1,
      );
      this.obstacles.setTripleChance(progress * TRIPLE_MAX_CHANCE);
    } else {
      this.obstacles.setTripleChance(0);
    }
  }

  setSpeedMultiplier(m: number): void {
    this.speedMultiplier = m;
  }

  getSpeed(): number {
    return this.currentSpeed * this.speedMultiplier;
  }

  reset(): void {
    this.currentSpeed = BASE_SPEED;
    this.currentScore = 0;
    this.obstacles.setEnabledTypes([]);
    this.obstacles.setSpawnInterval(OBSTACLE_SPAWN_INTERVAL_BASE);
    this.obstacles.setMultiLaneChance(0);
    this.obstacles.setTripleChance(0);
    this.speedMultiplier = 1;
  }
}
