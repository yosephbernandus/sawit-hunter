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
import { PowerUpSystem } from '../systems/PowerUpSystem.ts';
import { EventBus } from '../core/EventBus.ts';
import type { AudioManager } from '../audio/AudioManager.ts';
import { createBucket } from '../rendering/ModelFactory.ts';
import { BASE_SPEED } from '../core/Constants.ts';
import { isMobile } from '../utils/DeviceDetect.ts';
import type { QualityTier } from '../utils/DeviceDetect.ts';

export class GameScene implements IGameScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private quality: QualityTier;
  private audio: AudioManager;

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
  private powerUps!: PowerUpSystem;
  private eventBus!: EventBus;

  // State
  private distance = 0;
  private playerMesh!: THREE.Group;
  private playerName = 'Player';
  private gameOver = false;

  private onGameOver: (score: number, distance: number) => void;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    quality: QualityTier,
    audio: AudioManager,
    onGameOver: (score: number, distance: number) => void,
  ) {
    this.scene = scene;
    this.camera = camera;
    this.quality = quality;
    this.audio = audio;
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

    // Fresh state
    this.distance = 0;
    this.gameOver = false;
    this.eventBus = new EventBus();

    // Player
    this.playerMesh = createBucket();
    this.playerMesh.userData['gameObject'] = true;
    this.scene.add(this.playerMesh);

    // Input
    const canvas = document.getElementById('gameCanvas')!;
    this.input = new InputManager(canvas);

    // Core systems
    this.player = new PlayerController(this.playerMesh, this.input);
    this.cameraCtrl = new CameraController(this.camera, this.playerMesh);
    this.world = new WorldGenerator(this.scene, this.quality);
    this.collectibles = new CollectibleManager(this.scene);
    this.obstacles = new ObstacleManager(this.scene);
    this.scoreManager = new ScoreManager(this.eventBus);
    this.difficulty = new DifficultyManager(this.eventBus, this.obstacles);
    this.collision = new CollisionSystem(
      this.player, this.collectibles, this.obstacles, this.eventBus,
    );
    this.particles = new ParticleSystem(this.scene);
    this.powerUps = new PowerUpSystem(
      this.eventBus, this.player, this.collision, this.collectibles, this.scene,
    );

    // --- Event wiring ---

    this.eventBus.on('SAWIT_CAUGHT', ({ position }) => {
      this.particles.burst(position.x, position.y, position.z);
      this.audio.play('catch');
    });

    this.eventBus.on('POWERUP_COLLECTED', () => {
      this.audio.play('powerup');
    });

    this.eventBus.on('SCORE_CHANGED', ({ score, highScore }) => {
      document.getElementById('hudScore')!.textContent = String(score);
      document.getElementById('hudHighScore')!.textContent = String(highScore);
    });

    this.eventBus.on('SPEED_MILESTONE', () => {
      this.cameraCtrl.shake(0.2, 0.15);
      this.audio.play('milestone');
    });

    this.eventBus.on('OBSTACLE_HIT', () => {
      if (this.gameOver) return;
      this.gameOver = true;
      this.audio.play('death');
      this.audio.stopMusic();
      this.cameraCtrl.shake(0.8, 0.4);
      setTimeout(() => {
        this.onGameOver(this.scoreManager.getScore(), this.distance);
      }, 600);
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

    // Stop menu music (gameplay has no BGM for now, keeps it tense)
    this.audio.stopMusic();
  }

  update(dt: number): void {
    if (this.gameOver) {
      this.cameraCtrl.update(dt);
      this.particles.update(dt);
      return;
    }

    const speed = this.difficulty.getSpeed();

    // System update order
    this.input.update();
    this.player.update(dt);
    this.world.update(dt, speed, this.playerMesh.position.z);
    this.collectibles.update(dt, speed, this.playerMesh.position.z);
    this.obstacles.update(dt, speed, this.playerMesh.position.z);
    this.powerUps.update(dt);
    this.collision.update();
    this.distance += speed * dt;
    this.particles.update(dt);
    this.cameraCtrl.update(dt);
  }

  exit(): void {
    document.getElementById('hud')?.classList.add('hidden');
    document.getElementById('mobileControls')?.classList.add('hidden');
    document.getElementById('powerupIndicator')?.classList.add('hidden');
    this.input?.dispose();
    this.world?.dispose();
    this.collectibles?.dispose();
    this.obstacles?.dispose();
    this.particles?.dispose();
    this.powerUps?.dispose();
    this.eventBus?.clear();
  }
}
