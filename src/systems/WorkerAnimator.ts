import * as THREE from 'three';
import type { WorkerRefs } from '../rendering/ModelFactory.ts';
import { LANE_WIDTH } from '../core/Constants.ts';

const WALK_FREQ       = 8.0;
const THIGH_AMP       = 0.45;
const KNEE_AMP        = 0.70;
const ARM_AMP_L       = 0.30;
const ARM_AMP_R       = 0.20;
const ELBOW_BASE      = 0.30;
const ELBOW_AMP       = 0.15;
const BOB_AMP         = 0.04;
const LEAN_FACTOR     = 0.18;
const HEAD_LEAN       = 0.10;
const LEAN_CLAMP      = LANE_WIDTH;

export class WorkerAnimator {
  private refs: WorkerRefs;
  private time = 0;
  private dying = false;
  private deathTime = 0;

  constructor(refs: WorkerRefs) {
    this.refs = refs;
  }

  update(dt: number, targetX: number, currentX: number, isDucking: boolean, isJumping = false, jumpVelocity = 0): void {
    if (this.dying) {
      this.updateDeath(dt);
      return;
    }

    this.time += dt;
    const t = this.time;
    const r = this.refs;

    if (isDucking) {
      this.applyDuckPose();
    } else if (isJumping) {
      this.applyJumpPose(jumpVelocity);
    } else {
      // Walk cycle
      const phase = t * WALK_FREQ;
      const leftThigh  =  Math.sin(phase) * THIGH_AMP;
      const rightThigh = -Math.sin(phase) * THIGH_AMP;

      r.leftLegGroup.rotation.x  = lerp(r.leftLegGroup.rotation.x,  leftThigh,  0.3);
      r.rightLegGroup.rotation.x = lerp(r.rightLegGroup.rotation.x, rightThigh, 0.3);

      r.leftKneeGroup.rotation.x  = lerp(r.leftKneeGroup.rotation.x,  Math.max(0, -leftThigh)  * KNEE_AMP, 0.3);
      r.rightKneeGroup.rotation.x = lerp(r.rightKneeGroup.rotation.x, Math.max(0, -rightThigh) * KNEE_AMP, 0.3);

      r.leftArmGroup.rotation.x  = lerp(r.leftArmGroup.rotation.x,  -Math.sin(phase) * ARM_AMP_L, 0.25);
      r.rightArmGroup.rotation.x = lerp(r.rightArmGroup.rotation.x,   Math.sin(phase) * ARM_AMP_R, 0.25);

      r.leftElbowGroup.rotation.x  = lerp(r.leftElbowGroup.rotation.x,  0.20, 0.15);
      r.rightElbowGroup.rotation.x = lerp(r.rightElbowGroup.rotation.x, ELBOW_BASE + Math.sin(phase) * ELBOW_AMP, 0.25);

      // Bob — offset on torso local Y
      r.torso.position.y = 0.83 + Math.sin(t * WALK_FREQ * 2) * BOB_AMP;

      // Duck/jump recovery
      r.torso.rotation.x = lerp(r.torso.rotation.x, 0, 0.15);
    }

    // Lane lean (always active during gameplay)
    const xDelta = Math.max(-LEAN_CLAMP, Math.min(LEAN_CLAMP, targetX - currentX));
    r.torso.rotation.z = lerp(r.torso.rotation.z, -xDelta * LEAN_FACTOR, 0.2);
    r.head.rotation.z  = lerp(r.head.rotation.z,  -xDelta * HEAD_LEAN,   0.2);
  }

  startDeath(): void {
    this.dying = true;
    this.deathTime = 0;
  }

