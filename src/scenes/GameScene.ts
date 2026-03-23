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
import { BiomeManager } from '../systems/BiomeManager.ts';
import { MissionManager } from '../systems/MissionManager.ts';
import { GoblinManager } from '../systems/GoblinManager.ts';
import { BossBattle } from '../systems/BossBattle.ts';
import { TurnBattle } from '../systems/TurnBattle.ts';
import type { CoinManager } from '../systems/CoinManager.ts';
import type { UpgradeManager } from '../systems/UpgradeManager.ts';
import { SHIELD_DURATION, MAGNET_RANGE, SKY_COLOR, FOG_COLOR, BOSS_TRIGGER_DISTANCE } from '../core/Constants.ts';
import { resetBiomeColors } from '../rendering/MaterialLibrary.ts';
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
  private biome!: BiomeManager;
  private missions!: MissionManager;
  private coins!: CoinManager;
  private goblins!: GoblinManager;
  private bossBattle!: BossBattle;
  private turnBattle!: TurnBattle;

  // State
  private distance = 0;
  private nextBossDistance = BOSS_TRIGGER_DISTANCE;
  private inBossFight = false;
  private bossEncounter = 0;
  private playerMesh!: THREE.Group;
  private playerName = 'Player';
  private gameOver = false;
  private paused = false;
  private extraLives = 0;
  private invincibleTimer = 0;
  private pauseKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private resumeHandler: (() => void) | null = null;

  // Cached DOM
  private hudScore!: HTMLElement;
  private hudHighScore!: HTMLElement;
  private hudDistance!: HTMLElement;
  private missionSlots: { el: HTMLElement; text: HTMLElement; prog: HTMLElement }[] = [];
  private missionPanelDirty = false;

  private workerAnimator: WorkerAnimator | null = null;
  private onGameOver: (score: number, distance: number) => void;
  private upgradeManager: UpgradeManager;
  private globalCoins: CoinManager;
  private globalEventBus: EventBus;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    quality: QualityTier,
    audio: AudioManager,
    upgradeManager: UpgradeManager,
    globalCoins: CoinManager,
    globalEventBus: EventBus,
    onGameOver: (score: number, distance: number) => void,
  ) {
    this.scene = scene;
    this.camera = camera;
    this.quality = quality;
    this.audio = audio;
    this.upgradeManager = upgradeManager;
    this.globalCoins = globalCoins;
    this.globalEventBus = globalEventBus;
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

    // Fresh state — reset biome colors to Plantation
    resetBiomeColors();
    const bg = this.scene.background as any;
    if (bg?.isColor) bg.set(SKY_COLOR);
    if (this.scene.fog && 'color' in this.scene.fog) {
      (this.scene.fog as any).color.set(FOG_COLOR);
    }

    this.distance = 0;
    this.gameOver = false;
    this.paused = false;
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
      this.scoreManager, this.difficulty,
    );
    this.biome = new BiomeManager(this.scene, this.eventBus, this.world);
    this.goblins = new GoblinManager(this.scene, this.eventBus);
    this.bossBattle = new BossBattle(this.scene, this.eventBus);
    this.turnBattle = new TurnBattle(this.eventBus);
    this.nextBossDistance = BOSS_TRIGGER_DISTANCE;
    this.inBossFight = false;
    this.bossEncounter = 0;

    // Missions & coins — reuse global coin manager, rebind to game event bus
    this.coins = this.globalCoins;
    this.coins.setEventBus(this.eventBus);
    this.coins.setMultiplier(1 + this.upgradeManager.getEffectValue('coinMultiplier'));
    this.missions = new MissionManager(this.eventBus, this.coins);

    // Apply upgrades then consume (single-use per run)
    this.powerUps.setShieldDuration(SHIELD_DURATION + this.upgradeManager.getEffectValue('shieldDuration'));
    this.powerUps.setMagnetRange(MAGNET_RANGE * (1 + this.upgradeManager.getEffectValue('magnetRange')));
    this.scoreManager.setStartingScore(this.upgradeManager.getEffectValue('startingScore'));
    this.extraLives = this.upgradeManager.getEffectValue('extraLife');
    this.invincibleTimer = 0;
    this.upgradeManager.consumeAll();

    // --- Event wiring ---

    this.eventBus.on('SAWIT_CAUGHT', ({ points, position }) => {
      this.particles.burst(position.x, position.y, position.z, 15, points > 10);
      this.audio.play('catch');
      this.showScorePopup(points);
    });

    this.eventBus.on('NEAR_MISS', ({ points }) => {
      this.cameraCtrl.shake(0.15, 0.1);
      this.showScorePopup(points, 'CLOSE!');
    });

    this.eventBus.on('POWERUP_COLLECTED', () => {
      this.audio.play('powerup');
    });

    this.eventBus.on('SCORE_CHANGED', ({ score, highScore }) => {
      this.hudScore.textContent = String(score);
      this.hudHighScore.textContent = String(highScore);
    });

    this.eventBus.on('BIOME_ENTERED', ({ biome }) => {
      this.showBiomeToast(biome);
    });

    this.eventBus.on('SPEED_MILESTONE', () => {
      // Defer shake + audio to next frame to avoid stacking with score/mission/obstacle work
      requestAnimationFrame(() => {
        this.cameraCtrl.shake(0.2, 0.15);
        this.audio.play('milestone');
      });
    });

    this.eventBus.on('OBSTACLE_HIT', ({ type }) => {
      if (this.gameOver) return;

      // Turn battle loss is always fatal (HP already tracked in battle)
      const isBattleLoss = type === 'boss_battle';

      if (!isBattleLoss && this.invincibleTimer > 0) return; // still invincible from extra life

      // Extra life: survive one hit (not during turn battle)
      if (!isBattleLoss && this.extraLives > 0) {
        this.extraLives--;
        this.invincibleTimer = 2; // 2s invincibility
        this.cameraCtrl.shake(0.4, 0.2);
        this.audio.play('powerup');
        return;
      }

      this.gameOver = true;

      // Clean up boss fight / turn battle state if dying
      if (this.turnBattle.isActive()) {
        this.turnBattle.dispose();
      }
      if (this.inBossFight) {
        this.inBossFight = false;
        this.obstacles.setSpawnPaused(false);
        this.collision.setSkipObstacles(false);
        this.bossBattle.dispose();
      }
      this.paused = false;

      this.missions.onRunEnd();
      this.missions.saveTotalDistance(this.distance);
      this.coins.flush();
      this.workerAnimator?.startDeath();
      this.audio.stopAllSfx();
      this.audio.stopMusic();
      this.audio.play('death');
      this.cameraCtrl.shake(0.8, 0.5);
      setTimeout(() => {
        this.onGameOver(this.scoreManager.getScore(), this.distance);
      }, 1200);
    });

    this.eventBus.on('MISSION_COMPLETED', ({ missionId, coinReward }) => {
      this.showMissionToast(coinReward);
    });

    this.eventBus.on('MISSION_PROGRESS', () => {
      this.missionPanelDirty = true;
    });

    this.eventBus.on('BOSS_DODGE_SURVIVED', () => {
      this.paused = true;
      this.turnBattle.start(this.bossEncounter);
      this.bossEncounter++;
    });

    this.eventBus.on('BOSS_WON', ({ bonus }) => {
      this.paused = false;
      this.inBossFight = false;
      this.obstacles.setSpawnPaused(false);
      this.collision.setSkipObstacles(false);
      this.scoreManager.addScore(bonus);
      this.nextBossDistance = this.distance + BOSS_TRIGGER_DISTANCE;
      this.showBiomeToast('SELAMAT! Anda sekarang KOMISARIS! +500');
    });

    // UI — cache DOM refs
    document.getElementById('hud')?.classList.remove('hidden');
    document.getElementById('hudPlayerName')!.textContent = this.playerName;
    this.hudScore = document.getElementById('hudScore')!;
    this.hudHighScore = document.getElementById('hudHighScore')!;
    this.hudDistance = document.getElementById('hudDistance')!;
    this.hudScore.textContent = '0';
    this.hudHighScore.textContent = String(this.scoreManager.getHighScore());

    document.getElementById('missionPanel')?.classList.remove('hidden');

    // Cache mission slot DOM elements (avoid innerHTML on every update)
    this.missionSlots = [];
    for (let i = 0; i < 3; i++) {
      const el = document.getElementById(`mission${i}`);
      if (!el) continue;
      // Create persistent child elements
      let text = el.querySelector('.mission-text') as HTMLElement | null;
      let prog = el.querySelector('.mission-prog') as HTMLElement | null;
      if (!text) {
        text = document.createElement('span');
        text.className = 'mission-text';
        el.appendChild(text);
      }
      if (!prog) {
        prog = document.createElement('span');
        prog.className = 'mission-prog';
        el.appendChild(prog);
      }
      this.missionSlots.push({ el, text, prog });
    }
    this.updateMissionPanel();

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
    if (this.turnBattle?.isActive()) return;
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

    // Turn battle updates even while paused (it's a DOM overlay)
    this.turnBattle.update(dt);

    if (this.paused) return;

    const speed = this.difficulty.getSpeed();

    // System update order
    this.input.update();
    this.player.update(dt);
    this.world.update(dt, speed, this.playerMesh.position.z);

    // Collectibles always active (player can grab sawit during boss fight)
    this.collectibles.update(dt, speed, this.playerMesh.position.z);

    // Obstacles & goblins always move with the world (so they don't freeze in place)
    this.obstacles.update(dt, speed, this.playerMesh.position.z);
    this.goblins.update(dt, speed, this.playerMesh.position.z, this.playerMesh.position.x);

    // Powerups always tick (shield visual, timers, magnet pull must work during boss too)
    this.powerUps.update(dt);
    this.collision.update(dt);

    if (this.inBossFight) {
      // During boss fight: boss spawns MBGs, no new obstacles spawn (existing ones just scroll past)
      const hit = this.bossBattle.update(
        dt,
        speed,
        this.playerMesh.position.x,
        this.playerMesh.position.z,
        this.player.jumpHeight,
      );
      if (hit) {
        // Shield absorbs MBG hit (same as normal obstacles)
        if (this.collision.isShielded()) {
          this.collision.setShielded(false);
          this.eventBus.emit('POWERUP_EXPIRED', { type: 'shield' });
        } else {
          this.eventBus.emit('OBSTACLE_HIT', { type: 'boss' });
        }
      }
    } else {
      // Goblin collision (separate from lane-based obstacles)
      if (this.invincibleTimer <= 0 && this.goblins.checkCollision(
        this.playerMesh.position.x,
        this.playerMesh.position.z,
        this.player.jumpHeight,
      )) {
        this.eventBus.emit('OBSTACLE_HIT', { type: 'goblin' });
      }
    }

    this.distance += speed * dt;

    // Boss fight trigger
    if (!this.inBossFight && this.distance >= this.nextBossDistance) {
      this.inBossFight = true;
      this.obstacles.setSpawnPaused(true);
      this.collision.setSkipObstacles(true);
      this.bossBattle.start(this.playerMesh.position.z);
      this.showBiomeToast('SAWITO WOWOWITO THROW MBG!');
      this.cameraCtrl.shake(0.3, 0.2);
    }

    this.biome.update(dt, this.distance);
    this.missions.updateDistance(this.distance);
    this.missions.update(dt);
    if (this.missionPanelDirty) this.updateMissionPanel();
    this.particles.update(dt, speed, this.playerMesh.position.x, this.playerMesh.position.z);
    this.cameraCtrl.update(dt);

    // Invincibility countdown
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
      // Flash player mesh to indicate invincibility
      this.playerMesh.visible = Math.floor(this.invincibleTimer * 10) % 2 === 0;
    } else {
      this.playerMesh.visible = true;
    }

    // Update distance display
    this.hudDistance.textContent = `${Math.floor(this.distance)}m`;
  }

  private showScorePopup(points: number, label?: string): void {
    const container = document.getElementById('scorePopups');
    if (!container) return;

    const el = document.createElement('div');
    el.className = points > 10 ? 'score-popup golden' : 'score-popup';
    el.textContent = label ? `${label} +${points}` : `+${points}`;

    // Position near center of screen
    el.style.left = `${45 + Math.random() * 10}%`;
    el.style.top = `${35 + Math.random() * 10}%`;

    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }


  private showBiomeToast(biome: string): void {
    const container = document.getElementById('missionToasts');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'mission-toast biome-toast';
    el.textContent = biome;
    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  private showMissionToast(coinReward: number): void {
    const container = document.getElementById('missionToasts');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'mission-toast';
    el.textContent = `Mission Complete! +${coinReward} coins`;
    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  private updateMissionPanel(): void {
    const missions = this.missions.getActive();
    for (let i = 0; i < this.missionSlots.length; i++) {
      const slot = this.missionSlots[i]!;
      const m = missions[i];
      if (m) {
        slot.el.classList.remove('hidden');
        slot.text.textContent = m.description;
        slot.prog.textContent = `${Math.floor(m.progress)}/${m.target}`;
      } else {
        slot.el.classList.add('hidden');
      }
    }
    this.missionPanelDirty = false;
  }

  exit(): void {
    document.getElementById('hud')?.classList.add('hidden');
    document.getElementById('mobileControls')?.classList.add('hidden');
    document.getElementById('powerupIndicator')?.classList.add('hidden');
    document.getElementById('missionPanel')?.classList.add('hidden');
    document.getElementById('gameCanvas')?.classList.remove('slow-mo');
    this.input?.dispose();
    this.world?.dispose();
    this.collectibles?.dispose();
    this.obstacles?.dispose();
    this.particles?.dispose();
    this.powerUps?.dispose();
    this.goblins?.dispose();
    this.bossBattle?.dispose();
    this.turnBattle?.dispose();
    // Restore global eventBus on coins so shop/menu events work correctly
    this.globalCoins.setEventBus(this.globalEventBus);
    this.eventBus?.clear();
    const popups = document.getElementById('scorePopups');
    if (popups) popups.innerHTML = '';
    const toasts = document.getElementById('missionToasts');
    if (toasts) toasts.innerHTML = '';
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
