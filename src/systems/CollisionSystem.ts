import type { PlayerController } from './PlayerController.ts';
import type { CollectibleManager, ActiveCollectible } from './CollectibleManager.ts';
import type { ObstacleManager, ActiveObstacle } from './ObstacleManager.ts';
import type { EventBus } from '../core/EventBus.ts';
import { SAWIT_POINTS, GOLDEN_SAWIT_POINTS } from '../core/Constants.ts';

// Simple lane + Z proximity collision
const COLLECT_Z_RANGE = 1.8;
const OBSTACLE_Z_RANGE = 1.5;

export class CollisionSystem {
  private player: PlayerController;
  private collectibles: CollectibleManager;
  private obstacles: ObstacleManager;
  private eventBus: EventBus;
  private shielded = false;

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

  update(): void {
    const playerZ = this.player.mesh.position.z;
    const playerLane = this.player.lane;

    // Check collectible collisions
    const caught: ActiveCollectible[] = [];
    for (const c of this.collectibles.getActive()) {
      const dz = Math.abs(c.mesh.position.z - playerZ);
      if (c.lane === playerLane && dz < COLLECT_Z_RANGE) {
        caught.push(c);
      }
    }
    for (const c of caught) {
      const points = c.golden ? GOLDEN_SAWIT_POINTS : SAWIT_POINTS;
      this.eventBus.emit('SAWIT_CAUGHT', {
        points,
        position: c.mesh.position.clone(),
      });
      this.collectibles.removeCollectible(c);
    }

    // Check obstacle collisions
    for (const o of this.obstacles.getActive()) {
      const dz = Math.abs(o.mesh.position.z - playerZ);
      if (o.lane === playerLane && dz < OBSTACLE_Z_RANGE) {
        // Branch can be ducked under
        if (o.type === 'branch' && this.player.isDucking) {
          continue;
        }

        if (this.shielded) {
          this.shielded = false;
          this.eventBus.emit('POWERUP_EXPIRED', { type: 'shield' });
          continue;
        }

        this.eventBus.emit('OBSTACLE_HIT', { type: o.type });
        return; // Stop checking after hit
      }
    }
  }
}
