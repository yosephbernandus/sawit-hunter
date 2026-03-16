import type { PlayerController } from './PlayerController.ts';
import type { CollectibleManager, ActiveCollectible } from './CollectibleManager.ts';
import type { ObstacleManager } from './ObstacleManager.ts';
import type { EventBus } from '../core/EventBus.ts';
import { SAWIT_POINTS, GOLDEN_SAWIT_POINTS } from '../core/Constants.ts';

const COLLECT_Z_RANGE = 1.8;
const COLLECT_X_RANGE = 1.5;
const OBSTACLE_Z_RANGE = 1.5;

export class CollisionSystem {
  private player: PlayerController;
  private collectibles: CollectibleManager;
  private obstacles: ObstacleManager;
  private eventBus: EventBus;
  private shielded = false;
  private collectXMultiplier = 1; // for big bucket

  constructor(
    player: PlayerController,
    collectibles: CollectibleManager,
    obstacles: ObstacleManager,
    eventBus: EventBus,
  ) {
    this.player = player;
    this.collectibles = collectibles;
    this.obstacles = obstacles;
    this.eventBus = eventBus;
  }

  setShielded(val: boolean): void {
    this.shielded = val;
  }

  setCollectXMultiplier(val: number): void {
    this.collectXMultiplier = val;
  }

  update(): void {
    const playerX = this.player.mesh.position.x;
    const playerZ = this.player.mesh.position.z;
    const playerLane = this.player.lane;
    const xRange = COLLECT_X_RANGE * this.collectXMultiplier;

    // Collectible collisions
    const caught: ActiveCollectible[] = [];
    for (const c of this.collectibles.getActive()) {
      const dz = Math.abs(c.mesh.position.z - playerZ);
      const dx = Math.abs(c.mesh.position.x - playerX);

      if (dz < COLLECT_Z_RANGE && dx < xRange) {
        caught.push(c);
      }
    }
    for (const c of caught) {
      if (c.powerUp) {
        this.eventBus.emit('POWERUP_COLLECTED', { type: c.powerUp });
      } else {
        const points = c.golden ? GOLDEN_SAWIT_POINTS : SAWIT_POINTS;
        this.eventBus.emit('SAWIT_CAUGHT', {
          points,
          position: c.mesh.position.clone(),
        });
      }
      this.collectibles.removeCollectible(c);
    }

    // Obstacle collisions
    for (const o of this.obstacles.getActive()) {
      const dz = Math.abs(o.mesh.position.z - playerZ);
      if (o.lane === playerLane && dz < OBSTACLE_Z_RANGE) {
        if (o.type === 'branch' && this.player.isDucking) {
          continue;
        }

        if (this.shielded) {
          this.shielded = false;
          // Remove the obstacle so it doesn't hit again next frame
          this.obstacles.removeObstacle(o);
          this.eventBus.emit('POWERUP_EXPIRED', { type: 'shield' });
          return; // exit since we modified the array
        }

        this.eventBus.emit('OBSTACLE_HIT', { type: o.type });
        return;
      }
    }
  }
}
