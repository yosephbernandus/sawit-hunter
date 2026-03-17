export type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null;

const SWIPE_THRESHOLD = 40; // px
const SWIPE_TIME_LIMIT = 350; // ms
const DEBOUNCE_MS = 180;

export class SwipeDetector {
  private element: HTMLElement;
  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private lastSwipeTime = 0;
  private _lastSwipe: SwipeDirection = null;

  constructor(element: HTMLElement) {
    this.element = element;
    element.addEventListener('touchstart', this.onTouchStart, { passive: true });
    element.addEventListener('touchend', this.onTouchEnd, { passive: true });
  }

  get lastSwipe(): SwipeDirection {
    const s = this._lastSwipe;
    this._lastSwipe = null;
    return s;
  }

  private onTouchStart = (e: TouchEvent): void => {
    const touch = e.touches[0];
    if (!touch) return;
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.startTime = performance.now();
  };

  dispose(): void {
    this.element.removeEventListener('touchstart', this.onTouchStart);
    this.element.removeEventListener('touchend', this.onTouchEnd);
  }

  private onTouchEnd = (e: TouchEvent): void => {
    const touch = e.changedTouches[0];
    if (!touch) return;

    const now = performance.now();
    const dt = now - this.startTime;
    if (dt > SWIPE_TIME_LIMIT) return;
    if (now - this.lastSwipeTime < DEBOUNCE_MS) return;

    const dx = touch.clientX - this.startX;
    const dy = touch.clientY - this.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > SWIPE_THRESHOLD && absDx > absDy) {
      this._lastSwipe = dx > 0 ? 'right' : 'left';
      this.lastSwipeTime = now;
    } else if (absDy > SWIPE_THRESHOLD) {
      this._lastSwipe = dy > 0 ? 'down' : 'up';
      this.lastSwipeTime = now;
    }
  };
}
