import * as THREE from 'three';
import type { EventBus } from '../core/EventBus.ts';
import type { PlayerController } from './PlayerController.ts';
import type { CollisionSystem } from './CollisionSystem.ts';
import type { CollectibleManager } from './CollectibleManager.ts';
import { SHIELD_DURATION, MAGNET_DURATION, BIG_BUCKET_DURATION, MAGNET_RANGE } from '../core/Constants.ts';
import { getMaterials } from '../rendering/MaterialLibrary.ts';

export type PowerUpType = 'shield' | 'magnet' | 'bigBucket';

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
  private scene: THREE.Scene;

  private active: ActivePowerUp | null = null;
  private shieldMesh: THREE.Mesh | null = null;

  constructor(
    eventBus: EventBus,
    player: PlayerController,
    collision: CollisionSystem,
    collectibles: CollectibleManager,
    scene: THREE.Scene,
  ) {
    this.eventBus = eventBus;
    this.player = player;
    this.collision = collision;
    this.collectibles = collectibles;
    this.scene = scene;

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
        if (dist < MAGNET_RANGE && dist > 0.2) {
          const strength = MAGNET_PULL_SPEED * dt * (1 - dist / MAGNET_RANGE);
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
        duration = SHIELD_DURATION;
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
    }

    this.active = null;
    document.getElementById('powerupIndicator')?.classList.add('hidden');
  }

  private showShieldVisual(): void {
    if (this.shieldMesh) return;
    const geo = new THREE.SphereGeometry(1.2, 12, 8);
    const mat = getMaterials().shield;
    this.shieldMesh = new THREE.Mesh(geo, mat);
    this.shieldMesh.userData['gameObject'] = true;
    this.scene.add(this.shieldMesh);
  }

  private hideShieldVisual(): void {
    if (!this.shieldMesh) return;
    this.scene.remove(this.shieldMesh);
    this.shieldMesh.geometry.dispose();
    this.shieldMesh = null;
  }

  dispose(): void {
    this.deactivate();
    this.hideShieldVisual();
  }
}
