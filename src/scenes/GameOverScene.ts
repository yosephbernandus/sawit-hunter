import type { GameScene as IGameScene } from '../core/SceneManager.ts';
import type { AudioManager } from '../audio/AudioManager.ts';

export class GameOverScene implements IGameScene {
  private score = 0;
  private distance = 0;
  private audio: AudioManager;

  constructor(audio: AudioManager) {
    this.audio = audio;
  }

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

    // High score
    const prev = parseInt(localStorage.getItem('sawitRunnerHighScore') ?? '0', 10);
    if (this.score > prev) {
      localStorage.setItem('sawitRunnerHighScore', String(this.score));
    }

    // Play game over music
    this.audio.playMusic('gameOver');
  }

  update(_dt: number): void {}

  exit(): void {
    document.getElementById('gameOverScreen')?.classList.add('hidden');
    this.audio.stopMusic();
  }
}
