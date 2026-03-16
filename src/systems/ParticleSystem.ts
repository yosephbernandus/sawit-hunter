import * as THREE from 'three';

const MAX_PARTICLES = 200;
const PARTICLE_LIFETIME = 0.8;
const GRAVITY = -15;

interface Particle {
  alive: boolean;
  life: number;
  vx: number;
  vy: number;
  vz: number;
}

export class ParticleSystem {
  private points: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;
  private particles: Particle[] = [];
  private geometry: THREE.BufferGeometry;

  constructor(scene: THREE.Scene) {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 4);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 4));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({ alive: false, life: 0, vx: 0, vy: 0, vz: 0 });
    }
  }

  burst(x: number, y: number, z: number, count = 15, golden = false): void {
    let spawned = 0;
    for (const p of this.particles) {
      if (spawned >= count) break;
      if (p.alive) continue;

      p.alive = true;
      p.life = PARTICLE_LIFETIME;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      p.vx = Math.cos(angle) * speed;
      p.vy = 3 + Math.random() * 5;
      p.vz = Math.sin(angle) * speed;

      const idx = this.particles.indexOf(p);
      this.positions[idx * 3] = x;
      this.positions[idx * 3 + 1] = y;
      this.positions[idx * 3 + 2] = z;

      // Color: orange/green for normal, gold for golden
      if (golden) {
        this.colors[idx * 4] = 1.0;
        this.colors[idx * 4 + 1] = 0.85;
        this.colors[idx * 4 + 2] = 0.0;
      } else {
        this.colors[idx * 4] = 0.3 + Math.random() * 0.7;
        this.colors[idx * 4 + 1] = 0.5 + Math.random() * 0.3;
        this.colors[idx * 4 + 2] = 0.1;
      }
      this.colors[idx * 4 + 3] = 1.0;

      spawned++;
    }
  }

  update(dt: number): void {
    let needsUpdate = false;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]!;
      if (!p.alive) continue;

      needsUpdate = true;
      p.life -= dt;

      if (p.life <= 0) {
        p.alive = false;
        // Move offscreen
        this.positions[i * 3 + 1] = -100;
        this.colors[i * 4 + 3] = 0;
        continue;
      }

      // Physics
      p.vy += GRAVITY * dt;
      this.positions[i * 3]! += p.vx * dt;
      this.positions[i * 3 + 1]! += p.vy * dt;
      this.positions[i * 3 + 2]! += p.vz * dt;

      // Fade
      this.colors[i * 4 + 3] = p.life / PARTICLE_LIFETIME;
    }

    if (needsUpdate) {
      this.geometry.attributes['position']!.needsUpdate = true;
      this.geometry.attributes['color']!.needsUpdate = true;
    }
  }

  dispose(): void {
    this.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
