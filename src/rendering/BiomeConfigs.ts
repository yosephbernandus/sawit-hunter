import { createPalmTree } from './ModelFactory.ts';
import { createJungleTree, createMangroveTree, createPineTree } from './BiomeTrees.ts';

export interface BiomeConfig {
  name: string;
  groundColor: number;
  pathColor: number;
  skyColor: number;
  fogColor: number;
  leafColor: number;
  barkColor: number;
  treeFactory: () => THREE.Group;
}

// We only need the type at compile time, actual THREE usage is in MaterialLibrary
import type * as THREE from 'three';

export const BIOMES: BiomeConfig[] = [
  {
    name: 'Plantation',
    groundColor: 0x4a7c2e,
    pathColor: 0x8b7355,
    skyColor: 0x87ceeb,
    fogColor: 0x87ceeb,
    leafColor: 0x228b22,
    barkColor: 0x8b6914,
    treeFactory: createPalmTree,
  },
  {
    name: 'Dense Jungle',
    groundColor: 0x2e5e1a,
    pathColor: 0x5a6b3a,
    skyColor: 0x5a8a5a,
    fogColor: 0x4a7a4a,
    leafColor: 0x1a6b1a,
    barkColor: 0x5a4a2a,
    treeFactory: createJungleTree,
  },
  {
    name: 'Riverside',
    groundColor: 0x3a7a4e,
    pathColor: 0xc2a878,
    skyColor: 0x8ab4d4,
    fogColor: 0x8ab4d4,
    leafColor: 0x2a7a3a,
    barkColor: 0x6a5a3a,
    treeFactory: createMangroveTree,
  },
  {
    name: 'Mountain Trail',
    groundColor: 0x6a6a5a,
    pathColor: 0x7a6a5a,
    skyColor: 0x9aaabb,
    fogColor: 0x9aaabb,
    leafColor: 0x2a5a2a,
    barkColor: 0x5a4a3a,
    treeFactory: createPineTree,
  },
];
