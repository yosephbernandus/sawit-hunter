import { SwipeDetector } from './SwipeDetector.ts';

export interface InputState {
  moveDirection: -1 | 0 | 1;
  action: boolean; // duck/slide
  jump: boolean;
}

export class InputManager {
  readonly state: InputState = { moveDirection: 0, action: false, jump: false };

  private keys = new Set<string>();
  private swipeDetector: SwipeDetector;
  private pendingLaneChange: -1 | 0 | 1 = 0;

  // Mobile button state
  private mobileLeft = false;
  private mobileRight = false;
  private mobileAction = false;
  private mobileJump = false;

  // Mobile handlers (stored for cleanup)
  private mobileHandlers: Array<{ el: HTMLElement; event: string; fn: EventListener }> = [];

  constructor(canvas: HTMLElement) {
    this.swipeDetector = new SwipeDetector(canvas);

    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);

    // Mobile buttons
    this.bindMobileBtn('leftBtn', 'touchstart', () => { this.mobileLeft = true; });
    this.bindMobileBtn('leftBtn', 'touchend', () => { this.mobileLeft = false; });
    this.bindMobileBtn('rightBtn', 'touchstart', () => { this.mobileRight = true; });
    this.bindMobileBtn('rightBtn', 'touchend', () => { this.mobileRight = false; });
    this.bindMobileBtn('duckBtn', 'touchstart', () => { this.mobileAction = true; });
    this.bindMobileBtn('duckBtn', 'touchend', () => { this.mobileAction = false; });
    this.bindMobileBtn('jumpBtn', 'touchstart', () => { this.mobileJump = true; });
    this.bindMobileBtn('jumpBtn', 'touchend', () => { this.mobileJump = false; });
  }

  private bindMobileBtn(id: string, event: string, fn: EventListener): void {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(event, fn, { passive: true });
    this.mobileHandlers.push({ el, event, fn });
  }

  update(): void {
    // Keyboard
    let dir: -1 | 0 | 1 = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) dir = -1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) dir = 1;

    const action = this.keys.has('Space') || this.keys.has('ArrowDown') || this.keys.has('KeyS');
    const jump   = this.keys.has('ArrowUp') || this.keys.has('KeyW');

    // Swipe (consumes once)
    const swipe = this.swipeDetector.lastSwipe;
    let swipeAction = false;
    let swipeJump = false;
    if (swipe === 'left') this.pendingLaneChange = -1;
    else if (swipe === 'right') this.pendingLaneChange = 1;
    else if (swipe === 'down') swipeAction = true;
    else if (swipe === 'up') swipeJump = true;

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

    this.state.action = action || this.mobileAction || swipeAction;
    this.state.jump   = jump   || this.mobileJump   || swipeJump;
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
    this.swipeDetector.dispose();
    for (const { el, event, fn } of this.mobileHandlers) {
      el.removeEventListener(event, fn);
    }
    this.mobileHandlers.length = 0;
  }
}
