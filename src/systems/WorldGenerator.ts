import * as THREE from 'three';
import { TREE_X_OFFSET, TREES_PER_CHUNK_HIGH, TREES_PER_CHUNK_LOW } from '../core/Constants.ts';
import { createPalmTree } from '../rendering/ModelFactory.ts';
import { getMaterials } from '../rendering/MaterialLibrary.ts';
import type { QualityTier } from '../utils/DeviceDetect.ts';
import { LANE_WIDTH, LANE_COUNT } from '../core/Constants.ts';

const GROUND_LENGTH = 300;
const TREE_SPACING = 10; // one tree pair every N units
const TOTAL_TREE_PAIRS = 30; // pool of tree pairs to cycle

// Simple deterministic hash for consistent tree placement
function seedRandom(seed: number): number {
  let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export class WorldGenerator {
  private scene: THREE.Scene;
  private totalDistance = 0;

  // Two large ground planes that leapfrog
  private groundA: THREE.Group;
  private groundB: THREE.Group;

  // Tree pool
  private trees: THREE.Group[] = [];
  private treePairsCount: number;

  constructor(scene: THREE.Scene, quality: QualityTier) {
    this.scene = scene;
    this.treePairsCount = quality === 'high' ? TOTAL_TREE_PAIRS : Math.floor(TOTAL_TREE_PAIRS * 0.6);

    // Create two large ground planes
    this.groundA = this.createGround();
    this.groundB = this.createGround();
    scene.add(this.groundA);
    scene.add(this.groundB);

    // Create tree pool (2 trees per pair = left + right)
    const treesPerSide = quality === 'high' ? TREES_PER_CHUNK_HIGH : TREES_PER_CHUNK_LOW;
    for (let i = 0; i < this.treePairsCount * 2; i++) {
      const tree = createPalmTree();
      tree.userData['gameObject'] = true;
      scene.add(tree);
      this.trees.push(tree);
    }

    this.layoutAll();
  }

  update(dt: number, speed: number, _playerZ: number): void {
    this.totalDistance += speed * dt;
    this.layoutAll();
  }

  private layoutAll(): void {
    // Ground: two planes leapfrog so one always covers the camera
    const halfLen = GROUND_LENGTH / 2;
    const groundCycle = this.totalDistance % (GROUND_LENGTH * 2);

    // Position ground A and B so they always tile seamlessly
    const baseOffset = Math.floor(this.totalDistance / GROUND_LENGTH) * GROUND_LENGTH;
    this.groundA.position.z = -(baseOffset - this.totalDistance);
    this.groundB.position.z = -(baseOffset + GROUND_LENGTH - this.totalDistance);

    // Trees: place in pairs along the road
    // Calculate which tree slot index the player is near
    const playerSlot = Math.floor(this.totalDistance / TREE_SPACING);

    for (let i = 0; i < this.treePairsCount; i++) {
      const slot = playerSlot - 3 + i; // start a few behind player
      const worldZ = slot * TREE_SPACING;
      const screenZ = -(worldZ - this.totalDistance);

      // Left tree
      const leftTree = this.trees[i * 2]!;
      const sr1 = seedRandom(slot * 2);
      const sr2 = seedRandom(slot * 2 + 0.5);
      const sr3 = seedRandom(slot * 2 + 0.7);
      leftTree.position.set(
        -(TREE_X_OFFSET + sr1 * 2),
        0,
        screenZ + (sr2 - 0.5) * 4,
      );
      leftTree.rotation.y = sr3 * Math.PI * 2;
      leftTree.scale.setScalar(0.75 + sr1 * 0.35);

      // Right tree
      const rightTree = this.trees[i * 2 + 1]!;
      const sr4 = seedRandom(slot * 2 + 1);
      const sr5 = seedRandom(slot * 2 + 1.5);
      const sr6 = seedRandom(slot * 2 + 1.7);
      rightTree.position.set(
        TREE_X_OFFSET + sr4 * 2,
        0,
        screenZ + (sr5 - 0.5) * 4,
      );
      rightTree.rotation.y = sr6 * Math.PI * 2;
      rightTree.scale.setScalar(0.75 + sr4 * 0.35);
    }
  }

  private createGround(): THREE.Group {
    const mats = getMaterials();
    const group = new THREE.Group();
    group.userData['gameObject'] = true;

    const laneWidth = LANE_WIDTH * (LANE_COUNT + 1);

    // Grass
    const grassGeo = new THREE.PlaneGeometry(30, GROUND_LENGTH);
    const grass = new THREE.Mesh(grassGeo, mats.ground);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    group.add(grass);

    // Dirt path
    const pathGeo = new THREE.PlaneGeometry(laneWidth, GROUND_LENGTH);
    const path = new THREE.Mesh(pathGeo, mats.path);
    path.rotation.x = -Math.PI / 2;
    path.position.y = 0.01;
    path.receiveShadow = true;
    group.add(path);

    return group;
  }

  dispose(): void {
    this.scene.remove(this.groundA);
    this.scene.remove(this.groundB);
    for (const tree of this.trees) {
      this.scene.remove(tree);
    }
    this.trees = [];
  }
}
