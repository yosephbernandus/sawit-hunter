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

export class DifficultyManager {
  private currentSpeed = BASE_SPEED;
  private obstacles: ObstacleManager;
  private currentScore = 0;

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
    if (this.currentScore >= 300) types.push('log');
    if (this.currentScore >= 500) types.push('branch');
    this.obstacles.setEnabledTypes(types);

    // Obstacle spawn rate
    if (types.length > 0) {
      const progress = Math.min((this.currentScore - OBSTACLE_START_SCORE) / 800, 1);
      const interval = OBSTACLE_SPAWN_INTERVAL_BASE -
        progress * (OBSTACLE_SPAWN_INTERVAL_BASE - OBSTACLE_SPAWN_INTERVAL_MIN);
      this.obstacles.setSpawnInterval(interval);
    }
  }

  getSpeed(): number {
    return this.currentSpeed;
  }

  reset(): void {
    this.currentSpeed = BASE_SPEED;
    this.currentScore = 0;
    this.obstacles.setEnabledTypes([]);
    this.obstacles.setSpawnInterval(OBSTACLE_SPAWN_INTERVAL_BASE);
  }
}
