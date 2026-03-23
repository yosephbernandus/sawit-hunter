import type { EventBus } from '../core/EventBus.ts';
import { MILESTONE_INTERVAL } from '../core/Constants.ts';

const LS_KEY = 'sawitHunterHighScore';

export class ScoreManager {
  private score = 0;
  private highScore: number;
  private lastMilestone = 0;
  private eventBus: EventBus;

  // External multiplier (from doubleScore powerup)
  private scoreMultiplier = 1;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.highScore = parseInt(localStorage.getItem(LS_KEY) ?? '0', 10);

    this.eventBus.on('SAWIT_CAUGHT', ({ points }) => {
      this.addScore(points);
    });

    this.eventBus.on('NEAR_MISS', ({ points }) => {
      this.addScore(points);
    });
  }

  addScore(points: number): void {
    const finalPoints = Math.round(points * this.scoreMultiplier);
    this.score += finalPoints;
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
        speed: 0,
        score: this.score,
      });
    }
  }

  setScoreMultiplier(m: number): void {
    this.scoreMultiplier = m;
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
    this.scoreMultiplier = 1;
  }
}
