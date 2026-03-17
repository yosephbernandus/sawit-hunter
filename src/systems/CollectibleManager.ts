import * as THREE from 'three';
import { createSawitFruit } from '../rendering/ModelFactory.ts';
import { ObjectPool } from '../utils/ObjectPool.ts';
import { randomInt, randomChoice } from '../utils/MathUtils.ts';
import {
  LANE_POSITIONS,
  SAWIT_SPAWN_INTERVAL,
  SAWIT_Y,
  GOLDEN_SAWIT_CHANCE,
  POWERUP_CHANCE,
} from '../core/Constants.ts';
import { getMaterials } from '../rendering/MaterialLibrary.ts';
import type { PowerUpType } from './PowerUpSystem.ts';

export interface ActiveCollectible {
  mesh: THREE.Group;
  lane: number;
  golden: boolean;
  powerUp: PowerUpType | null;
}

const POWERUP_TYPES: PowerUpType[] = ['shield', 'magnet', 'bigBucket'];

export class CollectibleManager {
  private scene: THREE.Scene;
  private active: ActiveCollectible[] = [];
  private spawnTimer = 0;
  private spawnAheadZ = -60;
  private elapsedTime = 0;

  private pool = new ObjectPool<THREE.Group>(
    () => createSawitFruit(false),
    (m) => { m.visible = true; m.scale.set(1, 1, 1); },
    5,
  );
  private goldenPool = new ObjectPool<THREE.Group>(
    () => createSawitFruit(true),
    (m) => { m.visible = true; m.scale.set(1, 1, 1); },
    2,
  );

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  update(dt: number, speed: number, playerZ: number): void {
    this.spawnTimer -= dt;

    if (this.spawnTimer <= 0) {
      this.spawn(playerZ);
      this.spawnTimer = SAWIT_SPAWN_INTERVAL;
    }

    this.elapsedTime += dt;

    // Move collectibles toward player
    for (const c of this.active) {
      c.mesh.position.z += speed * dt;
      c.mesh.rotation.y += dt * 2;

      // Power-up items bob up and down
      if (c.powerUp) {
        c.mesh.position.y = SAWIT_Y + Math.sin(this.elapsedTime * 4) * 0.3;
      }
    }

    // Remove collectibles that passed behind player
    for (let i = this.active.length - 1; i >= 0; i--) {
      const c = this.active[i]!;
      if (c.mesh.position.z > playerZ + 10) {
        this.release(c);
        this.active.splice(i, 1);
      }
    }
  }

  private spawn(playerZ: number): void {
    const lane = randomInt(0, 2);
    const roll = Math.random();

    let golden = false;
    let powerUp: PowerUpType | null = null;
    let mesh: THREE.Group;

    if (roll < POWERUP_CHANCE) {
      // Spawn power-up (uses golden mesh with different scale as visual indicator)
      powerUp = randomChoice(POWERUP_TYPES);
      mesh = this.goldenPool.acquire();
      mesh.scale.set(1.3, 1.3, 1.3); // slightly bigger to stand out
    } else if (roll < POWERUP_CHANCE + GOLDEN_SAWIT_CHANCE) {
      golden = true;
      mesh = this.goldenPool.acquire();
    } else {
      mesh = this.pool.acquire();
    }

    mesh.position.set(
      LANE_POSITIONS[lane]!,
      SAWIT_Y,
      playerZ + this.spawnAheadZ,
    );
    mesh.userData['gameObject'] = true;

    this.scene.add(mesh);
    this.active.push({ mesh, lane, golden, powerUp });
  }

  private release(c: ActiveCollectible): void {
    this.scene.remove(c.mesh);
    c.mesh.visible = false;
    if (c.golden || c.powerUp) {
      this.goldenPool.release(c.mesh);
    } else {
      this.pool.release(c.mesh);
    }
  }

  removeCollectible(c: ActiveCollectible): void {
    const idx = this.active.indexOf(c);
    if (idx !== -1) {
      this.release(c);
      this.active.splice(idx, 1);
    }
  }

  getActive(): readonly ActiveCollectible[] {
    return this.active;
  }

  dispose(): void {
    for (const c of this.active) {
      this.scene.remove(c.mesh);
    }
    this.active = [];
    this.pool.clear();
    this.goldenPool.clear();
  }
}
