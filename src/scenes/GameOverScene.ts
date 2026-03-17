import type { GameScene as IGameScene } from '../core/SceneManager.ts';
import type { AudioManager } from '../audio/AudioManager.ts';
import { submitScore, fetchTopScores } from '../network/LeaderboardAPI.ts';

export class GameOverScene implements IGameScene {
  private score = 0;
  private distance = 0;
  private playerName = 'Player';
  private audio: AudioManager;

  constructor(audio: AudioManager) {
    this.audio = audio;
  }

  setResults(score: number, distance: number, name: string): void {
    this.score = score;
    this.distance = distance;
    this.playerName = name;
  }

  enter(): void {
    document.getElementById('gameOverScreen')?.classList.remove('hidden');
    document.getElementById('hud')?.classList.add('hidden');
    document.getElementById('mobileControls')?.classList.add('hidden');

    document.getElementById('finalScore')!.textContent = String(this.score);
    document.getElementById('gameOverText')!.textContent =
      `You ran ${Math.floor(this.distance)}m!`;

    // High score
    const prev = parseInt(localStorage.getItem('sawitHunterHighScore') ?? '0', 10);
    if (this.score > prev) {
      localStorage.setItem('sawitHunterHighScore', String(this.score));
    }

    // Play game over music
    this.audio.playMusic('gameOver');

    // Submit score & load leaderboard
    this.loadLeaderboard();
  }

  private async loadLeaderboard(): Promise<void> {
    const tbody = document.getElementById('leaderboardBody');
    const status = document.getElementById('leaderboardStatus');
    if (!tbody || !status) return;

    tbody.innerHTML = '';
    status.textContent = 'Submitting score...';
    status.classList.remove('hidden');

    // Submit
    await submitScore(this.playerName, this.score, this.distance);

    status.textContent = 'Loading leaderboard...';

    // Fetch
    const entries = await fetchTopScores(20);

    if (entries.length === 0) {
      status.textContent = 'Could not load leaderboard';
      return;
    }

    status.classList.add('hidden');

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]!;
      const tr = document.createElement('tr');
      const isYou = e.name === this.playerName && e.score === this.score;
      if (isYou) tr.className = 'lb-highlight';
      tr.innerHTML = `<td>${i + 1}</td><td>${escapeHtml(e.name)}</td><td>${e.score}</td><td>${e.distance}m</td>`;
      tbody.appendChild(tr);
    }
  }

  update(_dt: number): void {}

  exit(): void {
    document.getElementById('gameOverScreen')?.classList.add('hidden');
    this.audio.stopMusic();
  }
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
