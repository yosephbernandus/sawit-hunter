import * as THREE from 'three';
import type { EventBus } from '../core/EventBus.ts';
import { LANE_POSITIONS, BOSS_WIN_BONUS } from '../core/Constants.ts';
import { ObjectPool } from '../utils/ObjectPool.ts';
import { createWowo, createMBG } from '../rendering/ModelFactory.ts';
import type { WowoRefs } from '../rendering/ModelFactory.ts';

const BOSS_DURATION = 30;
const MBG_SPAWN_INTERVAL_START = 1.2;
const MBG_SPAWN_INTERVAL_END = 0.4;
const MBG_SPEED = 25; // MBGs fly toward player (positive Z direction)
const MBG_COLLISION_X = 1.0;
const MBG_COLLISION_Z = 1.2;
const MAX_MBGS = 20;

// Wowo movement — strafes across lanes ahead of player
const WOWO_Z_AHEAD = -30; // distance ahead of player
const WOWO_STRAFE_SPEED = 3; // how fast Wowo moves side to side
const WOWO_STRAFE_RANGE = 4; // max X offset

interface ActiveMBG {
  group: THREE.Group;
  lane: number;
}

export class BossBattle {
  private scene: THREE.Scene;
  private eventBus: EventBus;
  private active = false;
  private timer = 0;
  private spawnTimer = 0;
  private animTime = 0;
  private mbgs: ActiveMBG[] = [];

  // Wowo state
  private wowoGroup: THREE.Group | null = null;
  private wowoRefs: WowoRefs | null = null;
  private wowoTargetLane = 1; // current lane Wowo is moving toward
  private wowoStrafeDir = 1; // +1 right, -1 left

  // HUD elements
  private timerEl: HTMLElement;
  private bossHud: HTMLElement;

  private pool = new ObjectPool<THREE.Group>(
    () => createMBG(),
    (g) => { g.visible = true; },
    8,
  );

