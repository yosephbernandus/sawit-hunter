import type { EventBus, GameEvents } from '../core/EventBus.ts';
import { MISSION_POOL, type MissionDefinition } from './MissionDefinitions.ts';
import type { CoinManager } from './CoinManager.ts';

const STORAGE_KEY = 'sawitHunterMissions';
const MAX_ACTIVE = 3;

interface MissionState {
  id: string;
  progress: number;
}

export class MissionManager {
  private eventBus: EventBus;
  private coins: CoinManager;
  private active: MissionState[] = [];
  private definitions = new Map<string, MissionDefinition>();

  // Track cumulative distance across runs for cross-run missions
  private cumulativeDistance = 0;
  private lastEmittedDistance = 0;

  constructor(eventBus: EventBus, coins: CoinManager) {
    this.eventBus = eventBus;
    this.coins = coins;

    for (const def of MISSION_POOL) {
      this.definitions.set(def.id, def);
    }

    this.load();
    this.fillSlots();
    this.subscribeEvents();
  }

  getActive(): readonly { id: string; description: string; progress: number; target: number }[] {
    return this.active.map((m) => {
      const def = this.definitions.get(m.id)!;
      return {
        id: m.id,
        description: def.description,
        progress: Math.min(m.progress, def.targetValue),
        target: def.targetValue,
      };
    });
  }

  /** Call when a run ends (death). Resets single-run missions. */
  onRunEnd(): void {
    for (const m of this.active) {
      const def = this.definitions.get(m.id)!;
      if (def.resetOnDeath) {
        m.progress = 0;
      }
    }
    this.save();
  }

  /** Feed cumulative distance for cross-run distance missions */
  updateDistance(runDistance: number): void {
    const totalBase = parseInt(localStorage.getItem('sawitHunterTotalDistance') ?? '0', 10);
    this.cumulativeDistance = totalBase + runDistance;

    // Emit distance periodically (every 10m) to avoid spamming
    if (Math.floor(runDistance) - this.lastEmittedDistance >= 10) {
      this.lastEmittedDistance = Math.floor(runDistance);
      // Pass both run and cumulative distance so missions can pick the right one
      this.processMissionsForEvent('DISTANCE_CHANGED', { distance: runDistance, totalDistance: this.cumulativeDistance });
    }
  }

  /** Save cumulative distance at run end */
  saveTotalDistance(runDistance: number): void {
    const prev = parseInt(localStorage.getItem('sawitHunterTotalDistance') ?? '0', 10);
    localStorage.setItem('sawitHunterTotalDistance', String(prev + Math.floor(runDistance)));
  }

  private subscribeEvents(): void {
    const events: (keyof GameEvents)[] = [
      'SAWIT_CAUGHT', 'SCORE_CHANGED', 'BIOME_ENTERED',
      'POWERUP_COLLECTED',
    ];

    for (const eventKey of events) {
      this.eventBus.on(eventKey, (data: any) => {
        this.processMissionsForEvent(eventKey, data);
      });
    }
  }

  private processMissionsForEvent(eventKey: keyof GameEvents, data: any): void {
    let changed = false;

    for (const m of this.active) {
      const def = this.definitions.get(m.id)!;
      if (def.eventKey !== eventKey) continue;

      const oldProgress = m.progress;
      m.progress = def.progressFn(data, m.progress);

      if (m.progress !== oldProgress) {
        changed = true;
        this.eventBus.emit('MISSION_PROGRESS', {
          missionId: m.id,
          progress: Math.min(m.progress, def.targetValue),
          target: def.targetValue,
        });
      }

      // Check completion
      if (m.progress >= def.targetValue) {
        this.coins.add(def.coinReward);
        this.eventBus.emit('MISSION_COMPLETED', {
          missionId: m.id,
          coinReward: def.coinReward,
        });
      }
    }

    // Remove completed missions and fill new ones
    const before = this.active.length;
    this.active = this.active.filter((m) => {
      const def = this.definitions.get(m.id)!;
      return m.progress < def.targetValue;
    });

    if (this.active.length < before) {
      this.fillSlots();
    }

    if (changed) this.save();
  }

  private fillSlots(): void {
    const activeIds = new Set(this.active.map((m) => m.id));

    while (this.active.length < MAX_ACTIVE) {
      const available = MISSION_POOL.filter((d) => !activeIds.has(d.id));
      if (available.length === 0) break;

      const pick = available[Math.floor(Math.random() * available.length)]!;
      this.active.push({ id: pick.id, progress: 0 });
      activeIds.add(pick.id);
    }

    this.save();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MissionState[];
        // Only keep missions that still exist in the pool
        this.active = parsed.filter((m) => this.definitions.has(m.id));
      }
    } catch {
      this.active = [];
    }
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.active));
  }
}
