import type { EventBus } from '../core/EventBus.ts';

const STORAGE_KEY = 'sawitHunterCoins';

export class CoinManager {
  private eventBus: EventBus;
  private balance: number;
  private multiplier = 1;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.balance = parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10);
  }

  getBalance(): number {
    return this.balance;
  }

  setMultiplier(m: number): void {
    this.multiplier = m;
  }

  add(amount: number): void {
    this.balance += Math.floor(amount * this.multiplier);
    this.save();
    this.eventBus.emit('COINS_CHANGED', { balance: this.balance });
  }

  spend(amount: number): boolean {
    if (this.balance < amount) return false;
    this.balance -= amount;
    this.save();
    this.eventBus.emit('COINS_CHANGED', { balance: this.balance });
    return true;
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, String(this.balance));
  }
}