  private updateDeath(dt: number): void {
    this.deathTime += dt;
    const r = this.refs;
    const t = this.deathTime;

    // Forward tumble on the whole group via torso+head rotation
    const tumble = Math.min(t * 3.5, Math.PI * 0.75);
    r.torso.rotation.x = lerp(r.torso.rotation.x, tumble, 0.18);
    r.head.rotation.x  = lerp(r.head.rotation.x,  tumble * 0.6, 0.18);

    // Arms fly out to sides
    const armOut = Math.min(t * 4.0, Math.PI * 0.6);
    r.leftArmGroup.rotation.z  = lerp(r.leftArmGroup.rotation.z,  -armOut, 0.2);
    r.rightArmGroup.rotation.z = lerp(r.rightArmGroup.rotation.z,  armOut, 0.2);
    r.leftArmGroup.rotation.x  = lerp(r.leftArmGroup.rotation.x,  -0.3, 0.15);
    r.rightArmGroup.rotation.x = lerp(r.rightArmGroup.rotation.x, -0.3, 0.15);

    // Legs buckle — both knees bend forward
    r.leftLegGroup.rotation.x  = lerp(r.leftLegGroup.rotation.x,  -0.4, 0.15);
    r.rightLegGroup.rotation.x = lerp(r.rightLegGroup.rotation.x, -0.4, 0.15);
    r.leftKneeGroup.rotation.x  = lerp(r.leftKneeGroup.rotation.x,  1.2, 0.2);
    r.rightKneeGroup.rotation.x = lerp(r.rightKneeGroup.rotation.x, 1.2, 0.2);

    // Spin wobble
    r.torso.rotation.z = Math.sin(t * 8) * 0.15 * Math.max(0, 1 - t * 1.5);
  }

  private applyDuckPose(): void {
    const r = this.refs;
    r.torso.rotation.x = lerp(r.torso.rotation.x, 0.8, 0.2);
    r.torso.position.y = 0.83;

    r.leftLegGroup.rotation.x  = lerp(r.leftLegGroup.rotation.x,  0.5, 0.2);
    r.rightLegGroup.rotation.x = lerp(r.rightLegGroup.rotation.x, 0.5, 0.2);
    r.leftKneeGroup.rotation.x  = lerp(r.leftKneeGroup.rotation.x,  1.0, 0.2);
    r.rightKneeGroup.rotation.x = lerp(r.rightKneeGroup.rotation.x, 1.0, 0.2);
  }

  private applyJumpPose(jumpVelocity: number): void {
    const r = this.refs;
    // Body tilts forward on ascent, back slightly on descent
    const tilt = jumpVelocity > 0 ? -0.35 : 0.1;
    r.torso.rotation.x = lerp(r.torso.rotation.x, tilt, 0.2);
    r.torso.position.y = 0.83;

    // Legs tuck up behind
    r.leftLegGroup.rotation.x  = lerp(r.leftLegGroup.rotation.x,  -0.5, 0.2);
    r.rightLegGroup.rotation.x = lerp(r.rightLegGroup.rotation.x, -0.5, 0.2);
    r.leftKneeGroup.rotation.x  = lerp(r.leftKneeGroup.rotation.x,  0.9, 0.2);
    r.rightKneeGroup.rotation.x = lerp(r.rightKneeGroup.rotation.x, 0.9, 0.2);

    // Arms spread slightly for balance
    r.leftArmGroup.rotation.x  = lerp(r.leftArmGroup.rotation.x,  -0.5, 0.2);
    r.rightArmGroup.rotation.x = lerp(r.rightArmGroup.rotation.x, -0.5, 0.2);
  }

  reset(): void {
    this.time = 0;
    this.dying = false;
    this.deathTime = 0;
    const r = this.refs;
    r.torso.rotation.set(0, 0, 0);
    r.torso.position.y = 0.83;
    r.head.rotation.set(0, 0, 0);
    r.leftLegGroup.rotation.set(0, 0, 0);
    r.rightLegGroup.rotation.set(0, 0, 0);
    r.leftKneeGroup.rotation.set(0, 0, 0);
    r.rightKneeGroup.rotation.set(0, 0, 0);
    r.leftArmGroup.rotation.set(0, 0, 0);
    r.rightArmGroup.rotation.set(0, 0, 0);
    r.leftElbowGroup.rotation.set(0, 0, 0);
    r.rightElbowGroup.rotation.set(0, 0, 0);
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
