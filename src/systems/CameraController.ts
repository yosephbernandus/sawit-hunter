import * as THREE from 'three';
import { CAMERA_OFFSET_Y, CAMERA_OFFSET_Z, CAMERA_LOOK_AHEAD, CAMERA_LERP_SPEED } from '../core/Constants.ts';
import { lerp } from '../utils/MathUtils.ts';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Object3D;

  private lookTarget = new THREE.Vector3();

  // Shake effect
  private shakeIntensity = 0;
  private shakeDuration = 0;
  private shakeTimer = 0;

  constructor(camera: THREE.PerspectiveCamera, target: THREE.Object3D) {
    this.camera = camera;
    this.target = target;
    this.snapToTarget();
  }

  update(dt: number): void {
    const lerpFactor = 1 - Math.exp(-CAMERA_LERP_SPEED * dt);

    // Desired position: behind and above the player
    const desiredX = this.target.position.x * 0.3;
    const desiredY = CAMERA_OFFSET_Y;
    const desiredZ = this.target.position.z + CAMERA_OFFSET_Z;

    this.camera.position.x = lerp(this.camera.position.x, desiredX, lerpFactor);
    this.camera.position.y = lerp(this.camera.position.y, desiredY, lerpFactor);
    this.camera.position.z = lerp(this.camera.position.z, desiredZ, lerpFactor);

    // Look ahead of the player
    this.lookTarget.set(
      this.target.position.x * 0.15,
      1.5,
      this.target.position.z - CAMERA_LOOK_AHEAD,
    );
    this.camera.lookAt(this.lookTarget);

    // Screen shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const progress = this.shakeTimer / this.shakeDuration;
      const intensity = this.shakeIntensity * progress;
      this.camera.position.x += (Math.random() - 0.5) * intensity;
      this.camera.position.y += (Math.random() - 0.5) * intensity * 0.5;
    }
  }

  shake(intensity = 0.5, duration = 0.3): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTimer = duration;
  }

  snapToTarget(): void {
    this.camera.position.set(
      this.target.position.x * 0.3,
      CAMERA_OFFSET_Y,
      this.target.position.z + CAMERA_OFFSET_Z,
    );
    this.camera.lookAt(
      this.target.position.x * 0.15,
      1.5,
      this.target.position.z - CAMERA_LOOK_AHEAD,
    );
  }
}
