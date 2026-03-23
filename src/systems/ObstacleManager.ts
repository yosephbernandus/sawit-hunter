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

/** A spawn pattern — array of { lane, type } to place at the same Z */
interface SpawnEntry {
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
  private multiLaneChance = 0; // 0–1, set by DifficultyManager
  private tripleChance = 0; // 0–1, chance that a multi-lane pattern uses 3 obstacles
  private spawnPaused = false;

  private snakePool = new ObjectPool<THREE.Group>(
    () => createSnake(),
    (g) => { g.visible = true; },
    6,
  );
  private logPool = new ObjectPool<THREE.Mesh>(
    () => createLog(),
    (m) => { m.visible = true; },
    6,
  );
  private branchPool = new ObjectPool<THREE.Group>(
    () => createBranch(),
    (m) => { m.visible = true; },
    6,
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

  /** Set chance (0–1) of spawning multi-lane patterns */
  setMultiLaneChance(chance: number): void {
    this.multiLaneChance = chance;
  }

  /** Set chance (0–1) that a multi-lane spawn becomes a triple pattern */
  setTripleChance(chance: number): void {
    this.tripleChance = chance;
  }

  setSpawnPaused(paused: boolean): void {
    this.spawnPaused = paused;
  }

  update(dt: number, speed: number, playerZ: number): void {
    // Spawn new obstacles only when not paused and types are configured
    if (!this.spawnPaused && this.enabledTypes.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnPattern(playerZ);
        this.spawnTimer = this.spawnInterval;
      }
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

  private spawnPattern(playerZ: number): void {
    // Decide: single obstacle or multi-lane pattern
    if (Math.random() < this.multiLaneChance && this.enabledTypes.length > 0) {
      const useTriple = Math.random() < this.tripleChance;
      const pattern = useTriple ? this.generateTriplePattern() : this.generatePattern();
      for (const entry of pattern) {
        this.spawnOne(entry.lane, entry.type, playerZ);
      }
    } else {
      // Single obstacle (original behavior)
      const lane = randomInt(0, 2);
      const type = randomChoice(this.enabledTypes);
      this.spawnOne(lane, type, playerZ);
    }
  }

  private generatePattern(): SpawnEntry[] {
    const groundTypes = this.enabledTypes.filter((t) => t === 'snake' || t === 'log');
    const hasBranch = this.enabledTypes.includes('branch');

    // Pick a random pattern type
    const patterns: (() => SpawnEntry[])[] = [];

    // Pattern: 2 ground obstacles in different lanes (must pick empty lane)
    if (groundTypes.length > 0) {
      patterns.push(() => {
        const lanes = [0, 1, 2];
        const l1 = lanes.splice(randomInt(0, lanes.length - 1), 1)[0]!;
        const l2 = lanes[randomInt(0, lanes.length - 1)]!;
        const t = randomChoice(groundTypes);
        return [
          { lane: l1, type: t },
          { lane: l2, type: t },
        ];
      });
    }

    // Pattern: ground + branch in different lanes (jump one, duck the other)
    if (groundTypes.length > 0 && hasBranch) {
      patterns.push(() => {
        const l1 = randomInt(0, 2);
        let l2 = randomInt(0, 2);
        while (l2 === l1) l2 = randomInt(0, 2);
        return [
          { lane: l1, type: randomChoice(groundTypes) },
          { lane: l2, type: 'branch' },
        ];
      });
    }

    // Pattern: 2 branches in different lanes (must find the gap)
    if (hasBranch) {
      patterns.push(() => {
        const lanes = [0, 1, 2];
        const l1 = lanes.splice(randomInt(0, lanes.length - 1), 1)[0]!;
        const l2 = lanes[randomInt(0, lanes.length - 1)]!;
        return [
          { lane: l1, type: 'branch' as ObstacleType },
          { lane: l2, type: 'branch' as ObstacleType },
        ];
      });
    }

    // Pattern: ground in 2 lanes (must jump in the 3rd or pick 3rd lane)
    if (groundTypes.length > 0) {
      patterns.push(() => {
        const safeLane = randomInt(0, 2);
        const t = randomChoice(groundTypes);
        return [0, 1, 2]
          .filter((l) => l !== safeLane)
          .map((l) => ({ lane: l, type: t }));
      });
    }

    if (patterns.length === 0) {
      // Fallback: single obstacle
      return [{ lane: randomInt(0, 2), type: randomChoice(this.enabledTypes) }];
    }

    return randomChoice(patterns)();
  }

  /**
   * Generate a triple pattern (all 3 lanes occupied).
   * Always leaves at least one lane where the player can jump or duck to survive.
   * - Ground obstacles (snake/log) → player can jump over
   * - Branches → player can duck under
   * So mixing ground + branch in all 3 lanes is fair: pick a ground lane and jump, or a branch lane and duck.
   */
  private generateTriplePattern(): SpawnEntry[] {
    const groundTypes = this.enabledTypes.filter((t) => t === 'snake' || t === 'log');
    const hasBranch = this.enabledTypes.includes('branch');

    // Need both ground and branch types for fair triple patterns
    if (groundTypes.length === 0 || !hasBranch) {
      // Fallback to double pattern if we can't make a fair triple
      return this.generatePattern();
    }

    const patterns: (() => SpawnEntry[])[] = [];

    // Pattern: 2 ground + 1 branch (duck under branch lane, or jump in a ground lane)
    patterns.push(() => {
      const branchLane = randomInt(0, 2);
      const gt = randomChoice(groundTypes);
      return [0, 1, 2].map((l) => ({
        lane: l,
        type: l === branchLane ? 'branch' as ObstacleType : gt,
      }));
    });

    // Pattern: 1 ground + 2 branches (jump in ground lane, or duck in a branch lane)
    patterns.push(() => {
      const groundLane = randomInt(0, 2);
      const gt = randomChoice(groundTypes);
      return [0, 1, 2].map((l) => ({
        lane: l,
        type: l === groundLane ? gt : 'branch' as ObstacleType,
      }));
    });

    // Pattern: alternating — ground, branch, ground
    patterns.push(() => {
      const gt = randomChoice(groundTypes);
      const order = Math.random() < 0.5
        ? [gt, 'branch' as ObstacleType, gt]
        : ['branch' as ObstacleType, gt, 'branch' as ObstacleType];
      return [0, 1, 2].map((l) => ({ lane: l, type: order[l]! }));
    });

    return randomChoice(patterns)();
  }

  private spawnOne(lane: number, type: ObstacleType, playerZ: number): void {
    const mesh = this.acquireMesh(type);
    const x = LANE_POSITIONS[lane]!;
    const z = playerZ + this.spawnAheadZ;
    mesh.position.set(x, 0, z);
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
      case 'snake': this.snakePool.release(o.mesh as THREE.Group); break;
      case 'log': this.logPool.release(o.mesh as THREE.Mesh); break;
      case 'branch': this.branchPool.release(o.mesh as THREE.Group); break;
    }
  }

  removeObstacle(o: ActiveObstacle): void {
    const idx = this.active.indexOf(o);
    if (idx !== -1) {
      this.release(o);
      this.active.splice(idx, 1);
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
    this.snakePool.clear();
    this.logPool.clear();
    this.branchPool.clear();
  }
}
