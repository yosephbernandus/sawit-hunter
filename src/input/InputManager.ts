import { SwipeDetector } from './SwipeDetector.ts';

export interface InputState {
  moveDirection: -1 | 0 | 1;
  action: boolean; // duck/slide
}

export class InputManager {
  readonly state: InputState = { moveDirection: 0, action: false };

  private keys = new Set<string>();
  private swipeDetector: SwipeDetector;
  private pendingLaneChange: -1 | 0 | 1 = 0;

  // Mobile button state
  private mobileLeft = false;
  private mobileRight = false;
  private mobileAction = false;

  constructor(canvas: HTMLElement) {
    this.swipeDetector = new SwipeDetector(canvas);

    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);

    // Mobile buttons
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    const duckBtn = document.getElementById('duckBtn');

    if (leftBtn) {
      leftBtn.addEventListener('touchstart', () => { this.mobileLeft = true; }, { passive: true });
      leftBtn.addEventListener('touchend', () => { this.mobileLeft = false; }, { passive: true });
    }
    if (rightBtn) {
      rightBtn.addEventListener('touchstart', () => { this.mobileRight = true; }, { passive: true });
      rightBtn.addEventListener('touchend', () => { this.mobileRight = false; }, { passive: true });
    }
    if (duckBtn) {
      duckBtn.addEventListener('touchstart', () => { this.mobileAction = true; }, { passive: true });
      duckBtn.addEventListener('touchend', () => { this.mobileAction = false; }, { passive: true });
    }
  }

  update(): void {
    // Keyboard
    let dir: -1 | 0 | 1 = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) dir = -1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) dir = 1;

    const action = this.keys.has('Space') || this.keys.has('ArrowDown') || this.keys.has('KeyS');

    // Swipe (consumes once)
    const swipe = this.swipeDetector.lastSwipe;
    if (swipe === 'left') this.pendingLaneChange = -1;
    else if (swipe === 'right') this.pendingLaneChange = 1;
    else if (swipe === 'down') this.state.action = true;

    // Mobile buttons
    if (this.mobileLeft) dir = -1;
    if (this.mobileRight) dir = 1;

    // For keyboard/mobile buttons: direct lane change on key press
    if (dir !== 0) {
      this.state.moveDirection = dir;
    } else if (this.pendingLaneChange !== 0) {
      this.state.moveDirection = this.pendingLaneChange;
      this.pendingLaneChange = 0;
    } else {
      this.state.moveDirection = 0;
    }

    this.state.action = action || this.mobileAction;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
    // Prevent scrolling
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
  }
}
