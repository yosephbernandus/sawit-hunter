import * as THREE from 'three';
import { CHUNK_DEPTH, VISIBLE_CHUNKS, TREE_X_OFFSET, TREES_PER_CHUNK_HIGH, TREES_PER_CHUNK_LOW } from '../core/Constants.ts';
import { createPalmTree, createGroundChunk } from '../rendering/ModelFactory.ts';
import { randomRange } from '../utils/MathUtils.ts';
import type { QualityTier } from '../utils/DeviceDetect.ts';

interface Chunk {
  group: THREE.Group;
  trees: THREE.Group[];
  zFront: number; // the front edge (closest to camera)
}

export class WorldGenerator {
  private scene: THREE.Scene;
  private chunks: Chunk[] = [];
  private treesPerChunk: number;
  private nextChunkZ: number;

  constructor(scene: THREE.Scene, quality: QualityTier) {
    this.scene = scene;
    this.treesPerChunk = quality === 'high' ? TREES_PER_CHUNK_HIGH : TREES_PER_CHUNK_LOW;

    // Generate initial chunks extending into negative Z (ahead of player)
    this.nextChunkZ = CHUNK_DEPTH; // start behind player
    for (let i = 0; i < VISIBLE_CHUNKS; i++) {
      this.spawnChunk();
    }
  }

  update(dt: number, speed: number, playerZ: number): void {
    // Move all chunks toward the player (positive Z)
    for (const chunk of this.chunks) {
      chunk.group.position.z += speed * dt;
      chunk.zFront += speed * dt;
    }

    // Recycle chunks that have passed behind the player
    for (const chunk of this.chunks) {
      if (chunk.zFront > playerZ + CHUNK_DEPTH) {
        this.recycleChunk(chunk);
      }
    }
  }

  private spawnChunk(): void {
    this.nextChunkZ -= CHUNK_DEPTH;

    const group = new THREE.Group();
    group.position.z = this.nextChunkZ;

    // Ground
    const ground = createGroundChunk();
    group.add(ground);

    // Trees on both sides
    const trees: THREE.Group[] = [];
    for (let i = 0; i < this.treesPerChunk; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const tree = createPalmTree();
      const zOffset = (i / this.treesPerChunk) * CHUNK_DEPTH - CHUNK_DEPTH / 2;
      tree.position.set(
        side * (TREE_X_OFFSET + randomRange(0, 2)),
        0,
        zOffset + randomRange(-3, 3),
      );
      tree.rotation.y = randomRange(0, Math.PI * 2);
      tree.scale.setScalar(randomRange(0.75, 1.1));
      group.add(tree);
      trees.push(tree);
    }

    this.scene.add(group);
    this.chunks.push({
      group,
      trees,
      zFront: this.nextChunkZ + CHUNK_DEPTH / 2,
    });
  }

  private recycleChunk(chunk: Chunk): void {
    // Find the farthest chunk (most negative zFront)
    let minZ = Infinity;
    for (const c of this.chunks) {
      if (c.zFront < minZ) minZ = c.zFront;
    }

    // Place this chunk ahead of the farthest
    const newZ = minZ - CHUNK_DEPTH;
    const offset = newZ - (chunk.zFront - CHUNK_DEPTH / 2);
    chunk.group.position.z += offset;
    chunk.zFront = newZ + CHUNK_DEPTH / 2;

    // Randomize tree positions slightly
    for (let i = 0; i < chunk.trees.length; i++) {
      const tree = chunk.trees[i]!;
      const side = i % 2 === 0 ? -1 : 1;
      const zOffset = (i / chunk.trees.length) * CHUNK_DEPTH - CHUNK_DEPTH / 2;
      tree.position.set(
        side * (TREE_X_OFFSET + randomRange(0, 2)),
        0,
        zOffset + randomRange(-3, 3),
      );
      tree.rotation.y = randomRange(0, Math.PI * 2);
      tree.scale.setScalar(randomRange(0.75, 1.1));
    }
  }

  dispose(): void {
    for (const chunk of this.chunks) {
      this.scene.remove(chunk.group);
    }
    this.chunks = [];
  }
}
