import * as THREE from 'three';
import { createGoblin } from '../rendering/ModelFactory.ts';
import type { GoblinRefs } from '../rendering/ModelFactory.ts';
import { ObjectPool } from '../utils/ObjectPool.ts';
import type { EventBus } from '../core/EventBus.ts';
import {
  GOBLIN_START_SCORE,
  GOBLIN_SPAWN_MIN,
  GOBLIN_SPAWN_MAX,
  GOBLIN_CROSS_SPEED_MIN,
  GOBLIN_CROSS_SPEED_MAX,
  LANE_POSITIONS,
} from '../core/Constants.ts';

interface ActiveGoblin {
  group: THREE.Group;
  refs: GoblinRefs;
  dirX: number; // +1 = crossing right, -1 = crossing left
  speedX: number;
  animTime: number;
  hit: boolean;
  // Pause state — goblin stops in a lane for a moment
  pauseLane: number; // which lane X to pause at (-1 = no pause)
  paused: boolean;
  pauseTimer: number;
  // Z wobble
  wobblePhase: number;
  wobbleAmp: number;
  baseZ: number; // Z at spawn (before wobble)
}

const GOBLIN_Y = 0;
const GOBLIN_SPAWN_Z_AHEAD = -18; // closer to player for less reaction time
const GOBLIN_X_START = 6;
const GOBLIN_X_END = 6;
const COLLISION_X_RANGE = 1.0;
const COLLISION_Z_RANGE = 1.2;
const MAX_POOL = 3;

// Pause config
const PAUSE_CHANCE = 0.6; // 60% of goblins will pause
const PAUSE_DURATION_MIN = 0.5;
const PAUSE_DURATION_MAX = 1.2;

// Z wobble config
const WOBBLE_SPEED = 3;
const WOBBLE_AMP_MAX = 0.8;

export class GoblinManager {
  private scene: THREE.Scene;
  private eventBus: EventBus;
  private active: ActiveGoblin[] = [];
  private spawnTimer = 0;
  private currentScore = 0;

  private pool: ObjectPool<{ group: THREE.Group; refs: GoblinRefs }>;

  constructor(scene: THREE.Scene, eventBus: EventBus) {
    this.scene = scene;
    this.eventBus = eventBus;

    this.pool = new ObjectPool(
      () => createGoblin(),
      (obj) => { obj.group.visible = true; },
      2,
    );

    this.eventBus.on('SCORE_CHANGED', ({ score }) => {
      this.currentScore = score;
    });

    this.resetSpawnTimer();
  }

  private resetSpawnTimer(): void {
    // Spawn faster at higher scores (min interval shrinks)
    const scoreProgress = Math.min((this.currentScore - GOBLIN_START_SCORE) / 800, 1);
    const min = GOBLIN_SPAWN_MIN - scoreProgress * 3; // 7s → 4s
    const max = GOBLIN_SPAWN_MAX - scoreProgress * 5; // 14s → 9s
    this.spawnTimer = min + Math.random() * (max - min);
  }

  update(dt: number, speed: number, playerZ: number, playerX = 0): void {
    if (this.currentScore < GOBLIN_START_SCORE) return;

    // Spawn timer
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.active.length < MAX_POOL) {
      this.spawn(playerZ, speed);
      this.resetSpawnTimer();
    }

