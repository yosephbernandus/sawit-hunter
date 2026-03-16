import * as THREE from 'three';
import { createSawitFruit } from '../rendering/ModelFactory.ts';
import { ObjectPool } from '../utils/ObjectPool.ts';
import { randomInt } from '../utils/MathUtils.ts';
import {
  LANE_POSITIONS,
  SAWIT_SPAWN_INTERVAL,
  SAWIT_Y,
  GOLDEN_SAWIT_CHANCE,
} from '../core/Constants.ts';

export interface ActiveCollectible {
  mesh: THREE.Group;
  lane: number;
  golden: boolean;
}

export class CollectibleManager {
  private scene: THREE.Scene;
  private active: ActiveCollectible[] = [];
  private spawnTimer = 0;
  private spawnAheadZ = -60; // how far ahead to spawn

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

    // Move collectibles toward player
    for (const c of this.active) {
      c.mesh.position.z += speed * dt;
      // Gentle rotation
      c.mesh.rotation.y += dt * 2;
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
    const golden = Math.random() < GOLDEN_SAWIT_CHANCE;
    const mesh = golden ? this.goldenPool.acquire() : this.pool.acquire();

    mesh.position.set(
      LANE_POSITIONS[lane]!,
      SAWIT_Y,
      playerZ + this.spawnAheadZ,
    );
    mesh.userData['gameObject'] = true;

    this.scene.add(mesh);
    this.active.push({ mesh, lane, golden });
  }

  private release(c: ActiveCollectible): void {
    this.scene.remove(c.mesh);
    c.mesh.visible = false;
    if (c.golden) {
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
  }
}
