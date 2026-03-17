import type { GameScene as IGameScene } from '../core/SceneManager.ts';
import * as THREE from 'three';
import { createPalmTree, createGroundChunk } from '../rendering/ModelFactory.ts';
import { randomRange } from '../utils/MathUtils.ts';
import type { AudioManager } from '../audio/AudioManager.ts';

export class MenuScene implements IGameScene {
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private audio: AudioManager;
  private time = 0;
  private bgObjects: THREE.Object3D[] = [];

  constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene, audio: AudioManager) {
    this.camera = camera;
    this.scene = scene;
    this.audio = audio;
  }

  enter(): void {
    this.time = 0;

    // Clean up game objects from previous scene
    const toRemove: THREE.Object3D[] = [];
    this.scene.traverse((obj) => {
      if (obj.userData['gameObject']) toRemove.push(obj);
    });
    toRemove.forEach((obj) => this.scene.remove(obj));

    // Background scenery
    this.bgObjects = [];

    for (let i = 0; i < 4; i++) {
      const chunk = createGroundChunk();
      chunk.position.z = -i * 50 + 25;
      chunk.userData['menuBg'] = true;
      this.scene.add(chunk);
      this.bgObjects.push(chunk);
    }

    for (let i = 0; i < 16; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const tree = createPalmTree();
      tree.position.set(
        side * (5 + randomRange(0, 2)),
        0,
        -i * 8 + randomRange(-2, 2),
      );
      tree.rotation.y = randomRange(0, Math.PI * 2);
      tree.scale.setScalar(randomRange(0.75, 1.1));
      tree.userData['menuBg'] = true;
      this.scene.add(tree);
      this.bgObjects.push(tree);
    }

    this.camera.position.set(0, 8, 12);
    this.camera.lookAt(0, 1, -10);

    // UI
    document.getElementById('menuScreen')?.classList.remove('hidden');
    document.getElementById('hud')?.classList.add('hidden');
    document.getElementById('mobileControls')?.classList.add('hidden');
    document.getElementById('gameOverScreen')?.classList.add('hidden');

    // High score
    const hs = localStorage.getItem('sawitHunterHighScore') ?? '0';
    const hsDisplay = document.getElementById('highScoreDisplay');
    if (hsDisplay) {
      hsDisplay.textContent = parseInt(hs, 10) > 0 ? `High Score: ${hs}` : '';
    }

    // Hide controls hint on mobile
    const hint = document.getElementById('controlsHint');
    if (hint) {
      hint.style.display = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'none' : '';
    }

    // Music
    this.audio.playMusic('menu');
  }

  update(dt: number): void {
    this.time += dt;
    this.camera.position.x = Math.sin(this.time * 0.3) * 1.5;
    this.camera.position.y = 8 + Math.sin(this.time * 0.2) * 0.3;
    this.camera.lookAt(0, 1, -10);
  }

  exit(): void {
    document.getElementById('menuScreen')?.classList.add('hidden');
    for (const obj of this.bgObjects) {
      this.scene.remove(obj);
    }
    this.bgObjects = [];
  }
}
