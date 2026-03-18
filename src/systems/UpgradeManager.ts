import { UPGRADES, type UpgradeDefinition } from './UpgradeDefinitions.ts';
import type { CoinManager } from './CoinManager.ts';

const STORAGE_KEY = 'sawitHunterUpgrades';

type UpgradeLevels = Record<string, number>;

export class UpgradeManager {
  private coins: CoinManager;
  private levels: UpgradeLevels;

  constructor(coins: CoinManager) {
    this.coins = coins;
    this.levels = this.load();
  }

  getLevel(upgradeId: string): number {
    return this.levels[upgradeId] ?? 0;
  }

  getEffectValue(upgradeId: string): number {
    const def = UPGRADES.find((u) => u.id === upgradeId);
    if (!def) return 0;
    return this.getLevel(upgradeId) * def.effectPerLevel;
  }

  getCost(upgradeId: string): number {
    const def = UPGRADES.find((u) => u.id === upgradeId);
    if (!def) return Infinity;
    // Flat cost per level — no scaling since they're single-use
    return def.baseCost;
  }

  canPurchase(upgradeId: string): boolean {
    const def = UPGRADES.find((u) => u.id === upgradeId);
    if (!def) return false;
    const level = this.getLevel(upgradeId);
    if (level >= def.maxLevel) return false;
    return this.coins.getBalance() >= this.getCost(upgradeId);
  }

  purchase(upgradeId: string): boolean {
    if (!this.canPurchase(upgradeId)) return false;
    const cost = this.getCost(upgradeId);
    if (!this.coins.spend(cost)) return false;
    this.levels[upgradeId] = (this.levels[upgradeId] ?? 0) + 1;
    this.save();
    return true;
  }

  /** Consume all purchased upgrades (called when a game run starts). Resets levels to 0. */
  consumeAll(): void {
    this.levels = {};
    this.save();
  }

  getUpgrades(): (UpgradeDefinition & { level: number; cost: number; maxed: boolean })[] {
    return UPGRADES.map((def) => ({
      ...def,
      level: this.getLevel(def.id),
      cost: this.getCost(def.id),
      maxed: this.getLevel(def.id) >= def.maxLevel,
    }));
  }

  private load(): UpgradeLevels {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.levels));
  }
}