  constructor(scene: THREE.Scene, eventBus: EventBus) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.timerEl = document.getElementById('bossTimer')!;
    this.bossHud = document.getElementById('bossHud')!;
  }

  start(playerZ: number): void {
    this.active = true;
    this.timer = BOSS_DURATION;
    this.spawnTimer = 0.8;
    this.animTime = 0;
    this.wowoTargetLane = 1;
    this.wowoStrafeDir = 1;
    this.bossHud.classList.remove('hidden');
    this.updateTimerDisplay();

    // Spawn Wowo ahead of player, facing the player
    if (!this.wowoGroup) {
      const { group, refs } = createWowo();
      this.wowoGroup = group;
      this.wowoRefs = refs;
    }
    this.wowoGroup.position.set(0, 0, playerZ + WOWO_Z_AHEAD);
    this.wowoGroup.rotation.y = Math.PI; // face the player (toward +Z)
    this.wowoGroup.visible = true;
    this.wowoGroup.userData['gameObject'] = true;
    this.scene.add(this.wowoGroup);
  }

  isActive(): boolean {
    return this.active;
  }

  update(dt: number, speed: number, playerX: number, playerZ: number, playerJumpHeight: number): boolean {
    if (!this.active) return false;

    this.timer -= dt;
    this.animTime += dt;
    this.updateTimerDisplay();

    // --- Wowo movement: strafe side to side, stay ahead ---
    if (this.wowoGroup) {
      // Keep Wowo at fixed distance ahead of player
      this.wowoGroup.position.z = playerZ + WOWO_Z_AHEAD;

      // Strafe across lanes
      const targetX = LANE_POSITIONS[this.wowoTargetLane]!;
      const dx = targetX - this.wowoGroup.position.x;

      if (Math.abs(dx) < 0.2) {
        // Reached target lane — pick new one
        this.wowoTargetLane += this.wowoStrafeDir;
        if (this.wowoTargetLane > 2) {
          this.wowoTargetLane = 1;
          this.wowoStrafeDir = -1;
        } else if (this.wowoTargetLane < 0) {
          this.wowoTargetLane = 1;
          this.wowoStrafeDir = 1;
        }
      } else {
        this.wowoGroup.position.x += Math.sign(dx) * WOWO_STRAFE_SPEED * dt;
      }

      // Throwing animation
      if (this.wowoRefs) {
        const throwAnim = Math.sin(this.animTime * 5) * 0.8;
        this.wowoRefs.rightArm.rotation.x = throwAnim;
        this.wowoRefs.leftArm.rotation.x = -throwAnim * 0.3;
      }
    }

    // Player survived!
    if (this.timer <= 0) {
      this.win();
      return false;
    }

    // Spawn MBGs from Wowo's position
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.mbgs.length < MAX_MBGS) {
      this.spawnMBG(playerZ);
      const progress = 1 - (this.timer / BOSS_DURATION);
      this.spawnTimer = MBG_SPAWN_INTERVAL_START +
        (MBG_SPAWN_INTERVAL_END - MBG_SPAWN_INTERVAL_START) * progress;
    }

    // Move MBGs toward player (+Z) and lerp X from Wowo to target lane
    for (let i = this.mbgs.length - 1; i >= 0; i--) {
      const mbg = this.mbgs[i]!;
      mbg.group.position.z += MBG_SPEED * dt;

      // Lerp X from start (Wowo) to target lane based on Z travel progress
      const startZ = mbg.group.userData['startZ'] as number;
      const startX = mbg.group.userData['startX'] as number;
      const targetX = mbg.group.userData['targetX'] as number;
      const totalDist = playerZ - startZ; // total Z distance to cover
      const traveled = mbg.group.position.z - startZ;
      const t = Math.min(traveled / totalDist, 1); // 0→1 as it reaches player
      mbg.group.position.x = startX + (targetX - startX) * t;

      // Tumble the food container
      mbg.group.rotation.x += dt * 4;
      mbg.group.rotation.z += dt * 2;

      // Collision check
      const cdx = Math.abs(mbg.group.position.x - playerX);
      const cdz = Math.abs(mbg.group.position.z - playerZ);
      if (cdx < MBG_COLLISION_X && cdz < MBG_COLLISION_Z) {
        if (playerJumpHeight > 0.6) {
          this.releaseMBG(mbg);
          this.mbgs.splice(i, 1);
          continue;
        }
        // Remove the MBG that hit, but don't cleanup the whole boss fight yet.
        // GameScene decides if the hit is fatal (invincibility/extra life/shield).
        this.releaseMBG(mbg);
        this.mbgs.splice(i, 1);
        return true;
      }

      // Remove if past player
      if (mbg.group.position.z > playerZ + 15) {
        this.releaseMBG(mbg);
        this.mbgs.splice(i, 1);
      }
    }

    return false;
  }

  private spawnMBG(playerZ: number): void {
    const progress = 1 - (this.timer / BOSS_DURATION);
    const doDouble = Math.random() < 0.3 + progress * 0.3;

    // MBGs spawn from Wowo's current position, aimed at random lanes
    const wowoX = this.wowoGroup ? this.wowoGroup.position.x : 0;
    const wowoZ = this.wowoGroup ? this.wowoGroup.position.z : playerZ + WOWO_Z_AHEAD;

    const lanes = [0, 1, 2];
    const count = doDouble ? 2 : 1;

    for (let n = 0; n < count; n++) {
      const idx = Math.floor(Math.random() * lanes.length);
      const lane = lanes.splice(idx, 1)[0]!;

      const group = this.pool.acquire();
      // Start at Wowo's position, target the chosen lane
      group.position.set(wowoX, 0.8, wowoZ);
      group.rotation.set(0, 0, 0);
      group.userData['gameObject'] = true;
      group.userData['targetX'] = LANE_POSITIONS[lane]!;
      group.userData['startX'] = wowoX;
      group.userData['startZ'] = wowoZ;
      this.scene.add(group);
      this.mbgs.push({ group, lane });
    }
  }

  private win(): void {
    this.cleanup();
    this.eventBus.emit('BOSS_DODGE_SURVIVED', {});
  }

  private cleanup(): void {
    this.active = false;
    this.bossHud.classList.add('hidden');
    for (const mbg of this.mbgs) {
      this.releaseMBG(mbg);
    }
    this.mbgs = [];
    if (this.wowoGroup) {
      this.scene.remove(this.wowoGroup);
      this.wowoGroup.visible = false;
    }
  }

  private releaseMBG(mbg: ActiveMBG): void {
    this.scene.remove(mbg.group);
    mbg.group.visible = false;
    this.pool.release(mbg.group);
  }

  private updateTimerDisplay(): void {
    const secs = Math.max(0, Math.ceil(this.timer));
    this.timerEl.textContent = `${secs}s`;

    if (secs <= 5) {
      this.timerEl.style.color = '#e74c3c';
    } else if (secs <= 10) {
      this.timerEl.style.color = '#f39c12';
    } else {
      this.timerEl.style.color = '';
    }
  }

  dispose(): void {
    this.cleanup();
    this.pool.clear();
  }
}
