import * as THREE from 'three';
import type { PlayerController } from './PlayerController.ts';
import type { CollectibleManager, ActiveCollectible } from './CollectibleManager.ts';
import type { ObstacleManager } from './ObstacleManager.ts';
import type { EventBus } from '../core/EventBus.ts';
import {
  SAWIT_POINTS,
  GOLDEN_SAWIT_POINTS,
  NEAR_MISS_Z_RANGE,
  NEAR_MISS_POINTS,
  NEAR_MISS_COOLDOWN,
} from '../core/Constants.ts';

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
  private nearMissCooldown = 0;
  private skipObstacles = false;
  private _tmpPos = new THREE.Vector3(); // reusable vector to avoid GC

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

  isShielded(): boolean {
    return this.shielded;
  }

  setCollectXMultiplier(val: number): void {
    this.collectXMultiplier = val;
  }

  setSkipObstacles(val: boolean): void {
    this.skipObstacles = val;
  }

  update(dt: number): void {
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
        this._tmpPos.copy(c.mesh.position);
        this.eventBus.emit('SAWIT_CAUGHT', {
          points,
          position: this._tmpPos,
        });
      }
      this.collectibles.removeCollectible(c);
    }

    // Near-miss cooldown
    if (this.nearMissCooldown > 0) {
      this.nearMissCooldown -= dt;
    }

    // Obstacle collisions + near-miss detection (skipped during boss fight)
    if (this.skipObstacles) return;
    for (const o of this.obstacles.getActive()) {
      const dz = Math.abs(o.mesh.position.z - playerZ);

      if (o.lane === playerLane && dz < OBSTACLE_Z_RANGE) {
        // Jumping clears ground obstacles (snake, log)
        if ((o.type === 'snake' || o.type === 'log') && this.player.jumpHeight > 0.6) {
          continue;
        }
        // Ducking clears high obstacles (branch)
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

      // Near-miss: same lane, wider Z range, player is actively dodging
      if (o.lane === playerLane && dz < NEAR_MISS_Z_RANGE && dz >= OBSTACLE_Z_RANGE) {
        if (this.nearMissCooldown <= 0) {
          const isDodging =
            ((o.type === 'snake' || o.type === 'log') && this.player.jumpHeight > 0.6) ||
            (o.type === 'branch' && this.player.isDucking);

          if (isDodging) {
            this.nearMissCooldown = NEAR_MISS_COOLDOWN;
            this.eventBus.emit('NEAR_MISS', { points: NEAR_MISS_POINTS });
          }
        }
      }
    }
  }
}
