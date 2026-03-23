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
    snakeBody: createSnakeGeometry(),
    snakeHead: new THREE.SphereGeometry(0.18, 6, 4), // wider head
    snakeEye:  new THREE.SphereGeometry(0.04, 4, 3),
    snakePupil: new THREE.SphereGeometry(0.025, 4, 3),
    snakeTongue: new THREE.BoxGeometry(0.03, 0.01, 0.18),
    log: new THREE.CylinderGeometry(0.25, 0.25, 2.5, 6),
    branch: new THREE.CylinderGeometry(0.06, 0.08, 2.0, 4),
    bucket: new THREE.CylinderGeometry(0.8, 0.55, 1.0, 8),
    shield: new THREE.SphereGeometry(1.2, 8, 6),
    // Worker character
    workerHead:       new THREE.SphereGeometry(0.18, 6, 5),
    workerHatBrim:    new THREE.CylinderGeometry(0.32, 0.32, 0.04, 8),
    workerHatCrown:   new THREE.ConeGeometry(0.20, 0.22, 8),
    workerTorso:      new THREE.CylinderGeometry(0.22, 0.26, 0.55, 6),
    workerHips:       new THREE.CylinderGeometry(0.26, 0.22, 0.22, 6),
    workerUpperArm:   new THREE.CylinderGeometry(0.07, 0.08, 0.28, 4),
    workerForearm:    new THREE.CylinderGeometry(0.06, 0.07, 0.26, 4),
    workerThigh:      new THREE.CylinderGeometry(0.09, 0.10, 0.32, 5),
    workerShin:       new THREE.CylinderGeometry(0.08, 0.09, 0.30, 5),
    workerHeldBucket: new THREE.CylinderGeometry(0.14, 0.10, 0.22, 7),
    // Goblin — small, reuses simple shapes
    goblinHead: new THREE.SphereGeometry(0.20, 6, 5), // wider bald head
    goblinBody: new THREE.CylinderGeometry(0.16, 0.20, 0.4, 5),
    goblinLeg:  new THREE.CylinderGeometry(0.05, 0.06, 0.25, 4),
    goblinArm:  new THREE.CylinderGeometry(0.04, 0.05, 0.22, 4),
    goblinEar:  new THREE.ConeGeometry(0.07, 0.16, 3),
    // Face parts
    goblinBrow:  new THREE.BoxGeometry(0.10, 0.03, 0.05), // angry brow ridge
    goblinEye:   new THREE.SphereGeometry(0.04, 4, 3), // eyeball
    goblinPupil: new THREE.SphereGeometry(0.025, 4, 3), // squinting pupil
    goblinNose:  new THREE.SphereGeometry(0.05, 4, 3), // wide flat nose
    goblinMouth: new THREE.BoxGeometry(0.12, 0.025, 0.04), // grimace
    goblinTooth: new THREE.BoxGeometry(0.025, 0.03, 0.02), // visible teeth
    // Wowo boss character — stocky formal figure
    wowoHead:     new THREE.SphereGeometry(0.24, 7, 5),
    wowoTorso:    new THREE.CylinderGeometry(0.30, 0.34, 0.65, 6), // stocky
    wowoHips:     new THREE.CylinderGeometry(0.34, 0.28, 0.25, 6),
    wowoLeg:      new THREE.CylinderGeometry(0.10, 0.11, 0.40, 5),
    wowoArm:      new THREE.CylinderGeometry(0.08, 0.09, 0.35, 4),
    wowoPeci:     new THREE.CylinderGeometry(0.22, 0.24, 0.14, 8), // flat peci hat
    wowoMustache: new THREE.BoxGeometry(0.18, 0.04, 0.05), // thick mustache
    wowoEye:      new THREE.SphereGeometry(0.04, 4, 3),
    wowoPupil:    new THREE.SphereGeometry(0.025, 4, 3),
    wowoNose:     new THREE.SphereGeometry(0.05, 4, 3),
    wowoBrow:     new THREE.BoxGeometry(0.10, 0.03, 0.05),
    // MBG food container
    mbgBox:       new THREE.BoxGeometry(0.7, 0.3, 0.5), // rectangular stainless container
    mbgLid:       new THREE.BoxGeometry(0.74, 0.06, 0.54), // slightly bigger lid
    mbgHandle:    new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4), // clasp handle
  };
}

