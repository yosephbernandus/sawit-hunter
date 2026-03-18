import * as THREE from 'three';
import { TREE_X_OFFSET, TREES_PER_CHUNK_HIGH, TREES_PER_CHUNK_LOW } from '../core/Constants.ts';
import { createPalmTree } from '../rendering/ModelFactory.ts';
import { getMaterials } from '../rendering/MaterialLibrary.ts';
import type { QualityTier } from '../utils/DeviceDetect.ts';
import { LANE_WIDTH, LANE_COUNT } from '../core/Constants.ts';

const GROUND_LENGTH = 300;
const TREE_SPACING = 10;
const TOTAL_TREE_PAIRS = 30;

// Max tree replacements per frame to avoid lag spikes
const MAX_REPLACEMENTS_PER_FRAME = 4;

function seedRandom(seed: number): number {
  let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export class WorldGenerator {
  private scene: THREE.Scene;
  private totalDistance = 0;

  private groundA: THREE.Group;
  private groundB: THREE.Group;

  private trees: THREE.Group[] = [];
  private treePairsCount: number;
  private lastPlayerSlot = -999;

  private treeFactory: () => THREE.Group = createPalmTree;

  // Queue of tree indices that need replacement (spread across frames)
  private replaceQueue: number[] = [];

  constructor(scene: THREE.Scene, quality: QualityTier) {
    this.scene = scene;
    this.treePairsCount = quality === 'high' ? TOTAL_TREE_PAIRS : Math.floor(TOTAL_TREE_PAIRS * 0.6);

    this.groundA = this.createGround();
    this.groundB = this.createGround();
    scene.add(this.groundA);
    scene.add(this.groundB);

    for (let i = 0; i < this.treePairsCount * 2; i++) {
      const tree = this.treeFactory();
      tree.userData['gameObject'] = true;
      tree.userData['factory'] = this.treeFactory;
      scene.add(tree);
      this.trees.push(tree);
    }

    this.layoutTrees(0);
  }

  setTreeFactory(factory: () => THREE.Group): void {
    if (this.treeFactory === factory) return;
    this.treeFactory = factory;

    // Queue all trees for gradual replacement instead of replacing all at once
    this.replaceQueue = [];
    for (let i = 0; i < this.trees.length; i++) {
      if (this.trees[i]!.userData['factory'] !== factory) {
        this.replaceQueue.push(i);
      }
    }
  }

  update(dt: number, speed: number, _playerZ: number): void {
    this.totalDistance += speed * dt;

    // Ground: two planes leapfrog
    const baseOffset = Math.floor(this.totalDistance / GROUND_LENGTH) * GROUND_LENGTH;
    this.groundA.position.z = -(baseOffset - this.totalDistance);
    this.groundB.position.z = -(baseOffset + GROUND_LENGTH - this.totalDistance);

    // Process queued tree replacements (spread across frames)
    if (this.replaceQueue.length > 0) {
      const count = Math.min(MAX_REPLACEMENTS_PER_FRAME, this.replaceQueue.length);
      for (let i = 0; i < count; i++) {
        const idx = this.replaceQueue.shift()!;
        this.replaceTree(idx);
      }
    }

    // Trees: only recalculate when player crosses into a new slot
    const playerSlot = Math.floor(this.totalDistance / TREE_SPACING);
    if (playerSlot !== this.lastPlayerSlot) {
      this.lastPlayerSlot = playerSlot;
      this.layoutTrees(playerSlot);
    }

    // Slide all trees by current offset (cheap — just Z update)
    for (let i = 0; i < this.treePairsCount; i++) {
      const slot = playerSlot - 3 + i;
      const worldZ = slot * TREE_SPACING;
      const screenZ = -(worldZ - this.totalDistance);

      const leftTree = this.trees[i * 2]!;
      const rightTree = this.trees[i * 2 + 1]!;
      leftTree.position.z = screenZ + leftTree.userData['zOff'] as number;
      rightTree.position.z = screenZ + rightTree.userData['zOff'] as number;
    }
  }

  private layoutTrees(playerSlot: number): void {
    for (let i = 0; i < this.treePairsCount; i++) {
      const slot = playerSlot - 3 + i;

      // Left tree
      const leftTree = this.trees[i * 2]!;
      const sr1 = seedRandom(slot * 2);
      const sr2 = seedRandom(slot * 2 + 0.5);
      const sr3 = seedRandom(slot * 2 + 0.7);
      leftTree.position.x = -(TREE_X_OFFSET + sr1 * 2);
      leftTree.position.y = 0;
      leftTree.userData['zOff'] = (sr2 - 0.5) * 4;
      leftTree.rotation.y = sr3 * Math.PI * 2;
      leftTree.scale.setScalar(0.75 + sr1 * 0.35);

      // Right tree
      const rightTree = this.trees[i * 2 + 1]!;
      const sr4 = seedRandom(slot * 2 + 1);
      const sr5 = seedRandom(slot * 2 + 1.5);
      const sr6 = seedRandom(slot * 2 + 1.7);
      rightTree.position.x = TREE_X_OFFSET + sr4 * 2;
      rightTree.position.y = 0;
      rightTree.userData['zOff'] = (sr5 - 0.5) * 4;
      rightTree.rotation.y = sr6 * Math.PI * 2;
      rightTree.scale.setScalar(0.75 + sr4 * 0.35);
    }
  }

  private replaceTree(index: number): void {
    const old = this.trees[index]!;
    if (old.userData['factory'] === this.treeFactory) return;

    // Copy position/rotation/scale from old tree so it's seamless
    const pos = old.position.clone();
    const rot = old.rotation.clone();
    const scl = old.scale.clone();
    const zOff = old.userData['zOff'];

    this.scene.remove(old);
    const newTree = this.treeFactory();
    newTree.userData['gameObject'] = true;
    newTree.userData['factory'] = this.treeFactory;
    newTree.userData['zOff'] = zOff;
    newTree.position.copy(pos);
    newTree.rotation.copy(rot);
    newTree.scale.copy(scl);
    this.scene.add(newTree);
    this.trees[index] = newTree;
  }

  private createGround(): THREE.Group {
    const mats = getMaterials();
    const group = new THREE.Group();
    group.userData['gameObject'] = true;

    const laneWidth = LANE_WIDTH * (LANE_COUNT + 1);

    const grassGeo = new THREE.PlaneGeometry(30, GROUND_LENGTH);
    const grass = new THREE.Mesh(grassGeo, mats.ground);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    group.add(grass);

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
    this.replaceQueue = [];
  }
}
