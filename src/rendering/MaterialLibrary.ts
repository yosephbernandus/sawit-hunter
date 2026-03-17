import * as THREE from 'three';
import * as C from '../core/Constants.ts';
import type { QualityTier } from '../utils/DeviceDetect.ts';

let _materials: ReturnType<typeof createMaterials> | null = null;
let _quality: QualityTier = 'low';

function createMaterials() {
  const useStandard = _quality === 'high';

  return {
    ground: new THREE.MeshLambertMaterial({ color: C.GROUND_COLOR }),
    bark: new THREE.MeshLambertMaterial({ color: C.BARK_COLOR }),
    leaf: new THREE.MeshLambertMaterial({
      color: C.LEAF_COLOR,
      side: THREE.DoubleSide,
    }),
    sawit: new THREE.MeshLambertMaterial({ color: C.SAWIT_COLOR }),
    sawitCap: new THREE.MeshLambertMaterial({ color: C.LEAF_COLOR }),
    golden: useStandard
      ? new THREE.MeshStandardMaterial({
          color: C.GOLDEN_COLOR,
          emissive: C.GOLDEN_COLOR,
          emissiveIntensity: 0.5,
          metalness: 0.8,
          roughness: 0.2,
        })
      : new THREE.MeshLambertMaterial({
          color: C.GOLDEN_COLOR,
          emissive: C.GOLDEN_COLOR,
          emissiveIntensity: 0.4,
        }),
    snake: new THREE.MeshLambertMaterial({ color: C.SNAKE_COLOR }),
    log: new THREE.MeshLambertMaterial({ color: C.LOG_COLOR }),
    bucket: useStandard
      ? new THREE.MeshStandardMaterial({
          color: C.BUCKET_COLOR,
          metalness: 0.6,
          roughness: 0.3,
        })
      : new THREE.MeshLambertMaterial({ color: C.BUCKET_COLOR }),
    shield: new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.25,
      wireframe: true,
    }),
    path: new THREE.MeshLambertMaterial({ color: 0x8b7355 }),
    workerSkin:  new THREE.MeshLambertMaterial({ color: C.WORKER_SKIN_COLOR }),
    workerShirt: new THREE.MeshLambertMaterial({ color: C.WORKER_SHIRT_COLOR }),
    workerPants: new THREE.MeshLambertMaterial({ color: C.WORKER_PANTS_COLOR }),
    workerHat:   new THREE.MeshLambertMaterial({ color: C.WORKER_HAT_COLOR }),
  } as const;
}

export function initMaterials(quality: QualityTier): void {
  _quality = quality;
}

export function getMaterials() {
  if (!_materials) _materials = createMaterials();
  return _materials;
}

export function disposeMaterials(): void {
  if (!_materials) return;
  for (const mat of Object.values(_materials)) {
    mat.dispose();
  }
  _materials = null;
}
