import type { GameScene as IGameScene } from '../core/SceneManager.ts';
import type { UpgradeManager } from '../systems/UpgradeManager.ts';
import type { CoinManager } from '../systems/CoinManager.ts';
import type { AudioManager } from '../audio/AudioManager.ts';

export class ShopScene implements IGameScene {
  private upgrades: UpgradeManager;
  private coins: CoinManager;
  private audio: AudioManager;
  private onBack: () => void;

  constructor(
    upgrades: UpgradeManager,
    coins: CoinManager,
    audio: AudioManager,
    onBack: () => void,
  ) {
    this.upgrades = upgrades;
    this.coins = coins;
    this.audio = audio;
    this.onBack = onBack;
  }

  enter(): void {
    document.getElementById('menuScreen')?.classList.add('hidden');
    document.getElementById('shopScreen')?.classList.remove('hidden');
    this.render();

    document.getElementById('shopBackBtn')?.addEventListener('click', this.handleBack);
  }

  update(_dt: number): void {
    // Pure DOM scene — no per-frame work
  }

  exit(): void {
    document.getElementById('shopScreen')?.classList.add('hidden');
    document.getElementById('shopBackBtn')?.removeEventListener('click', this.handleBack);
  }

  private handleBack = (): void => {
    this.onBack();
  };

  private render(): void {
    const coinsEl = document.getElementById('shopCoins');
    if (coinsEl) coinsEl.textContent = `Coins: ${this.coins.getBalance()}`;

    const list = document.getElementById('upgradeList');
    if (!list) return;
    list.innerHTML = '';

    for (const upgrade of this.upgrades.getUpgrades()) {
      const card = document.createElement('div');
      card.className = 'upgrade-card';

      // Level pips
      let pips = '';
      for (let i = 0; i < upgrade.maxLevel; i++) {
        pips += i < upgrade.level ? '<span class="pip filled"></span>' : '<span class="pip"></span>';
      }

      card.innerHTML = `
        <div class="upgrade-info">
          <div class="upgrade-name">${upgrade.name}</div>
          <div class="upgrade-desc">${upgrade.description}</div>
          <div class="upgrade-pips">${pips}</div>
        </div>
      `;

      const btn = document.createElement('button');
      btn.className = 'upgrade-buy-btn';

      if (upgrade.maxed) {
        btn.textContent = 'MAX';
        btn.disabled = true;
      } else {
        btn.textContent = `${upgrade.cost}`;
        btn.disabled = this.coins.getBalance() < upgrade.cost;
        btn.addEventListener('click', () => {
          if (this.upgrades.purchase(upgrade.id)) {
            this.audio.play('powerup');
            this.render();
          }
        });
      }

      card.appendChild(btn);
      list.appendChild(card);
    }
  }
}
