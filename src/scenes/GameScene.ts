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
import { createWorker } from '../rendering/ModelFactory.ts';
import { WorkerAnimator } from '../systems/WorkerAnimator.ts';
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
  private paused = false;
  private pauseKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private resumeHandler: (() => void) | null = null;

  // Cached DOM
  private hudScore!: HTMLElement;
  private hudHighScore!: HTMLElement;
  private hudDistance!: HTMLElement;

  private workerAnimator: WorkerAnimator | null = null;
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
    const { group: workerGroup, refs: workerRefs } = createWorker();
    this.playerMesh = workerGroup;
    this.playerMesh.userData['gameObject'] = true;
    this.scene.add(this.playerMesh);

    // Input
    const canvas = document.getElementById('gameCanvas')!;
    this.input = new InputManager(canvas);

    // Core systems
    this.workerAnimator = new WorkerAnimator(workerRefs);
    this.player = new PlayerController(this.playerMesh, this.input, this.workerAnimator);
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

    this.eventBus.on('SAWIT_CAUGHT', ({ points, position }) => {
      this.particles.burst(position.x, position.y, position.z, 15, points > 10);
      this.audio.play('catch');
      this.showScorePopup(points);
    });

    this.eventBus.on('POWERUP_COLLECTED', () => {
      this.audio.play('powerup');
    });

    this.eventBus.on('SCORE_CHANGED', ({ score, highScore }) => {
      this.hudScore.textContent = String(score);
      this.hudHighScore.textContent = String(highScore);
    });

    this.eventBus.on('SPEED_MILESTONE', () => {
      this.cameraCtrl.shake(0.2, 0.15);
      this.audio.play('milestone');
    });

    this.eventBus.on('OBSTACLE_HIT', () => {
      if (this.gameOver) return;
      this.gameOver = true;
      this.workerAnimator?.startDeath();
      this.audio.stopAllSfx();
      this.audio.stopMusic();
      this.audio.play('death');
      this.cameraCtrl.shake(0.8, 0.5);
      setTimeout(() => {
        this.onGameOver(this.scoreManager.getScore(), this.distance);
      }, 1200); // extra time for death animation to play out
    });

    // UI — cache DOM refs
    document.getElementById('hud')?.classList.remove('hidden');
    document.getElementById('hudPlayerName')!.textContent = this.playerName;
    this.hudScore = document.getElementById('hudScore')!;
    this.hudHighScore = document.getElementById('hudHighScore')!;
    this.hudDistance = document.getElementById('hudDistance')!;
    this.hudScore.textContent = '0';
    this.hudHighScore.textContent = String(this.scoreManager.getHighScore());

    if (isMobile()) {
      document.getElementById('mobileControls')?.classList.remove('hidden');
    }

    this.cameraCtrl.snapToTarget();

    // Stop menu music
    this.audio.stopMusic();

    // Pause handler
    this.pauseKeyHandler = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && !this.gameOver) {
        this.togglePause();
      }
    };
    document.addEventListener('keydown', this.pauseKeyHandler);

    // Bind resume button — remove old listener first to prevent stacking
    const resumeBtn = document.getElementById('resumeBtn');
    if (resumeBtn) {
      this.resumeHandler = () => { if (this.paused) this.togglePause(); };
      resumeBtn.addEventListener('click', this.resumeHandler);
    }
  }

  private togglePause(): void {
    this.paused = !this.paused;
    const overlay = document.getElementById('pauseOverlay');
    if (this.paused) {
      overlay?.classList.remove('hidden');
    } else {
      overlay?.classList.add('hidden');
    }
  }

  update(dt: number): void {
    if (this.gameOver) {
      this.workerAnimator?.update(dt, this.playerMesh.position.x, this.playerMesh.position.x, false, false, 0);
      this.cameraCtrl.update(dt);
      this.particles.update(dt);
      return;
    }

    if (this.paused) return;

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
    this.particles.update(dt, speed, this.playerMesh.position.x, this.playerMesh.position.z);
    this.cameraCtrl.update(dt);

    // Update distance display
    this.hudDistance.textContent = `${Math.floor(this.distance)}m`;
  }

  private showScorePopup(points: number): void {
    const container = document.getElementById('scorePopups');
    if (!container) return;

    const el = document.createElement('div');
    el.className = points > 10 ? 'score-popup golden' : 'score-popup';
    el.textContent = `+${points}`;

    // Position near center of screen
    el.style.left = `${45 + Math.random() * 10}%`;
    el.style.top = `${35 + Math.random() * 10}%`;

    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
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
    const popups = document.getElementById('scorePopups');
    if (popups) popups.innerHTML = '';
    document.getElementById('pauseOverlay')?.classList.add('hidden');
    if (this.pauseKeyHandler) {
      document.removeEventListener('keydown', this.pauseKeyHandler);
      this.pauseKeyHandler = null;
    }
    if (this.resumeHandler) {
      document.getElementById('resumeBtn')?.removeEventListener('click', this.resumeHandler);
      this.resumeHandler = null;
    }
  }
}
