import * as THREE from 'three';
import { getMaterials } from './MaterialLibrary.ts';

// Shared geometries for biome trees (created lazily)
let _biomeGeos: ReturnType<typeof createBiomeGeos> | null = null;

function createBiomeGeos() {
  return {
    // Jungle tree — thicker trunk, more foliage layers
    jungleTrunk: new THREE.CylinderGeometry(0.35, 0.55, 8, 6),
    jungleLeaf: new THREE.SphereGeometry(1.8, 5, 4),
    jungleLeafSmall: new THREE.SphereGeometry(1.2, 5, 4),

    // Mangrove — wide base, multiple thin trunks look
    mangroveTrunk: new THREE.CylinderGeometry(0.15, 0.5, 5, 5),
    mangroveCanopy: new THREE.SphereGeometry(2.0, 5, 4),
    mangroveRoot: new THREE.CylinderGeometry(0.04, 0.12, 2.0, 3),

    // Pine — cone + cylinder
    pineTrunk: new THREE.CylinderGeometry(0.2, 0.3, 5, 5),
    pineCone1: new THREE.ConeGeometry(1.8, 3.0, 6),
    pineCone2: new THREE.ConeGeometry(1.3, 2.2, 6),
    pineCone3: new THREE.ConeGeometry(0.8, 1.6, 6),
  };
}

function getBiomeGeos() {
  if (!_biomeGeos) _biomeGeos = createBiomeGeos();
  return _biomeGeos;
}

export function createJungleTree(): THREE.Group {
  const mats = getMaterials();
  const geos = getBiomeGeos();
  const group = new THREE.Group();

  const trunk = new THREE.Mesh(geos.jungleTrunk, mats.bark);
  trunk.position.y = 4;
  trunk.castShadow = true;
  group.add(trunk);

  // Dense canopy — two overlapping spheres
  const canopy = new THREE.Mesh(geos.jungleLeaf, mats.leaf);
  canopy.position.y = 8.5;
  canopy.castShadow = true;
  group.add(canopy);

  const canopy2 = new THREE.Mesh(geos.jungleLeafSmall, mats.leaf);
  canopy2.position.set(0.6, 7.5, 0.4);
  canopy2.castShadow = true;
  group.add(canopy2);

  return group;
}

export function createMangroveTree(): THREE.Group {
  const mats = getMaterials();
  const geos = getBiomeGeos();
  const group = new THREE.Group();

  // Main trunk (leaning)
  const trunk = new THREE.Mesh(geos.mangroveTrunk, mats.bark);
  trunk.position.y = 2.5;
  trunk.rotation.z = 0.1;
  trunk.castShadow = true;
  group.add(trunk);

  // Exposed roots
  for (let i = 0; i < 3; i++) {
    const root = new THREE.Mesh(geos.mangroveRoot, mats.bark);
    const angle = (i / 3) * Math.PI * 2;
    root.position.set(Math.cos(angle) * 0.4, 0.8, Math.sin(angle) * 0.4);
    root.rotation.z = (Math.random() - 0.5) * 0.6;
    group.add(root);
  }

  // Wide canopy
  const canopy = new THREE.Mesh(geos.mangroveCanopy, mats.leaf);
  canopy.position.y = 5.8;
  canopy.scale.set(1, 0.6, 1);
  canopy.castShadow = true;
  group.add(canopy);

  return group;
}

export function createPineTree(): THREE.Group {
  const mats = getMaterials();
  const geos = getBiomeGeos();
  const group = new THREE.Group();

  // Trunk
  const trunk = new THREE.Mesh(geos.pineTrunk, mats.bark);
  trunk.position.y = 2.5;
  trunk.castShadow = true;
  group.add(trunk);

  // Three stacked cones
  const cone1 = new THREE.Mesh(geos.pineCone1, mats.leaf);
  cone1.position.y = 5.5;
  cone1.castShadow = true;
  group.add(cone1);

  const cone2 = new THREE.Mesh(geos.pineCone2, mats.leaf);
  cone2.position.y = 7.2;
  cone2.castShadow = true;
  group.add(cone2);

  const cone3 = new THREE.Mesh(geos.pineCone3, mats.leaf);
  cone3.position.y = 8.5;
  cone3.castShadow = true;
  group.add(cone3);

  return group;
}
