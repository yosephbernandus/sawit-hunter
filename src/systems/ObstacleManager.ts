import * as THREE from 'three';
import { createSnake, createLog, createBranch } from '../rendering/ModelFactory.ts';
import { ObjectPool } from '../utils/ObjectPool.ts';
import { randomInt, randomChoice } from '../utils/MathUtils.ts';
import { LANE_POSITIONS, OBSTACLE_SPAWN_INTERVAL_BASE } from '../core/Constants.ts';

export type ObstacleType = 'snake' | 'log' | 'branch';

export interface ActiveObstacle {
  mesh: THREE.Object3D;
  lane: number;
  type: ObstacleType;
}

export class ObstacleManager {
  private scene: THREE.Scene;
  private active: ActiveObstacle[] = [];
  private spawnTimer = 0;
  private spawnInterval = OBSTACLE_SPAWN_INTERVAL_BASE;
  private spawnAheadZ = -70;
  private enabledTypes: ObstacleType[] = [];

  private snakePool = new ObjectPool<THREE.Mesh>(
    () => createSnake(),
    (m) => { m.visible = true; },
    3,
  );
  private logPool = new ObjectPool<THREE.Mesh>(
    () => createLog(),
    (m) => { m.visible = true; },
    3,
  );
  private branchPool = new ObjectPool<THREE.Group>(
    () => createBranch(),
    (m) => { m.visible = true; },
    2,
  );

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setEnabledTypes(types: ObstacleType[]): void {
    this.enabledTypes = types;
  }

  setSpawnInterval(interval: number): void {
    this.spawnInterval = interval;
  }

  update(dt: number, speed: number, playerZ: number): void {
    if (this.enabledTypes.length === 0) return;

    this.spawnTimer -= dt;

    if (this.spawnTimer <= 0) {
      this.spawn(playerZ);
      this.spawnTimer = this.spawnInterval;
    }

    // Move obstacles toward player
    for (const o of this.active) {
      o.mesh.position.z += speed * dt;
    }

    // Remove obstacles that passed behind player
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i]!;
      if (o.mesh.position.z > playerZ + 15) {
        this.release(o);
        this.active.splice(i, 1);
      }
    }
  }

  private spawn(playerZ: number): void {
    const lane = randomInt(0, 2);
    const type = randomChoice(this.enabledTypes);
    const mesh = this.acquireMesh(type);

    const x = LANE_POSITIONS[lane]!;
    const z = playerZ + this.spawnAheadZ;

    if (type === 'branch') {
      mesh.position.set(x, 0, z);
    } else {
      mesh.position.set(x, 0, z);
    }

    mesh.userData['gameObject'] = true;
    this.scene.add(mesh);
    this.active.push({ mesh, lane, type });
  }

  private acquireMesh(type: ObstacleType): THREE.Object3D {
    switch (type) {
      case 'snake': return this.snakePool.acquire();
      case 'log': return this.logPool.acquire();
      case 'branch': return this.branchPool.acquire();
    }
  }

  private release(o: ActiveObstacle): void {
    this.scene.remove(o.mesh);
    o.mesh.visible = false;
    switch (o.type) {
      case 'snake': this.snakePool.release(o.mesh as THREE.Mesh); break;
      case 'log': this.logPool.release(o.mesh as THREE.Mesh); break;
      case 'branch': this.branchPool.release(o.mesh as THREE.Group); break;
    }
  }

  getActive(): readonly ActiveObstacle[] {
    return this.active;
  }

  dispose(): void {
    for (const o of this.active) {
      this.scene.remove(o.mesh);
    }
    this.active = [];
  }
}
