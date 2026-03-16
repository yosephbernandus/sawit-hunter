import type { GameScene as IGameScene } from '../core/SceneManager.ts';
import type * as THREE from 'three';
import { InputManager } from '../input/InputManager.ts';
import { PlayerController } from '../systems/PlayerController.ts';
import { CameraController } from '../systems/CameraController.ts';
import { WorldGenerator } from '../systems/WorldGenerator.ts';
import { CollectibleManager } from '../systems/CollectibleManager.ts';
import { ObstacleManager } from '../systems/ObstacleManager.ts';
import { CollisionSystem } from '../systems/CollisionSystem.ts';
import { ScoreManager } from '../systems/ScoreManager.ts';
import { DifficultyManager } from '../systems/DifficultyManager.ts';
import { ParticleSystem } from '../systems/ParticleSystem.ts';
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
  private collectibles!: CollectibleManager;
  private obstacles!: ObstacleManager;
  private collision!: CollisionSystem;
  private scoreManager!: ScoreManager;
  private difficulty!: DifficultyManager;
  private particles!: ParticleSystem;
  readonly eventBus = new EventBus();

  // State
  private distance = 0;
  private playerMesh!: THREE.Group;
  private playerName = 'Player';
  private gameOver = false;

  // Callback
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
    // Clear previous game objects
    const toRemove: THREE.Object3D[] = [];
    this.scene.traverse((obj) => {
      if (obj.userData['gameObject']) toRemove.push(obj);
    });
    toRemove.forEach((obj) => this.scene.remove(obj));

    // Reset state
    this.distance = 0;
    this.gameOver = false;
    this.eventBus.clear();

    // Player mesh
    this.playerMesh = createBucket();
    this.playerMesh.userData['gameObject'] = true;
    this.scene.add(this.playerMesh);

    // Input
    const canvas = document.getElementById('gameCanvas')!;
    this.input = new InputManager(canvas);

    // Systems
    this.player = new PlayerController(this.playerMesh, this.input);
    this.cameraCtrl = new CameraController(this.camera, this.playerMesh);
    this.world = new WorldGenerator(this.scene, this.quality);
    this.collectibles = new CollectibleManager(this.scene);
    this.obstacles = new ObstacleManager(this.scene);
    this.scoreManager = new ScoreManager(this.eventBus);
    this.difficulty = new DifficultyManager(this.eventBus, this.obstacles);
    this.collision = new CollisionSystem(
      this.player,
      this.collectibles,
      this.obstacles,
      this.eventBus,
    );
    this.particles = new ParticleSystem(this.scene);

    // Event listeners
    this.eventBus.on('SAWIT_CAUGHT', ({ position }) => {
      this.particles.burst(position.x, position.y, position.z);
    });

    this.eventBus.on('SCORE_CHANGED', ({ score, highScore }) => {
      document.getElementById('hudScore')!.textContent = String(score);
      document.getElementById('hudHighScore')!.textContent = String(highScore);
    });

    this.eventBus.on('OBSTACLE_HIT', () => {
      if (this.gameOver) return;
      this.gameOver = true;
      this.cameraCtrl.shake(0.8, 0.4);
      // Delay game over to show shake
      setTimeout(() => {
        this.onGameOver(
          this.scoreManager.getScore(),
          this.distance,
        );
      }, 500);
    });

    this.eventBus.on('SPEED_MILESTONE', () => {
      // Brief camera shake on milestone
      this.cameraCtrl.shake(0.2, 0.15);
    });

    // UI
    document.getElementById('hud')?.classList.remove('hidden');
    document.getElementById('hudPlayerName')!.textContent = this.playerName;
    document.getElementById('hudScore')!.textContent = '0';
    document.getElementById('hudHighScore')!.textContent =
      String(this.scoreManager.getHighScore());

    if (isMobile()) {
      document.getElementById('mobileControls')?.classList.remove('hidden');
    }

    this.cameraCtrl.snapToTarget();
  }

  update(dt: number): void {
    if (this.gameOver) {
      // Still update camera for shake effect and particles
      this.cameraCtrl.update(dt);
      this.particles.update(dt);
      return;
    }

    const speed = this.difficulty.getSpeed();

    // 1. Input
    this.input.update();

    // 2. Player
    this.player.update(dt);

    // 3. World
    this.world.update(dt, speed, this.playerMesh.position.z);

    // 4. Collectibles
    this.collectibles.update(dt, speed, this.playerMesh.position.z);

    // 5. Obstacles
    this.obstacles.update(dt, speed, this.playerMesh.position.z);

    // 6. Collision
    this.collision.update();

    // 7. Distance
    this.distance += speed * dt;

    // 8. Particles
    this.particles.update(dt);

    // 9. Camera
    this.cameraCtrl.update(dt);
  }

  exit(): void {
    document.getElementById('hud')?.classList.add('hidden');
    document.getElementById('mobileControls')?.classList.add('hidden');
    this.input?.dispose();
    this.world?.dispose();
    this.collectibles?.dispose();
    this.obstacles?.dispose();
    this.particles?.dispose();
    this.eventBus.clear();
  }
}
