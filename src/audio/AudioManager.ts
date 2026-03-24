import { Howl, Howler } from 'howler';

export type SoundId =
  | 'catch'
  | 'spawn'
  | 'milestone'
  | 'death'
  | 'powerup'
  | 'laneChange';

export type MusicId = 'menu' | 'gameOver' | 'battle';

const SOUND_DEFS: Record<SoundId, { path: string; volume: number; limit: number }> = {
  catch: { path: '/assets/sounds/kaget.mp3', volume: 0.5, limit: 2 },
  spawn: { path: '/assets/sounds/solid.mp3', volume: 0.4, limit: 1 },
  milestone: { path: '/assets/sounds/hey-antek-antek-asing.mp3', volume: 0.6, limit: 1 },
  death: { path: '/assets/sounds/hidup.mp3', volume: 0.7, limit: 1 },
  powerup: { path: '/assets/sounds/solid.mp3', volume: 0.5, limit: 1 },
  laneChange: { path: '/assets/sounds/solid.mp3', volume: 0.3, limit: 1 },
};

const MUSIC_PATHS: Partial<Record<MusicId, string>> = {
  menu: '/assets/sounds/selamat-berjuang.mp3',
  battle: '/assets/sounds/the-raising-spirit-battle.mp3',
};

const GAME_OVER_TRACKS = [
  '/assets/sounds/penyanyi-solo-gatau-siapa.mp3',
  '/assets/sounds/fu-arc-opening-anime.mp3',
  '/assets/sounds/seventeen.mp3',
  '/assets/sounds/diantara-ku-dan-sawit.mp3',
];

const MUSIC_VOLUME = 0.35;
const FADE_IN_MS = 300; // reduced from 600 for snappier feel on mobile

export class AudioManager {
  private sounds = new Map<SoundId, Howl>();
  private activeSfx = new Map<SoundId, number[]>();
  private music = new Map<MusicId, Howl>();
  private gameOverHowls: Howl[] = [];
  private currentMusicId: MusicId | null = null;
  private currentMusicSoundId: number | null = null;
  private _muted = false;

  constructor() {
    // Force Web Audio API for lower latency (Howler falls back to HTML5 on some mobile)
    Howler.usingWebAudio = true;

    // SFX — force Web Audio, no HTML5 fallback
    for (const [id, def] of Object.entries(SOUND_DEFS)) {
      const howl = new Howl({
        src: [def.path],
        volume: def.volume,
        preload: true,
        html5: false,
      });
      this.sounds.set(id as SoundId, howl);
      this.activeSfx.set(id as SoundId, []);
    }

    // Music tracks — html5 for streaming (reduces memory)
    for (const [id, path] of Object.entries(MUSIC_PATHS)) {
      this.music.set(id as MusicId, new Howl({
        src: [path],
        volume: MUSIC_VOLUME,
        loop: true,
        preload: true,
        html5: true,
      }));
    }

    // Game over tracks — html5 for streaming
    for (const path of GAME_OVER_TRACKS) {
      this.gameOverHowls.push(new Howl({
        src: [path],
        volume: MUSIC_VOLUME,
        loop: true,
        preload: true,
        html5: true,
      }));
    }
  }

  play(id: SoundId): void {
    if (this._muted) return;
    const howl = this.sounds.get(id);
    if (!howl) return;

    const def = SOUND_DEFS[id];
    const active = this.activeSfx.get(id)!;

    // Enforce concurrency limit
    while (active.length >= def.limit) {
      const oldest = active.shift();
      if (oldest !== undefined) howl.stop(oldest);
    }

    const soundId = howl.play();
    active.push(soundId);

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
    // Stop everything currently playing
    for (const [, howl] of this.music) howl.stop();
    for (const howl of this.gameOverHowls) howl.stop();
    this.currentMusicId = null;
    this.currentMusicSoundId = null;

    let next: Howl;
    if (id === 'gameOver') {
      const idx = parseInt(localStorage.getItem('sawitGameOverTrack') ?? '0', 10);
      next = this.gameOverHowls[idx % this.gameOverHowls.length]!;
      localStorage.setItem('sawitGameOverTrack', String((idx + 1) % this.gameOverHowls.length));
    } else {
      const found = this.music.get(id);
      if (!found) return;
      next = found;
    }

    this.currentMusicId = id;
    this.currentMusicSoundId = next.play();
    next.volume(0, this.currentMusicSoundId);
    next.fade(0, this._muted ? 0 : MUSIC_VOLUME, FADE_IN_MS, this.currentMusicSoundId);
  }

  stopMusic(): void {
    if (!this.currentMusicId) return;

    this.currentMusicId = null;
    this.currentMusicSoundId = null;

    // Hard-stop all music immediately (no fade delay on mobile)
    for (const [, howl] of this.music) howl.stop();
    for (const howl of this.gameOverHowls) howl.stop();
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
