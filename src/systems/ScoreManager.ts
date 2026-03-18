import type { EventBus } from '../core/EventBus.ts';
import { MILESTONE_INTERVAL } from '../core/Constants.ts';

const LS_KEY = 'sawitHunterHighScore';

export class ScoreManager {
  private score = 0;
  private highScore: number;
  private lastMilestone = 0;
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.highScore = parseInt(localStorage.getItem(LS_KEY) ?? '0', 10);

    this.eventBus.on('SAWIT_CAUGHT', ({ points }) => {
      this.addScore(points);
    });
  }

  private addScore(points: number): void {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(LS_KEY, String(this.highScore));
    }

    this.eventBus.emit('SCORE_CHANGED', {
      score: this.score,
      highScore: this.highScore,
    });

    // Check milestones
    const milestone = Math.floor(this.score / MILESTONE_INTERVAL) * MILESTONE_INTERVAL;
    if (milestone > this.lastMilestone && milestone > 0) {
      this.lastMilestone = milestone;
      this.eventBus.emit('SPEED_MILESTONE', {
        speed: 0, // filled by DifficultyManager
        score: this.score,
      });
    }
  }

  setStartingScore(s: number): void {
    this.score = s;
    if (s > 0) {
      this.eventBus.emit('SCORE_CHANGED', { score: this.score, highScore: this.highScore });
    }
  }

  getScore(): number {
    return this.score;
  }

  getHighScore(): number {
    return this.highScore;
  }

  reset(): void {
    this.score = 0;
    this.lastMilestone = 0;
  }
}