    // Update active goblins
    for (let i = this.active.length - 1; i >= 0; i--) {
      const g = this.active[i]!;

      // World movement (always moves with world)
      g.group.position.z += speed * dt;

      // Z wobble — slight forward/back drift
      g.animTime += dt;
      g.group.position.z += Math.sin(g.animTime * WOBBLE_SPEED + g.wobblePhase) * g.wobbleAmp * dt;

      if (g.paused) {
        // Paused in a lane — play idle animation (slower fidget)
        const fidget = Math.sin(g.animTime * 6) * 0.2;
        g.refs.leftArm.rotation.x = fidget;
        g.refs.rightArm.rotation.x = -fidget;
        g.refs.leftLeg.rotation.x = 0;
        g.refs.rightLeg.rotation.x = 0;

        g.pauseTimer -= dt;
        if (g.pauseTimer <= 0) {
          g.paused = false;
        }
      } else {
        // Move horizontally
        g.group.position.x += g.dirX * g.speedX * dt;

        // Check if should pause at designated lane
        if (g.pauseLane >= 0) {
          const targetX = LANE_POSITIONS[g.pauseLane]!;
          const reachedLane = g.dirX > 0
            ? g.group.position.x >= targetX && g.group.position.x - g.dirX * g.speedX * dt < targetX
            : g.group.position.x <= targetX && g.group.position.x - g.dirX * g.speedX * dt > targetX;

          if (reachedLane) {
            g.group.position.x = targetX; // snap to lane
            g.paused = true;
            g.pauseTimer = PAUSE_DURATION_MIN + Math.random() * (PAUSE_DURATION_MAX - PAUSE_DURATION_MIN);
            g.pauseLane = -1; // only pause once
          }
        }

        // Run animation
        const swing = Math.sin(g.animTime * 12) * 0.7;
        g.refs.leftLeg.rotation.x = swing;
        g.refs.rightLeg.rotation.x = -swing;
        g.refs.leftArm.rotation.x = -swing;
        g.refs.rightArm.rotation.x = swing;

        // Face movement direction
        g.group.rotation.y = g.dirX > 0 ? -Math.PI / 2 : Math.PI / 2;
      }

      // Head looks toward player (counter-rotate relative to body)
      const dx = playerX - g.group.position.x;
      const dz = playerZ - g.group.position.z;
      const angleToPlayer = Math.atan2(dx, dz);
      // Head Y rotation is relative to body, so subtract body rotation
      g.refs.headGroup.rotation.y = angleToPlayer - g.group.rotation.y;

      // Remove if crossed off-screen or too far behind player
      const pastEnd = g.dirX > 0
        ? g.group.position.x > GOBLIN_X_END
        : g.group.position.x < -GOBLIN_X_END;
      const behindPlayer = g.group.position.z > playerZ + 15;

      if (pastEnd || behindPlayer) {
        this.release(g);
        this.active.splice(i, 1);
      }
    }
  }

  private spawn(playerZ: number, speed: number): void {
    const { group, refs } = this.pool.acquire();

    // Random direction
    const goRight = Math.random() < 0.5;
    const dirX = goRight ? 1 : -1;
    const startX = goRight ? -GOBLIN_X_START : GOBLIN_X_START;

    // Spawn ahead of player
    const zOffset = GOBLIN_SPAWN_Z_AHEAD - Math.random() * 8;

    group.position.set(startX, GOBLIN_Y, playerZ + zOffset);
    group.rotation.y = 0;
    group.userData['gameObject'] = true;
    this.scene.add(group);

    // Speed: random within range, slight boost at higher game speed
    const baseSpeed = GOBLIN_CROSS_SPEED_MIN + Math.random() * (GOBLIN_CROSS_SPEED_MAX - GOBLIN_CROSS_SPEED_MIN);
    const speedX = baseSpeed + (speed - 10) * 0.08;

    // Pick a random lane to pause at (if this goblin pauses)
    let pauseLane = -1;
    if (Math.random() < PAUSE_CHANCE) {
      // Pick a lane that's in the goblin's crossing path
      // For left-to-right (dirX=1): any lane works since it starts from -6
      // Pick lane 0, 1, or 2 randomly
      pauseLane = Math.floor(Math.random() * 3);
    }

    // Z wobble — random phase and amplitude
    const wobblePhase = Math.random() * Math.PI * 2;
    const wobbleAmp = Math.random() * WOBBLE_AMP_MAX;

    this.active.push({
      group, refs, dirX, speedX,
      animTime: 0, hit: false,
      pauseLane, paused: false, pauseTimer: 0,
      wobblePhase, wobbleAmp,
      baseZ: playerZ + zOffset,
    });
  }

  checkCollision(playerX: number, playerZ: number, playerJumpHeight: number): boolean {
    for (const g of this.active) {
      if (g.hit) continue;

      const dx = Math.abs(g.group.position.x - playerX);
      const dz = Math.abs(g.group.position.z - playerZ);

      if (dx < COLLISION_X_RANGE && dz < COLLISION_Z_RANGE) {
        if (playerJumpHeight > 0.6) continue;
        g.hit = true;
        return true;
      }
    }
    return false;
  }

  getActive(): readonly ActiveGoblin[] {
    return this.active;
  }

  private release(g: ActiveGoblin): void {
    this.scene.remove(g.group);
    g.group.visible = false;
    this.pool.release({ group: g.group, refs: g.refs });
  }

  dispose(): void {
    for (const g of this.active) {
      this.scene.remove(g.group);
    }
    this.active = [];
    this.pool.clear();
  }
}
