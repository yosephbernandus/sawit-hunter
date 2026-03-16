import type { GameScene as IGameScene } from '../core/SceneManager.ts';

export class GameOverScene implements IGameScene {
  private score = 0;
  private distance = 0;

  setResults(score: number, distance: number): void {
    this.score = score;
    this.distance = distance;
  }

  enter(): void {
    document.getElementById('gameOverScreen')?.classList.remove('hidden');
    document.getElementById('hud')?.classList.add('hidden');
    document.getElementById('mobileControls')?.classList.add('hidden');

    document.getElementById('finalScore')!.textContent = String(this.score);
    document.getElementById('gameOverText')!.textContent =
      `You ran ${Math.floor(this.distance)}m!`;

    // Update high score
    const prev = parseInt(localStorage.getItem('sawitRunnerHighScore') ?? '0', 10);
    if (this.score > prev) {
      localStorage.setItem('sawitRunnerHighScore', String(this.score));
    }
  }

  update(_dt: number): void {
    // Static screen, nothing to update
  }

  exit(): void {
    document.getElementById('gameOverScreen')?.classList.add('hidden');
  }
}
