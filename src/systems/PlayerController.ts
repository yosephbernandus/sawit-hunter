import * as THREE from 'three';
import type { InputManager } from '../input/InputManager.ts';
import { LANE_POSITIONS, PLAYER_LANE_LERP_SPEED, PLAYER_Y } from '../core/Constants.ts';
import { lerp, clamp } from '../utils/MathUtils.ts';
import type { WorkerAnimator } from './WorkerAnimator.ts';

export class PlayerController {
  readonly mesh: THREE.Group;

  private currentLane = 1; // 0=left, 1=center, 2=right
  private targetX = 0;
  private input: InputManager;
  private canChangeLane = true;
  private laneChangeCooldown = 0;

  // Duck state
  private _isDucking = false;
  private duckTimer = 0;
  private readonly DUCK_DURATION = 0.6;
  private readonly DUCK_SCALE_Y = 0.4;
  private readonly LANE_CHANGE_COOLDOWN = 0.15;

  // Jump state
  private _isJumping = false;
  private jumpVelocity = 0;
  private jumpOffset = 0; // extra Y above PLAYER_Y
  private readonly JUMP_VELOCITY = 9;
  private readonly JUMP_GRAVITY = 22;

  private animator: WorkerAnimator | null = null;

  constructor(mesh: THREE.Group, input: InputManager, animator?: WorkerAnimator) {
    this.mesh = mesh;
    this.input = input;
    this.animator = animator ?? null;
    this.mesh.position.set(LANE_POSITIONS[1]!, PLAYER_Y, 0);
    this.targetX = LANE_POSITIONS[1]!;
  }

  get lane(): number {
    return this.currentLane;
  }

  get isDucking(): boolean {
    return this._isDucking;
  }

  get isJumping(): boolean {
    return this._isJumping;
  }

  get jumpHeight(): number {
    return this.jumpOffset;
  }

  update(dt: number): void {
    // Lane change cooldown
    if (this.laneChangeCooldown > 0) {
      this.laneChangeCooldown -= dt;
      if (this.laneChangeCooldown <= 0) this.canChangeLane = true;
    }

    // Lane switching
    const dir = this.input.state.moveDirection;
    if (dir !== 0 && this.canChangeLane) {
      const newLane = clamp(this.currentLane + dir, 0, 2);
      if (newLane !== this.currentLane) {
        this.currentLane = newLane;
        this.targetX = LANE_POSITIONS[this.currentLane]!;
        this.canChangeLane = false;
        this.laneChangeCooldown = this.LANE_CHANGE_COOLDOWN;
      }
    }

    // Smooth movement to target lane
    this.mesh.position.x = lerp(
      this.mesh.position.x,
      this.targetX,
      1 - Math.exp(-PLAYER_LANE_LERP_SPEED * dt),
    );

    // Jump
    if (this.input.state.jump && !this._isJumping && !this._isDucking) {
      this._isJumping = true;
      this.jumpVelocity = this.JUMP_VELOCITY;
    }

    if (this._isJumping) {
      this.jumpVelocity -= this.JUMP_GRAVITY * dt;
      this.jumpOffset += this.jumpVelocity * dt;
      if (this.jumpOffset <= 0) {
        this.jumpOffset = 0;
        this.jumpVelocity = 0;
        this._isJumping = false;
      }
    }

    // Duck/slide (only when grounded)
    if (this.input.state.action && !this._isDucking && !this._isJumping) {
      this._isDucking = true;
      this.duckTimer = this.DUCK_DURATION;
    }

    if (this._isDucking) {
      this.duckTimer -= dt;
      if (this.duckTimer <= 0) {
        this._isDucking = false;
        this.duckTimer = 0;
      }
    }

    // Visual duck: scale Y (only when grounded)
    const targetScaleY = this._isDucking ? this.DUCK_SCALE_Y : 1;
    this.mesh.scale.y = lerp(this.mesh.scale.y, targetScaleY, 1 - Math.exp(-15 * dt));
    // Y = ground position + jump arc
    this.mesh.position.y = PLAYER_Y * this.mesh.scale.y + this.jumpOffset;

    // Worker animation
    this.animator?.update(dt, this.targetX, this.mesh.position.x, this._isDucking, this._isJumping, this.jumpVelocity);
  }

  reset(): void {
    this.currentLane = 1;
    this.targetX = LANE_POSITIONS[1]!;
    this.mesh.position.set(LANE_POSITIONS[1]!, PLAYER_Y, 0);
    this.mesh.scale.set(1, 1, 1);
    this._isDucking = false;
    this.duckTimer = 0;
    this._isJumping = false;
    this.jumpVelocity = 0;
    this.jumpOffset = 0;
    this.canChangeLane = true;
    this.laneChangeCooldown = 0;
    this.animator?.reset();
  }
}
