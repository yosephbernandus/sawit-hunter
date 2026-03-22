import type { EventBus } from '../core/EventBus.ts';

const STORAGE_KEY = 'sawitHunterCoins';

export class CoinManager {
  private eventBus: EventBus;
  private balance: number;
  private multiplier = 1;
  private dirty = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.balance = parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10);
  }

  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  getBalance(): number {
    return this.balance;
  }

  setMultiplier(m: number): void {
    this.multiplier = m;
  }

  add(amount: number): void {
    this.balance += Math.floor(amount * this.multiplier);
    this.dirty = true;
    this.eventBus.emit('COINS_CHANGED', { balance: this.balance });
  }

  spend(amount: number): boolean {
    if (this.balance < amount) return false;
    this.balance -= amount;
    this.saveNow();
    this.eventBus.emit('COINS_CHANGED', { balance: this.balance });
    return true;
  }

  /** Call periodically or at run end to flush pending saves */
  flush(): void {
    if (this.dirty) this.saveNow();
  }

  private saveNow(): void {
    this.dirty = false;
    localStorage.setItem(STORAGE_KEY, String(this.balance));
  }
}
