import type { GameEvents } from '../core/EventBus.ts';

export interface MissionDefinition {
  id: string;
  description: string;
  targetValue: number;
  coinReward: number;
  eventKey: keyof GameEvents;
  /** Returns new progress value given event data and current progress */
  progressFn: (eventData: any, currentProgress: number) => number;
  /** If true, progress resets to 0 on death */
  resetOnDeath: boolean;
}

export const MISSION_POOL: MissionDefinition[] = [
  {
    id: 'collect20',
    description: 'Collect 20 sawit in one run',
    targetValue: 20,
    coinReward: 30,
    eventKey: 'SAWIT_CAUGHT',
    progressFn: (_d, p) => p + 1,
    resetOnDeath: true,
  },
  {
    id: 'collect50',
    description: 'Collect 50 sawit in one run',
    targetValue: 50,
    coinReward: 80,
    eventKey: 'SAWIT_CAUGHT',
    progressFn: (_d, p) => p + 1,
    resetOnDeath: true,
  },
  {
    id: 'golden5',
    description: 'Collect 5 golden sawit',
    targetValue: 5,
    coinReward: 60,
    eventKey: 'SAWIT_CAUGHT',
    progressFn: (d: { points: number }, p) => d.points > 10 ? p + 1 : p,
    resetOnDeath: false,
  },
  {
    id: 'reach300m',
    description: 'Reach 300m in one run',
    targetValue: 300,
    coinReward: 40,
    eventKey: 'DISTANCE_CHANGED',
    progressFn: (d: { distance: number }, _p) => d.distance,
    resetOnDeath: true,
  },
  {
    id: 'reach800m',
    description: 'Reach 800m in one run',
    targetValue: 800,
    coinReward: 100,
    eventKey: 'DISTANCE_CHANGED',
    progressFn: (d: { distance: number }, _p) => d.distance,
    resetOnDeath: true,
  },
  {
    id: 'survive2biomes',
    description: 'Survive 2 biome transitions',
    targetValue: 2,
    coinReward: 120,
    eventKey: 'BIOME_ENTERED',
    progressFn: (_d, p) => p + 1,
    resetOnDeath: true,
  },
  {
    id: 'powerup3',
    description: 'Use 3 power-ups in one run',
    targetValue: 3,
    coinReward: 50,
    eventKey: 'POWERUP_COLLECTED',
    progressFn: (_d, p) => p + 1,
    resetOnDeath: true,
  },
  {
    id: 'score500',
    description: 'Score 500 points in one run',
    targetValue: 500,
    coinReward: 60,
    eventKey: 'SCORE_CHANGED',
    progressFn: (d: { score: number }, _p) => d.score,
    resetOnDeath: true,
  },
  {
    id: 'totalDistance2000',
    description: 'Run 2000m total',
    targetValue: 2000,
    coinReward: 50,
    eventKey: 'DISTANCE_CHANGED',
    progressFn: (d: { distance: number }, _p) => d.distance,
    resetOnDeath: false,
  },
];