import { LANE_WIDTH, LANE_COUNT } from '../core/Constants.ts';
const LANE_TOTAL_WIDTH = LANE_WIDTH * (LANE_COUNT + 1);

function createSnakeGeometry(): THREE.TubeGeometry {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    points.push(
      new THREE.Vector3(
        Math.sin(t * Math.PI * 3) * 0.3,
        0.1,
        (t - 0.5) * 2,
      ),
    );
  }
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, 10, 0.12, 5, false);
}

export function getGeos() {
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

export function createSnake(): THREE.Group {
  const mats = getMaterials();
  const geos = getGeos();
  const group = new THREE.Group();

  // Body — wavy tube
  const body = new THREE.Mesh(geos.snakeBody, mats.snake);
  body.castShadow = true;
  group.add(body);

  // Head — wider sphere at the front end of the curve
  const head = new THREE.Mesh(geos.snakeHead, mats.snake);
  head.position.set(0, 0.12, -1.0); // front of the snake
  head.scale.set(1.2, 0.8, 1.1); // flat wide head
  head.castShadow = true;
  group.add(head);

  // Eyes (on top of head, looking up/sideways)
  const leftEye = new THREE.Mesh(geos.snakeEye, mats.snakeEye);
  leftEye.position.set(-0.10, 0.20, -1.05);
  group.add(leftEye);

  const rightEye = new THREE.Mesh(geos.snakeEye, mats.snakeEye);
  rightEye.position.set(0.10, 0.20, -1.05);
  group.add(rightEye);

  // Slit pupils
  const leftPupil = new THREE.Mesh(geos.snakePupil, mats.snakePupil);
  leftPupil.position.set(-0.10, 0.22, -1.03);
  leftPupil.scale.set(0.6, 1.2, 0.6); // vertical slit
  group.add(leftPupil);

  const rightPupil = new THREE.Mesh(geos.snakePupil, mats.snakePupil);
  rightPupil.position.set(0.10, 0.22, -1.03);
  rightPupil.scale.set(0.6, 1.2, 0.6);
  group.add(rightPupil);

  // Forked tongue sticking out
  const tongueL = new THREE.Mesh(geos.snakeTongue, mats.snakeTongue);
  tongueL.position.set(-0.025, 0.10, -1.22);
  tongueL.rotation.y = 0.15;
  group.add(tongueL);

  const tongueR = new THREE.Mesh(geos.snakeTongue, mats.snakeTongue);
  tongueR.position.set(0.025, 0.10, -1.22);
  tongueR.rotation.y = -0.15;
  group.add(tongueR);

  // Rotate so snake lies across the lane (perpendicular to player direction)
  group.rotation.y = Math.PI;

  return group;
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

export interface WorkerRefs {
  torso: THREE.Mesh;
  head: THREE.Mesh;
  leftLegGroup: THREE.Group;
  rightLegGroup: THREE.Group;
  leftKneeGroup: THREE.Group;
  rightKneeGroup: THREE.Group;
  leftArmGroup: THREE.Group;
  rightArmGroup: THREE.Group;
  leftElbowGroup: THREE.Group;
  rightElbowGroup: THREE.Group;
}

export function createWorker(): { group: THREE.Group; refs: WorkerRefs } {
  const mats = getMaterials();
  const geos = getGeos();
  const group = new THREE.Group();

  const addMesh = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x: number, y: number, z: number): THREE.Mesh => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  // Hips
  addMesh(geos.workerHips, mats.workerPants, group, 0, 0.55, 0);

  // Torso
  const torso = addMesh(geos.workerTorso, mats.workerShirt, group, 0, 0.83, 0);

  // Head
  const head = addMesh(geos.workerHead, mats.workerSkin, group, 0, 1.35, 0);

  // Straw hat
  addMesh(geos.workerHatBrim,  mats.workerHat, group, 0, 1.47, 0);
  addMesh(geos.workerHatCrown, mats.workerHat, group, 0, 1.60, 0);

  // --- Left arm ---
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.30, 1.10, 0);
  group.add(leftArmGroup);
  addMesh(geos.workerUpperArm, mats.workerShirt, leftArmGroup, 0, -0.14, 0);
  const leftElbowGroup = new THREE.Group();
  leftElbowGroup.position.set(0, -0.28, 0);
  leftArmGroup.add(leftElbowGroup);
  addMesh(geos.workerForearm, mats.workerSkin, leftElbowGroup, 0, -0.13, 0);

  // --- Right arm ---
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.30, 1.10, 0);
  group.add(rightArmGroup);
  addMesh(geos.workerUpperArm, mats.workerShirt, rightArmGroup, 0, -0.14, 0);
  const rightElbowGroup = new THREE.Group();
  rightElbowGroup.position.set(0, -0.28, 0);
  rightArmGroup.add(rightElbowGroup);
  addMesh(geos.workerForearm, mats.workerSkin, rightElbowGroup, 0, -0.13, 0);

  // Small bucket held in right hand
  const heldBucket = addMesh(geos.workerHeldBucket, mats.bucket, rightElbowGroup, 0.05, -0.28, 0);
  heldBucket.rotation.z = 0.15;

  // --- Left leg ---
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-0.12, 0.55, 0);
  group.add(leftLegGroup);
  addMesh(geos.workerThigh, mats.workerPants, leftLegGroup, 0, -0.16, 0);
  const leftKneeGroup = new THREE.Group();
  leftKneeGroup.position.set(0, -0.32, 0);
  leftLegGroup.add(leftKneeGroup);
  addMesh(geos.workerShin, mats.workerPants, leftKneeGroup, 0, -0.15, 0);

  // --- Right leg ---
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(0.12, 0.55, 0);
  group.add(rightLegGroup);
  addMesh(geos.workerThigh, mats.workerPants, rightLegGroup, 0, -0.16, 0);
  const rightKneeGroup = new THREE.Group();
  rightKneeGroup.position.set(0, -0.32, 0);
  rightLegGroup.add(rightKneeGroup);
  addMesh(geos.workerShin, mats.workerPants, rightKneeGroup, 0, -0.15, 0);

  return {
    group,
    refs: {
      torso,
      head,
      leftLegGroup,
      rightLegGroup,
      leftKneeGroup,
      rightKneeGroup,
      leftArmGroup,
      rightArmGroup,
      leftElbowGroup,
      rightElbowGroup,
    },
  };
}

