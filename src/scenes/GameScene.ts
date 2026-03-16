import type { GameScene as IGameScene } from '../core/SceneManager.ts';
import type * as THREE from 'three';
import { InputManager } from '../input/InputManager.ts';
import { PlayerController } from '../systems/PlayerController.ts';
import { CameraController } from '../systems/CameraController.ts';
import { WorldGenerator } from '../systems/WorldGenerator.ts';
import { EventBus } from '../core/EventBus.ts';
import { createBucket } from '../rendering/ModelFactory.ts';
import { BASE_SPEED } from '../core/Constants.ts';
import { isMobile } from '../utils/DeviceDetect.ts';
import type { QualityTier } from '../utils/DeviceDetect.ts';

export class GameScene implements IGameScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private quality: QualityTier;

  // Systems
  private input!: InputManager;
  private player!: PlayerController;
  private cameraCtrl!: CameraController;
  private world!: WorldGenerator;
  readonly eventBus = new EventBus();

  // State
  private speed = BASE_SPEED;
  private distance = 0;
  private playerMesh!: THREE.Group;
  private playerName = 'Player';

  // Callback to switch scenes
  private onGameOver: (score: number, distance: number) => void;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    quality: QualityTier,
    onGameOver: (score: number, distance: number) => void,
  ) {
    this.scene = scene;
    this.camera = camera;
    this.quality = quality;
    this.onGameOver = onGameOver;
  }

  setPlayerName(name: string): void {
    this.playerName = name;
  }

  enter(): void {
    // Clear previous game objects (keep lights/fog)
    const toRemove: THREE.Object3D[] = [];
    this.scene.traverse((obj) => {
      if (obj.userData['gameObject']) toRemove.push(obj);
    });
    toRemove.forEach((obj) => this.scene.remove(obj));

    // Reset state
    this.speed = BASE_SPEED;
    this.distance = 0;

    // Player
    this.playerMesh = createBucket();
    this.playerMesh.userData['gameObject'] = true;
    this.scene.add(this.playerMesh);

    // Systems
    const canvas = document.getElementById('gameCanvas')!;
    this.input = new InputManager(canvas);
    this.player = new PlayerController(this.playerMesh, this.input);
    this.cameraCtrl = new CameraController(this.camera, this.playerMesh);
    this.world = new WorldGenerator(this.scene, this.quality);

    // Mark world chunks as game objects for cleanup
    this.scene.traverse((obj) => {
      if (!obj.userData['gameObject'] && obj.parent === this.scene && obj.type === 'Group') {
        obj.userData['gameObject'] = true;
      }
    });

    // UI
    document.getElementById('hud')?.classList.remove('hidden');
    document.getElementById('hudPlayerName')!.textContent = this.playerName;
    document.getElementById('hudScore')!.textContent = '0';
    document.getElementById('hudHighScore')!.textContent =
      localStorage.getItem('sawitRunnerHighScore') ?? '0';

    if (isMobile()) {
      document.getElementById('mobileControls')?.classList.remove('hidden');
    }

    this.cameraCtrl.snapToTarget();
  }

  update(dt: number): void {
    // 1. Input
    this.input.update();

    // 2. Player
    this.player.update(dt);

    // 3. World scrolling
    this.world.update(dt, this.speed, this.playerMesh.position.z);

    // 4. Distance tracking
    this.distance += this.speed * dt;

    // 5. Camera
    this.cameraCtrl.update(dt);
  }

  getSpeed(): number {
    return this.speed;
  }

  setSpeed(s: number): void {
    this.speed = s;
  }

  getDistance(): number {
    return this.distance;
  }

  getPlayerController(): PlayerController {
    return this.player;
  }

  getCameraController(): CameraController {
    return this.cameraCtrl;
  }

  exit(): void {
    document.getElementById('hud')?.classList.add('hidden');
    document.getElementById('mobileControls')?.classList.add('hidden');
    this.input?.dispose();
    this.world?.dispose();
  }
}
