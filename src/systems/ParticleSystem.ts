import * as THREE from 'three';
import { BASE_SPEED, MAX_SPEED } from '../core/Constants.ts';

// Burst particles
const MAX_BURST = 200;
const BURST_LIFETIME = 0.8;
const GRAVITY = -15;

// Speed lines
const MAX_LINES = 60;
const LINE_LIFETIME = 0.4;
const SPEED_LINE_THRESHOLD = 14; // speed above which lines appear

interface BurstParticle {
  alive: boolean;
  life: number;
  vx: number;
  vy: number;
  vz: number;
}

interface SpeedLine {
  alive: boolean;
  life: number;
  speed: number;
}

export class ParticleSystem {
  // Burst effect
  private burstPoints: THREE.Points;
  private burstPos: Float32Array;
  private burstCol: Float32Array;
  private burstParticles: BurstParticle[] = [];
  private burstGeo: THREE.BufferGeometry;

  // Speed lines
  private linePoints: THREE.Points;
  private linePos: Float32Array;
  private lineCol: Float32Array;
  private lines: SpeedLine[] = [];
  private lineGeo: THREE.BufferGeometry;
  private lineSpawnTimer = 0;

  constructor(scene: THREE.Scene) {
    // --- Burst particles ---
    this.burstGeo = new THREE.BufferGeometry();
    this.burstPos = new Float32Array(MAX_BURST * 3);
    this.burstCol = new Float32Array(MAX_BURST * 4);
    this.burstGeo.setAttribute('position', new THREE.BufferAttribute(this.burstPos, 3));
    this.burstGeo.setAttribute('color', new THREE.BufferAttribute(this.burstCol, 4));

    this.burstPoints = new THREE.Points(this.burstGeo, new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    this.burstPoints.frustumCulled = false;
    scene.add(this.burstPoints);

    for (let i = 0; i < MAX_BURST; i++) {
      this.burstParticles.push({ alive: false, life: 0, vx: 0, vy: 0, vz: 0 });
    }

    // --- Speed lines ---
    this.lineGeo = new THREE.BufferGeometry();
    this.linePos = new Float32Array(MAX_LINES * 3);
    this.lineCol = new Float32Array(MAX_LINES * 4);
    this.lineGeo.setAttribute('position', new THREE.BufferAttribute(this.linePos, 3));
    this.lineGeo.setAttribute('color', new THREE.BufferAttribute(this.lineCol, 4));

    this.linePoints = new THREE.Points(this.lineGeo, new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    this.linePoints.frustumCulled = false;
    scene.add(this.linePoints);

    for (let i = 0; i < MAX_LINES; i++) {
      this.lines.push({ alive: false, life: 0, speed: 0 });
    }
  }

  burst(x: number, y: number, z: number, count = 15, golden = false): void {
    let spawned = 0;
    for (let i = 0; i < this.burstParticles.length; i++) {
      if (spawned >= count) break;
      const p = this.burstParticles[i]!;
      if (p.alive) continue;

      p.alive = true;
      p.life = BURST_LIFETIME;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      p.vx = Math.cos(angle) * speed;
      p.vy = 3 + Math.random() * 5;
      p.vz = Math.sin(angle) * speed;

      this.burstPos[i * 3] = x;
      this.burstPos[i * 3 + 1] = y;
      this.burstPos[i * 3 + 2] = z;

      if (golden) {
        this.burstCol[i * 4] = 1.0;
        this.burstCol[i * 4 + 1] = 0.85;
        this.burstCol[i * 4 + 2] = 0.0;
      } else {
        this.burstCol[i * 4] = 0.3 + Math.random() * 0.7;
        this.burstCol[i * 4 + 1] = 0.5 + Math.random() * 0.3;
        this.burstCol[i * 4 + 2] = 0.1;
      }
      this.burstCol[i * 4 + 3] = 1.0;

      spawned++;
    }
  }

  update(dt: number, speed = 0, playerX = 0, playerZ = 0): void {
    this.updateBurst(dt);
    this.updateSpeedLines(dt, speed, playerX, playerZ);
  }

  private updateBurst(dt: number): void {
    let dirty = false;
    for (let i = 0; i < this.burstParticles.length; i++) {
      const p = this.burstParticles[i]!;
      if (!p.alive) continue;
      dirty = true;
      p.life -= dt;

      if (p.life <= 0) {
        p.alive = false;
        this.burstPos[i * 3 + 1] = -100;
        this.burstCol[i * 4 + 3] = 0;
        continue;
      }

      p.vy += GRAVITY * dt;
      this.burstPos[i * 3]! += p.vx * dt;
      this.burstPos[i * 3 + 1]! += p.vy * dt;
      this.burstPos[i * 3 + 2]! += p.vz * dt;
      this.burstCol[i * 4 + 3] = p.life / BURST_LIFETIME;
    }
    if (dirty) {
      this.burstGeo.attributes['position']!.needsUpdate = true;
      this.burstGeo.attributes['color']!.needsUpdate = true;
    }
  }

  private updateSpeedLines(dt: number, speed: number, playerX: number, playerZ: number): void {
    if (speed < SPEED_LINE_THRESHOLD) {
      // Kill all active lines when slow
      for (let i = 0; i < this.lines.length; i++) {
        if (this.lines[i]!.alive) {
          this.lines[i]!.alive = false;
          this.lineCol[i * 4 + 3] = 0;
        }
      }
      this.lineGeo.attributes['color']!.needsUpdate = true;
      return;
    }

    // Spawn rate scales with speed
    const intensity = (speed - SPEED_LINE_THRESHOLD) / (MAX_SPEED - SPEED_LINE_THRESHOLD);
    const spawnRate = 0.02 + (1 - intensity) * 0.06; // faster spawn at higher speed

    this.lineSpawnTimer -= dt;
    if (this.lineSpawnTimer <= 0) {
      this.lineSpawnTimer = spawnRate;
      this.spawnSpeedLine(speed, playerX, playerZ);
    }

    // Update existing lines
    let dirty = false;
    for (let i = 0; i < this.lines.length; i++) {
      const l = this.lines[i]!;
      if (!l.alive) continue;
      dirty = true;
      l.life -= dt;

      if (l.life <= 0) {
        l.alive = false;
        this.lineCol[i * 4 + 3] = 0;
        continue;
      }

      // Move toward camera (positive Z)
      this.linePos[i * 3 + 2]! += l.speed * dt;
      this.lineCol[i * 4 + 3] = l.life / LINE_LIFETIME * intensity;
    }
    if (dirty) {
      this.lineGeo.attributes['position']!.needsUpdate = true;
      this.lineGeo.attributes['color']!.needsUpdate = true;
    }
  }

  private spawnSpeedLine(speed: number, playerX: number, playerZ: number): void {
    for (let i = 0; i < this.lines.length; i++) {
      const l = this.lines[i]!;
      if (l.alive) continue;

      l.alive = true;
      l.life = LINE_LIFETIME;
      l.speed = speed * 1.5;

      // Spawn around player, spread in X and Y, ahead in Z
      this.linePos[i * 3] = playerX + (Math.random() - 0.5) * 8;
      this.linePos[i * 3 + 1] = 0.5 + Math.random() * 4;
      this.linePos[i * 3 + 2] = playerZ - 10 - Math.random() * 20;

      // White-ish streaks
      this.lineCol[i * 4] = 0.8 + Math.random() * 0.2;
      this.lineCol[i * 4 + 1] = 0.9 + Math.random() * 0.1;
      this.lineCol[i * 4 + 2] = 1.0;
      this.lineCol[i * 4 + 3] = 1.0;
      return;
    }
  }

  dispose(): void {
    this.burstGeo.dispose();
    (this.burstPoints.material as THREE.Material).dispose();
    this.lineGeo.dispose();
    (this.linePoints.material as THREE.Material).dispose();
  }
}