// Cached goblin label texture (created once, reused by all goblins)
let _goblinLabelMat: THREE.SpriteMaterial | null = null;

function getGoblinLabelMaterial(): THREE.SpriteMaterial {
  if (_goblinLabelMat) return _goblinLabelMat;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff4444';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.strokeText('GOBLINB', 64, 16);
  ctx.fillText('GOBLINB', 64, 16);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  _goblinLabelMat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  });
  return _goblinLabelMat;
}

export interface GoblinRefs {
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  headGroup: THREE.Group;
}

export function createGoblin(): { group: THREE.Group; refs: GoblinRefs } {
  const mats = getMaterials();
  const geos = getGeos();
  const group = new THREE.Group();

  // Body
  const body = new THREE.Mesh(geos.goblinBody, mats.goblinCloth);
  body.position.y = 0.45;
  body.castShadow = true;
  group.add(body);

  // Head group — rotates independently to face the player
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.82;
  group.add(headGroup);

  // Head — slightly squashed for that bahlil look
  const head = new THREE.Mesh(geos.goblinHead, mats.goblinSkin);
  head.scale.set(1.1, 0.9, 1.0); // wider, flatter
  head.castShadow = true;
  headGroup.add(head);

  // Ears (pointy, angled outward)
  const leftEar = new THREE.Mesh(geos.goblinEar, mats.goblinSkin);
  leftEar.position.set(-0.20, 0.03, 0);
  leftEar.rotation.z = 0.7;
  headGroup.add(leftEar);

  const rightEar = new THREE.Mesh(geos.goblinEar, mats.goblinSkin);
  rightEar.position.set(0.20, 0.03, 0);
  rightEar.rotation.z = -0.7;
  headGroup.add(rightEar);

  // --- Face (all relative to headGroup) ---

  // Angry brow ridges (angled inward = angry)
  const leftBrow = new THREE.Mesh(geos.goblinBrow, mats.goblinCloth);
  leftBrow.position.set(-0.07, 0.08, 0.16);
  leftBrow.rotation.z = -0.3;
  headGroup.add(leftBrow);

  const rightBrow = new THREE.Mesh(geos.goblinBrow, mats.goblinCloth);
  rightBrow.position.set(0.07, 0.08, 0.16);
  rightBrow.rotation.z = 0.3;
  headGroup.add(rightBrow);

  // Eyes (squinting — flattened scale Y)
  const leftEye = new THREE.Mesh(geos.goblinEye, mats.goblinEye);
  leftEye.position.set(-0.07, 0.03, 0.17);
  leftEye.scale.y = 0.5;
  headGroup.add(leftEye);

  const rightEye = new THREE.Mesh(geos.goblinEye, mats.goblinEye);
  rightEye.position.set(0.07, 0.03, 0.17);
  rightEye.scale.y = 0.5;
  headGroup.add(rightEye);

  // Pupils (small, dark, looking forward)
  const leftPupil = new THREE.Mesh(geos.goblinPupil, mats.goblinPupil);
  leftPupil.position.set(-0.07, 0.03, 0.20);
  leftPupil.scale.y = 0.5;
  headGroup.add(leftPupil);

  const rightPupil = new THREE.Mesh(geos.goblinPupil, mats.goblinPupil);
  rightPupil.position.set(0.07, 0.03, 0.20);
  rightPupil.scale.y = 0.5;
  headGroup.add(rightPupil);

  // Wide flat nose
  const nose = new THREE.Mesh(geos.goblinNose, mats.goblinSkin);
  nose.position.set(0, -0.02, 0.18);
  nose.scale.set(1.2, 0.6, 0.8);
  headGroup.add(nose);

  // Grimace mouth
  const mouth = new THREE.Mesh(geos.goblinMouth, mats.goblinMouth);
  mouth.position.set(0, -0.09, 0.17);
  headGroup.add(mouth);

  // Teeth (2 visible teeth poking out of grimace)
  const leftTooth = new THREE.Mesh(geos.goblinTooth, mats.goblinTooth);
  leftTooth.position.set(-0.03, -0.10, 0.19);
  headGroup.add(leftTooth);

  const rightTooth = new THREE.Mesh(geos.goblinTooth, mats.goblinTooth);
  rightTooth.position.set(0.03, -0.10, 0.19);
  headGroup.add(rightTooth);

  // Legs
  const leftLeg = new THREE.Mesh(geos.goblinLeg, mats.goblinSkin);
  leftLeg.position.set(-0.08, 0.13, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(geos.goblinLeg, mats.goblinSkin);
  rightLeg.position.set(0.08, 0.13, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // Arms
  const leftArm = new THREE.Mesh(geos.goblinArm, mats.goblinSkin);
  leftArm.position.set(-0.24, 0.55, 0);
  leftArm.castShadow = true;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(geos.goblinArm, mats.goblinSkin);
  rightArm.position.set(0.24, 0.55, 0);
  rightArm.castShadow = true;
  group.add(rightArm);

  // "GOBLINB" label floating above head
  const label = new THREE.Sprite(getGoblinLabelMaterial());
  label.position.set(0, 1.15, 0);
  label.scale.set(0.8, 0.2, 1);
  group.add(label);

  return { group, refs: { leftLeg, rightLeg, leftArm, rightArm, headGroup } };
}

export interface WowoRefs {
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
}

export function createWowo(): { group: THREE.Group; refs: WowoRefs } {
  const mats = getMaterials();
  const geos = getGeos();
  const group = new THREE.Group();

  // Scale up — boss is bigger than player
  group.scale.set(1.4, 1.4, 1.4);

  // Hips
  const hips = new THREE.Mesh(geos.wowoHips, mats.wowoPants);
  hips.position.y = 0.55;
  hips.castShadow = true;
  group.add(hips);

  // Torso — stocky
  const torso = new THREE.Mesh(geos.wowoTorso, mats.wowoSuit);
  torso.position.y = 0.90;
  torso.castShadow = true;
  group.add(torso);

  // Head
  const head = new THREE.Mesh(geos.wowoHead, mats.wowoSkin);
  head.position.y = 1.45;
  head.scale.set(1.0, 0.95, 1.0); // slightly wide
  head.castShadow = true;
  group.add(head);

  // Peci hat
  const peci = new THREE.Mesh(geos.wowoPeci, mats.wowoHat);
  peci.position.y = 1.65;
  group.add(peci);

  // Face — brows
  const leftBrow = new THREE.Mesh(geos.wowoBrow, mats.wowoMustache);
  leftBrow.position.set(-0.08, 1.52, 0.20);
  leftBrow.rotation.z = 0.2;
  group.add(leftBrow);

  const rightBrow = new THREE.Mesh(geos.wowoBrow, mats.wowoMustache);
  rightBrow.position.set(0.08, 1.52, 0.20);
  rightBrow.rotation.z = -0.2;
  group.add(rightBrow);

  // Eyes
  const leftEye = new THREE.Mesh(geos.wowoEye, mats.goblinEye);
  leftEye.position.set(-0.08, 1.47, 0.21);
  group.add(leftEye);

  const rightEye = new THREE.Mesh(geos.wowoEye, mats.goblinEye);
  rightEye.position.set(0.08, 1.47, 0.21);
  group.add(rightEye);

  // Pupils
  const leftPupil = new THREE.Mesh(geos.wowoPupil, mats.goblinPupil);
  leftPupil.position.set(-0.08, 1.47, 0.24);
  group.add(leftPupil);

  const rightPupil = new THREE.Mesh(geos.wowoPupil, mats.goblinPupil);
  rightPupil.position.set(0.08, 1.47, 0.24);
  group.add(rightPupil);

  // Nose
  const nose = new THREE.Mesh(geos.wowoNose, mats.wowoSkin);
  nose.position.set(0, 1.42, 0.22);
  nose.scale.set(1.1, 0.8, 0.9);
  group.add(nose);

  // Thick mustache
  const mustache = new THREE.Mesh(geos.wowoMustache, mats.wowoMustache);
  mustache.position.set(0, 1.36, 0.22);
  group.add(mustache);

  // Legs
  const leftLeg = new THREE.Mesh(geos.wowoLeg, mats.wowoPants);
  leftLeg.position.set(-0.14, 0.20, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(geos.wowoLeg, mats.wowoPants);
  rightLeg.position.set(0.14, 0.20, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // Arms
  const leftArm = new THREE.Mesh(geos.wowoArm, mats.wowoSuit);
  leftArm.position.set(-0.38, 0.95, 0);
  leftArm.castShadow = true;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(geos.wowoArm, mats.wowoSuit);
  rightArm.position.set(0.38, 0.95, 0);
  rightArm.castShadow = true;
  group.add(rightArm);

  // "WOWO" label
  const label = new THREE.Sprite(getWowoLabelMaterial());
  label.position.set(0, 1.90, 0);
  label.scale.set(0.8, 0.2, 1);
  group.add(label);

  return { group, refs: { leftArm, rightArm } };
}

// Cached wowo label
let _wowoLabelMat: THREE.SpriteMaterial | null = null;

function getWowoLabelMaterial(): THREE.SpriteMaterial {
  if (_wowoLabelMat) return _wowoLabelMat;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff2222';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.strokeText('WOWO', 64, 16);
  ctx.fillText('WOWO', 64, 16);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  _wowoLabelMat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  });
  return _wowoLabelMat;
}

export function createMBG(): THREE.Group {
  const mats = getMaterials();
  const geos = getGeos();
  const group = new THREE.Group();

  // Main container body
  const box = new THREE.Mesh(geos.mbgBox, mats.mbgSteel);
  box.castShadow = true;
  group.add(box);

  // Lid on top
  const lid = new THREE.Mesh(geos.mbgLid, mats.mbgLid);
  lid.position.y = 0.18;
  group.add(lid);

  // Handle clasps on sides
  const leftHandle = new THREE.Mesh(geos.mbgHandle, mats.mbgHandle);
  leftHandle.position.set(-0.37, 0.10, 0);
  leftHandle.rotation.z = Math.PI / 2;
  group.add(leftHandle);

  const rightHandle = new THREE.Mesh(geos.mbgHandle, mats.mbgHandle);
  rightHandle.position.set(0.37, 0.10, 0);
  rightHandle.rotation.z = Math.PI / 2;
  group.add(rightHandle);

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
