import { Howl, Howler } from 'howler';

export type SoundId =
  | 'catch'
  | 'spawn'
  | 'milestone'
  | 'death'
  | 'powerup'
  | 'laneChange';

export type MusicId = 'menu' | 'gameOver';

const SOUND_PATHS: Record<SoundId, string> = {
  catch: '/assets/sounds/jokowi-kaget.mp3',
  spawn: '/assets/sounds/solid.mp3',
  milestone: '/assets/sounds/hey-antek-antek-asing-prabowo.mp3',
  death: '/assets/sounds/hidup-jokowi.mp3',
  powerup: '/assets/sounds/solid.mp3',
  laneChange: '/assets/sounds/solid.mp3',
};

const MUSIC_PATHS: Record<MusicId, string> = {
  menu: '/assets/sounds/selamat-berjuang-jokowi.mp3',
  gameOver: '/assets/sounds/penyanyi-solo-gatau-siapa.mp3',
};

const MUSIC_VOLUME = 0.4;
const FADE_MS = 500;

export class AudioManager {
  private sounds = new Map<SoundId, Howl>();
  private music = new Map<MusicId, Howl>();
  private currentMusicId: MusicId | null = null;
  private _muted = false;

  constructor() {
    for (const [id, path] of Object.entries(SOUND_PATHS)) {
      this.sounds.set(id as SoundId, new Howl({
        src: [path],
        volume: 0.6,
        preload: true,
      }));
    }

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
    this.sounds.get(id)?.play();
  }

  playMusic(id: MusicId): void {
    if (id === this.currentMusicId) return;

    // Stop all music tracks immediately — no orphans
    for (const [trackId, howl] of this.music) {
      if (trackId !== id) {
        howl.stop();
      }
    }

    const next = this.music.get(id);
    if (!next) return;

    this.currentMusicId = id;
    next.volume(0);
    next.play();
    next.fade(0, this._muted ? 0 : MUSIC_VOLUME, FADE_MS);
  }

  stopMusic(): void {
    if (!this.currentMusicId) return;

    const current = this.music.get(this.currentMusicId);
    this.currentMusicId = null;

    if (current && current.playing()) {
      // Capture reference before async fade
      const toStop = current;
      toStop.fade(MUSIC_VOLUME, 0, FADE_MS);
      toStop.once('fade', () => {
        toStop.stop();
      });
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
