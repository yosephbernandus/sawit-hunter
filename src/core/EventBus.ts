import type * as THREE from 'three';

export type GameEvents = {
  SAWIT_CAUGHT: { points: number; position: THREE.Vector3 };
  OBSTACLE_HIT: { type: string };
  POWERUP_COLLECTED: { type: string };
  SPEED_MILESTONE: { speed: number; score: number };
  GAME_OVER: { finalScore: number; distance: number };
  SCORE_CHANGED: { score: number; highScore: number };
  DISTANCE_CHANGED: { distance: number };
  POWERUP_ACTIVATED: { type: string; duration: number };
  POWERUP_EXPIRED: { type: string };
};

type EventHandler<T> = (data: T) => void;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler<unknown>>>();

  on<K extends keyof GameEvents>(
    event: K,
    handler: EventHandler<GameEvents[K]>,
  ): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>);
  }

  off<K extends keyof GameEvents>(
    event: K,
    handler: EventHandler<GameEvents[K]>,
  ): void {
    this.handlers.get(event)?.delete(handler as EventHandler<unknown>);
  }

  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void {
    this.handlers.get(event)?.forEach((handler) => handler(data));
  }

  clear(): void {
    this.handlers.clear();
  }
}
