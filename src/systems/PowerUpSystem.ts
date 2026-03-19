import * as THREE from 'three';
import type { EventBus } from '../core/EventBus.ts';
import type { PlayerController } from './PlayerController.ts';
import type { CollisionSystem } from './CollisionSystem.ts';
import type { CollectibleManager } from './CollectibleManager.ts';
import type { ScoreManager } from './ScoreManager.ts';
import type { DifficultyManager } from './DifficultyManager.ts';
import {
  SHIELD_DURATION,
  MAGNET_DURATION,
  BIG_BUCKET_DURATION,
  MAGNET_RANGE,
  DOUBLE_SCORE_DURATION,
  DOUBLE_SCORE_MULTIPLIER,
  SLOW_MO_DURATION,
  SLOW_MO_FACTOR,
} from '../core/Constants.ts';
import { getMaterials } from '../rendering/MaterialLibrary.ts';
import { getGeos } from '../rendering/ModelFactory.ts';

export type PowerUpType = 'shield' | 'magnet' | 'bigBucket' | 'doubleScore' | 'slowMo';

interface ActivePowerUp {
  type: PowerUpType;
  timer: number;
}

const MAGNET_PULL_SPEED = 15;
const BIG_BUCKET_MULTIPLIER = 2.0;

export class PowerUpSystem {
  private eventBus: EventBus;
  private player: PlayerController;
  private collision: CollisionSystem;
  private collectibles: CollectibleManager;
  private scoreManager: ScoreManager;
  private difficulty: DifficultyManager;
  private scene: THREE.Scene;

  private active: ActivePowerUp | null = null;
  private shieldMesh: THREE.Mesh | null = null;
  private shieldDur = SHIELD_DURATION;
  private magnetRng = MAGNET_RANGE;

  constructor(
    eventBus: EventBus,
    player: PlayerController,
    collision: CollisionSystem,
    collectibles: CollectibleManager,
    scene: THREE.Scene,
    scoreManager: ScoreManager,
    difficulty: DifficultyManager,
  ) {
    this.eventBus = eventBus;
    this.player = player;
    this.collision = collision;
    this.collectibles = collectibles;
    this.scene = scene;
    this.scoreManager = scoreManager;
    this.difficulty = difficulty;

    this.eventBus.on('POWERUP_COLLECTED', ({ type }) => {
      this.activate(type as PowerUpType);
    });

    // Shield broken by obstacle hit
    this.eventBus.on('POWERUP_EXPIRED', ({ type }) => {
      if (this.active?.type === type) {
        this.deactivate();
      }
    });
  }

  setShieldDuration(d: number): void { this.shieldDur = d; }
  setMagnetRange(r: number): void { this.magnetRng = r; }

  update(dt: number): void {
    if (!this.active) return;

    this.active.timer -= dt;
    if (this.active.timer <= 0) {
      const type = this.active.type;
      this.deactivate();
      this.eventBus.emit('POWERUP_EXPIRED', { type });
      return;
    }

    // HUD timer
    const timerEl = document.getElementById('powerupTimer');
    if (timerEl) timerEl.textContent = `${Math.ceil(this.active.timer)}s`;

    // Magnet: pull collectibles toward player
    if (this.active.type === 'magnet') {
      const px = this.player.mesh.position.x;
      const pz = this.player.mesh.position.z;
      for (const c of this.collectibles.getActive()) {
        const dx = px - c.mesh.position.x;
        const dz = pz - c.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < this.magnetRng && dist > 0.2) {
          const strength = MAGNET_PULL_SPEED * dt * (1 - dist / this.magnetRng);
          c.mesh.position.x += (dx / dist) * strength;
          c.mesh.position.z += (dz / dist) * strength;
        }
      }
    }

    // Shield visual follows player
    if (this.shieldMesh) {
      this.shieldMesh.position.copy(this.player.mesh.position);
      this.shieldMesh.position.y += 0.5;
      this.shieldMesh.rotation.y += dt * 1.5;
    }
  }

  private activate(type: PowerUpType): void {
    // Deactivate current
    if (this.active) this.deactivate();

    let duration: number;
    switch (type) {
      case 'shield':
        duration = this.shieldDur;
        this.collision.setShielded(true);
        this.showShieldVisual();
        break;
      case 'magnet':
        duration = MAGNET_DURATION;
        break;
      case 'bigBucket':
        duration = BIG_BUCKET_DURATION;
        this.player.mesh.scale.x = 1.5;
        this.player.mesh.scale.z = 1.5;
        this.collision.setCollectXMultiplier(BIG_BUCKET_MULTIPLIER);
        break;
      case 'doubleScore':
        duration = DOUBLE_SCORE_DURATION;
        this.scoreManager.setScoreMultiplier(DOUBLE_SCORE_MULTIPLIER);
        break;
      case 'slowMo':
        duration = SLOW_MO_DURATION;
        this.difficulty.setSpeedMultiplier(SLOW_MO_FACTOR);
        document.getElementById('gameCanvas')?.classList.add('slow-mo');
        break;
    }

    this.active = { type, timer: duration };

    // HUD
    const indicator = document.getElementById('powerupIndicator');
    const icon = document.getElementById('powerupIcon');
    if (indicator && icon) {
      indicator.classList.remove('hidden');
      switch (type) {
        case 'shield': icon.textContent = 'SHIELD'; break;
        case 'magnet': icon.textContent = 'MAGNET'; break;
        case 'bigBucket': icon.textContent = 'BIG BUCKET'; break;
        case 'doubleScore': icon.textContent = '2X SCORE'; break;
        case 'slowMo': icon.textContent = 'SLOW MO'; break;
      }
    }

    this.eventBus.emit('POWERUP_ACTIVATED', { type, duration });
  }

  private deactivate(): void {
    if (!this.active) return;

    switch (this.active.type) {
      case 'shield':
        this.collision.setShielded(false);
        this.hideShieldVisual();
        break;
      case 'bigBucket':
        this.player.mesh.scale.x = 1;
        this.player.mesh.scale.z = 1;
        this.collision.setCollectXMultiplier(1);
        break;
      case 'doubleScore':
        this.scoreManager.setScoreMultiplier(1);
        break;
      case 'slowMo':
        this.difficulty.setSpeedMultiplier(1);
        document.getElementById('gameCanvas')?.classList.remove('slow-mo');
        break;
    }

    this.active = null;
    document.getElementById('powerupIndicator')?.classList.add('hidden');
  }

  private showShieldVisual(): void {
    if (this.shieldMesh) return;
    const mat = getMaterials().shield;
    this.shieldMesh = new THREE.Mesh(getGeos().shield, mat);
    this.shieldMesh.userData['gameObject'] = true;
    this.scene.add(this.shieldMesh);
  }

  private hideShieldVisual(): void {
    if (!this.shieldMesh) return;
    this.scene.remove(this.shieldMesh);
    this.shieldMesh = null;
  }

  dispose(): void {
    this.deactivate();
    this.hideShieldVisual();
  }
}
