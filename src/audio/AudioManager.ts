import { Howl, Howler } from 'howler';

export type SoundId =
  | 'catch'
  | 'spawn'
  | 'milestone'
  | 'death'
  | 'powerup'
  | 'laneChange';

export type MusicId = 'menu' | 'gameOver';

const SOUND_DEFS: Record<SoundId, { path: string; volume: number; limit: number }> = {
  catch:      { path: '/assets/sounds/jokowi-kaget.mp3',              volume: 0.5, limit: 2 },
  spawn:      { path: '/assets/sounds/solid.mp3',                     volume: 0.4, limit: 1 },
  milestone:  { path: '/assets/sounds/hey-antek-antek-asing-prabowo.mp3', volume: 0.6, limit: 1 },
  death:      { path: '/assets/sounds/hidup-jokowi.mp3',              volume: 0.7, limit: 1 },
  powerup:    { path: '/assets/sounds/solid.mp3',                     volume: 0.5, limit: 1 },
  laneChange: { path: '/assets/sounds/solid.mp3',                     volume: 0.3, limit: 1 },
};

const MUSIC_PATHS: Record<MusicId, string> = {
  menu: '/assets/sounds/selamat-berjuang-jokowi.mp3',
  gameOver: '/assets/sounds/penyanyi-solo-gatau-siapa.mp3',
};

const MUSIC_VOLUME = 0.35;
const FADE_IN_MS = 600;

export class AudioManager {
  private sounds = new Map<SoundId, Howl>();
  private activeSfx = new Map<SoundId, number[]>(); // track active sound IDs per type
  private music = new Map<MusicId, Howl>();
  private currentMusicId: MusicId | null = null;
  private currentMusicSoundId: number | null = null;
  private _muted = false;

  constructor() {
    // SFX — each gets its own Howl
    for (const [id, def] of Object.entries(SOUND_DEFS)) {
      const howl = new Howl({
        src: [def.path],
        volume: def.volume,
        preload: true,
      });
      this.sounds.set(id as SoundId, howl);
      this.activeSfx.set(id as SoundId, []);
    }

    // Music — separate Howl per track
    for (const [id, path] of Object.entries(MUSIC_PATHS)) {
      this.music.set(id as MusicId, new Howl({
        src: [path],
        volume: MUSIC_VOLUME,
        loop: true,
        preload: true,
      }));
    }
  }

  play(id: SoundId): void {
    if (this._muted) return;
    const howl = this.sounds.get(id);
    if (!howl) return;

    const def = SOUND_DEFS[id];
    const active = this.activeSfx.get(id)!;

    // Enforce concurrency limit — stop oldest if at max
    while (active.length >= def.limit) {
      const oldest = active.shift();
      if (oldest !== undefined) {
        howl.stop(oldest);
      }
    }

    const soundId = howl.play();
    active.push(soundId);

    // Clean up when sound finishes
    howl.once('end', () => {
      const idx = active.indexOf(soundId);
      if (idx !== -1) active.splice(idx, 1);
    }, soundId);
  }

  stopAllSfx(): void {
    for (const [id, howl] of this.sounds) {
      howl.stop();
      this.activeSfx.get(id)!.length = 0;
    }
  }

  playMusic(id: MusicId): void {
    if (id === this.currentMusicId) return;

    // Force stop ALL music tracks immediately
    for (const [, howl] of this.music) {
      howl.stop();
    }

    const next = this.music.get(id);
    if (!next) return;

    this.currentMusicId = id;
    this.currentMusicSoundId = next.play();
    next.volume(0, this.currentMusicSoundId);
    next.fade(0, this._muted ? 0 : MUSIC_VOLUME, FADE_IN_MS, this.currentMusicSoundId);
  }

  stopMusic(): void {
    if (!this.currentMusicId) return;

    const current = this.music.get(this.currentMusicId);
    const soundId = this.currentMusicSoundId;
    this.currentMusicId = null;
    this.currentMusicSoundId = null;

    if (current) {
      if (soundId !== null) {
        // Short fade out then hard stop
        current.fade(current.volume(), 0, 300, soundId);
        setTimeout(() => current.stop(soundId), 350);
      } else {
        current.stop();
      }
    }
  }

  get muted(): boolean {
    return this._muted;
  }

  toggleMute(): void {
    this._muted = !this._muted;
    Howler.mute(this._muted);
  }

  dispose(): void {
    Howler.unload();
  }
}
