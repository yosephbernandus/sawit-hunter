import * as THREE from 'three';
import { getMaterials } from './MaterialLibrary.ts';

// Cached geometries
let _geos: ReturnType<typeof createGeometries> | null = null;

function createGeometries() {
  return {
    trunk: new THREE.CylinderGeometry(0.25, 0.4, 7, 6),
    leafPlane: new THREE.PlaneGeometry(3.5, 0.8),
    ground: new THREE.PlaneGeometry(12, 50),
    path: new THREE.PlaneGeometry(LANE_TOTAL_WIDTH, 50),
    sawit: new THREE.IcosahedronGeometry(0.35, 1),
    sawitCap: new THREE.ConeGeometry(0.12, 0.2, 4),
    snake: createSnakeGeometry(),
    log: new THREE.CylinderGeometry(0.25, 0.25, 2.5, 6),
    branch: new THREE.CylinderGeometry(0.06, 0.08, 2.0, 4),
    bucket: new THREE.CylinderGeometry(0.8, 0.55, 1.0, 8),
    shield: new THREE.SphereGeometry(1.2, 12, 8),
  };
}

import { LANE_WIDTH, LANE_COUNT } from '../core/Constants.ts';
const LANE_TOTAL_WIDTH = LANE_WIDTH * (LANE_COUNT + 1);

function createSnakeGeometry(): THREE.TubeGeometry {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    points.push(
      new THREE.Vector3(
        Math.sin(t * Math.PI * 3) * 0.3,
        0.1,
        (t - 0.5) * 2,
      ),
    );
  }
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, 16, 0.12, 6, false);
}

function getGeos() {
  if (!_geos) _geos = createGeometries();
  return _geos;
}

export function createPalmTree(): THREE.Group {
  const mats = getMaterials();
  const geos = getGeos();
  const group = new THREE.Group();

  // Trunk
  const trunk = new THREE.Mesh(geos.trunk, mats.bark);
  trunk.position.y = 3.5;
  trunk.castShadow = true;
  group.add(trunk);

  // Leaves
  const leafCount = 6;
  for (let i = 0; i < leafCount; i++) {
    const leaf = new THREE.Mesh(geos.leafPlane, mats.leaf);
    const angle = (i / leafCount) * Math.PI * 2;
    leaf.position.set(
      Math.cos(angle) * 1.2,
      7.2,
      Math.sin(angle) * 1.2,
    );
    leaf.rotation.set(
      -0.4 + Math.random() * 0.2,
      angle,
      0,
    );
    leaf.castShadow = true;
    group.add(leaf);
  }

  return group;
}

export function createSawitFruit(golden = false): THREE.Group {
  const mats = getMaterials();
  const geos = getGeos();
  const group = new THREE.Group();

  const body = new THREE.Mesh(geos.sawit, golden ? mats.golden : mats.sawit);
  body.castShadow = true;
  group.add(body);

  const cap = new THREE.Mesh(geos.sawitCap, mats.sawitCap);
  cap.position.y = 0.35;
  group.add(cap);

  return group;
}

export function createSnake(): THREE.Mesh {
  const mats = getMaterials();
  const geos = getGeos();
  const mesh = new THREE.Mesh(geos.snake, mats.snake);
  mesh.castShadow = true;
  return mesh;
}

export function createLog(): THREE.Mesh {
  const mats = getMaterials();
  const geos = getGeos();
  const mesh = new THREE.Mesh(geos.log, mats.log);
  mesh.rotation.z = Math.PI / 2;
  mesh.position.y = 0.25;
  mesh.castShadow = true;
  return mesh;
}

export function createBranch(): THREE.Group {
  const mats = getMaterials();
  const geos = getGeos();
  const group = new THREE.Group();

  const main = new THREE.Mesh(geos.branch, mats.bark);
  main.rotation.z = Math.PI / 4;
  main.position.y = 2.5;
  group.add(main);

  const side = new THREE.Mesh(geos.branch, mats.bark);
  side.rotation.z = -Math.PI / 6;
  side.position.set(0.5, 2.8, 0);
  side.scale.set(0.7, 0.7, 0.7);
  group.add(side);

  group.castShadow = true;
  return group;
}

export function createBucket(): THREE.Group {
  const mats = getMaterials();
  const geos = getGeos();
  const group = new THREE.Group();

  const body = new THREE.Mesh(geos.bucket, mats.bucket);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  return group;
}

export function createGroundChunk(): THREE.Group {
  const mats = getMaterials();
  const geos = getGeos();
  const group = new THREE.Group();

  // Grass ground (full width)
  const ground = new THREE.Mesh(geos.ground, mats.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Dirt path (center lanes)
  const path = new THREE.Mesh(geos.path, mats.path);
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.01;
  path.receiveShadow = true;
  group.add(path);

  return group;
}

export function disposeGeometries(): void {
  if (!_geos) return;
  for (const geo of Object.values(_geos)) {
    geo.dispose();
  }
  _geos = null;
}
