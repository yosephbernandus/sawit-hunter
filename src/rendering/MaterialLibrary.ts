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
    snakeEye:    new THREE.MeshBasicMaterial({ color: 0xffff00 }), // yellow eyes
    snakePupil:  new THREE.MeshBasicMaterial({ color: 0x111100 }),
    snakeTongue: new THREE.MeshBasicMaterial({ color: 0xcc0000 }), // red forked tongue
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
    goblinSkin:  new THREE.MeshLambertMaterial({ color: C.GOBLIN_SKIN_COLOR }),
    goblinCloth: new THREE.MeshLambertMaterial({ color: C.GOBLIN_COLOR }),
    goblinEye:   new THREE.MeshBasicMaterial({ color: 0xeeeecc }), // yellowish white
    goblinPupil: new THREE.MeshBasicMaterial({ color: 0x111100 }), // dark squint
    goblinMouth: new THREE.MeshBasicMaterial({ color: 0x330000 }), // dark grimace
    goblinTooth: new THREE.MeshBasicMaterial({ color: 0xddddaa }), // yellowed teeth
    // Wowo boss
    wowoSkin:    new THREE.MeshLambertMaterial({ color: 0xd4a574 }), // tan skin
    wowoSuit:    new THREE.MeshLambertMaterial({ color: 0x2c3e50 }), // dark formal suit
    wowoPants:   new THREE.MeshLambertMaterial({ color: 0x2c3e50 }),
    wowoHat:     new THREE.MeshLambertMaterial({ color: 0x1a1a1a }), // dark peci/hat
    wowoMustache: new THREE.MeshBasicMaterial({ color: 0x222222 }),
    // MBG food container
    mbgSteel:    new THREE.MeshLambertMaterial({ color: 0xc0c0c0 }), // stainless steel
    mbgLid:      new THREE.MeshLambertMaterial({ color: 0xa8a8a8 }), // darker steel lid
    mbgHandle:   new THREE.MeshLambertMaterial({ color: 0x888888 }),
  } as const;
}

export function initMaterials(quality: QualityTier): void {
  _quality = quality;
}

export function getMaterials() {
  if (!_materials) _materials = createMaterials();
  return _materials;
}

// Keys that BiomeManager can lerp
export type LerpableMaterialKey = 'ground' | 'path' | 'leaf' | 'bark';

const _tmpColor = new THREE.Color();

/** Snapshot current colors for lerp start state */
export function snapshotColors(keys: LerpableMaterialKey[]): Record<LerpableMaterialKey, THREE.Color> {
  const mats = getMaterials();
  const snap = {} as Record<LerpableMaterialKey, THREE.Color>;
  for (const key of keys) {
    snap[key] = (mats[key] as THREE.MeshLambertMaterial).color.clone();
  }
  return snap;
}

/** Lerp material colors from snapshot toward targets */
export function lerpColors(
  from: Record<LerpableMaterialKey, THREE.Color>,
  targets: Partial<Record<LerpableMaterialKey, number>>,
  alpha: number,
): void {
  const mats = getMaterials();
  for (const key of Object.keys(targets) as LerpableMaterialKey[]) {
    _tmpColor.set(targets[key]!);
    (mats[key] as THREE.MeshLambertMaterial).color.copy(from[key]).lerp(_tmpColor, alpha);
  }
}

/** Reset biome-affected material colors to Plantation defaults */
export function resetBiomeColors(): void {
  const mats = getMaterials();
  (mats.ground as THREE.MeshLambertMaterial).color.set(C.GROUND_COLOR);
  (mats.path as THREE.MeshLambertMaterial).color.set(0x8b7355);
  (mats.leaf as THREE.MeshLambertMaterial).color.set(C.LEAF_COLOR);
  (mats.bark as THREE.MeshLambertMaterial).color.set(C.BARK_COLOR);
}

export function disposeMaterials(): void {
  if (!_materials) return;
  for (const mat of Object.values(_materials)) {
    mat.dispose();
  }
  _materials = null;
}
