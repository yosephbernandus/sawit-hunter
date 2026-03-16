import { Engine } from './core/Engine.ts';
import { setupScene } from './rendering/SceneSetup.ts';
import { getQualityTier } from './utils/DeviceDetect.ts';
import { createPalmTree, createBucket, createGroundChunk, createSawitFruit, createSnake, createLog } from './rendering/ModelFactory.ts';
import * as THREE from 'three';
import { CAMERA_OFFSET_Y, CAMERA_OFFSET_Z, CAMERA_LOOK_AHEAD } from './core/Constants.ts';

async function init() {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const loadingFill = document.getElementById('loadingFill') as HTMLElement;
  const loadingText = document.getElementById('loadingText') as HTMLElement;

  // Progress updates
  const setProgress = (pct: number, text: string) => {
    loadingFill.style.width = `${pct}%`;
    loadingText.textContent = text;
  };

  setProgress(10, 'Initializing engine...');
  const quality = getQualityTier();
  const engine = new Engine(canvas);

  setProgress(30, 'Setting up scene...');
  setupScene(engine.threeScene, quality);

  // Position camera for demo view
  engine.camera.position.set(0, CAMERA_OFFSET_Y, CAMERA_OFFSET_Z);
  engine.camera.lookAt(0, 0, -CAMERA_LOOK_AHEAD);

  setProgress(50, 'Creating models...');

  // Ground chunks
  for (let i = 0; i < 4; i++) {
    const chunk = createGroundChunk();
    chunk.position.z = -i * 50;
    engine.threeScene.add(chunk);
  }

  // Palm trees along the sides
  for (let i = 0; i < 20; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const tree = createPalmTree();
    tree.position.set(
      side * (5 + Math.random() * 2),
      0,
      -i * 10 + Math.random() * 4,
    );
    tree.rotation.y = Math.random() * Math.PI * 2;
    tree.scale.setScalar(0.8 + Math.random() * 0.4);
    engine.threeScene.add(tree);
  }

  setProgress(70, 'Placing objects...');

  // Bucket (player)
  const bucket = createBucket();
  bucket.position.set(0, 0.5, 0);
  engine.threeScene.add(bucket);

  // Some sawit fruits
  for (let i = 0; i < 3; i++) {
    const sawit = createSawitFruit(i === 0);
    sawit.position.set((i - 1) * 2.5, 1.2, -8 - i * 6);
    engine.threeScene.add(sawit);
  }

  // A snake on the path
  const snake = createSnake();
  snake.position.set(0, 0, -25);
  engine.threeScene.add(snake);

  // A log
  const log = createLog();
  log.position.set(2.5, 0, -35);
  engine.threeScene.add(log);

  setProgress(90, 'Almost ready...');

  // Simple demo animation: slowly move everything toward camera
  const demoSpeed = 5;
  const objects = engine.threeScene.children.filter(
    (c) => c !== engine.threeScene.children[0] && // skip lights
           c !== engine.threeScene.children[1] &&
           c !== engine.threeScene.children[2],
  );

  // Register a demo "scene"
  engine.sceneManager.register('demo', {
    enter() {},
    update(dt: number) {
      // Rotate sawit fruits
      engine.threeScene.traverse((obj) => {
        if (obj.userData['rotate']) {
          obj.rotation.y += dt * 2;
        }
      });

      // Gentle camera sway
      const t = performance.now() / 1000;
      engine.camera.position.x = Math.sin(t * 0.3) * 0.5;
    },
    exit() {},
  });

  // Mark sawit for rotation
  engine.threeScene.traverse((obj) => {
    if (obj instanceof THREE.Group && obj.children.length === 2) {
      const firstChild = obj.children[0];
      if (firstChild instanceof THREE.Mesh &&
          firstChild.geometry instanceof THREE.IcosahedronGeometry) {
        obj.userData['rotate'] = true;
      }
    }
  });

  setProgress(100, 'Ready!');

  // Wait a moment then show menu
  await new Promise((r) => setTimeout(r, 500));
  document.getElementById('loadingScreen')!.classList.add('hidden');
  document.getElementById('menuScreen')!.classList.remove('hidden');

  // Start engine with demo scene
  engine.sceneManager.switch('demo');
  engine.start();

  // Play button → just log for now (Phase 2 will add real gameplay)
  document.getElementById('playBtn')!.addEventListener('click', () => {
    const name = (document.getElementById('usernameInput') as HTMLInputElement).value.trim() || 'Player';
    document.getElementById('menuScreen')!.classList.add('hidden');
    document.getElementById('hud')!.classList.remove('hidden');
    document.getElementById('hudPlayerName')!.textContent = name;
    console.log(`Game started for: ${name}`);
  });

  document.getElementById('restartBtn')!.addEventListener('click', () => {
    document.getElementById('gameOverScreen')!.classList.add('hidden');
    document.getElementById('menuScreen')!.classList.remove('hidden');
  });
}

init().catch(console.error);
