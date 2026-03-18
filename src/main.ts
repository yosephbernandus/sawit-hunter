import { Engine } from './core/Engine.ts';
import { setupScene } from './rendering/SceneSetup.ts';
import { getQualityTier } from './utils/DeviceDetect.ts';
import { initMaterials } from './rendering/MaterialLibrary.ts';
import { MenuScene } from './scenes/MenuScene.ts';
import { GameScene } from './scenes/GameScene.ts';
import { GameOverScene } from './scenes/GameOverScene.ts';
import { ShopScene } from './scenes/ShopScene.ts';
import { AudioManager } from './audio/AudioManager.ts';
import { CoinManager } from './systems/CoinManager.ts';
import { UpgradeManager } from './systems/UpgradeManager.ts';
import { EventBus } from './core/EventBus.ts';
import { Howler } from 'howler';

// iOS requires AudioContext to be resumed inside a user gesture
function unlockAudio(): void {
  if (Howler.ctx && Howler.ctx.state === 'suspended') {
    Howler.ctx.resume().catch(() => {});
  }
  document.removeEventListener('touchstart', unlockAudio);
  document.removeEventListener('touchend', unlockAudio);
  document.removeEventListener('click', unlockAudio);
}
document.addEventListener('touchstart', unlockAudio, { passive: true });
document.addEventListener('touchend', unlockAudio, { passive: true });
document.addEventListener('click', unlockAudio);

async function init() {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const loadingFill = document.getElementById('loadingFill') as HTMLElement;
  const loadingText = document.getElementById('loadingText') as HTMLElement;

  const setProgress = (pct: number, text: string) => {
    loadingFill.style.width = `${pct}%`;
    loadingText.textContent = text;
  };

  setProgress(15, 'Initializing engine...');
  const quality = getQualityTier();
  initMaterials(quality);
  const engine = new Engine(canvas);

  setProgress(30, 'Setting up scene...');
  setupScene(engine.threeScene, quality);

  setProgress(45, 'Loading audio...');
  const audio = new AudioManager();

  setProgress(60, 'Preparing scenes...');

  // Global coin/upgrade managers (persist across scenes via localStorage)
  const globalEventBus = new EventBus();
  const globalCoins = new CoinManager(globalEventBus);
  const upgradeManager = new UpgradeManager(globalCoins);

  const menuScene = new MenuScene(engine.camera, engine.threeScene, audio);
  const gameOverScene = new GameOverScene(audio);
  let currentPlayerName = 'Player';
  const gameScene = new GameScene(
    engine.threeScene,
    engine.camera,
    quality,
    audio,
    upgradeManager,
    (score, distance) => {
      gameOverScene.setResults(score, distance, currentPlayerName);
      engine.sceneManager.switch('gameOver');
    },
  );

  const shopScene = new ShopScene(upgradeManager, globalCoins, audio, () => {
    engine.sceneManager.switch('menu');
  });

  engine.sceneManager.register('menu', menuScene);
  engine.sceneManager.register('game', gameScene);
  engine.sceneManager.register('gameOver', gameOverScene);
  engine.sceneManager.register('shop', shopScene);

  setProgress(80, 'Almost ready...');

  // UI wiring
  document.getElementById('playBtn')!.addEventListener('click', () => {
    const nameInput = document.getElementById('usernameInput') as HTMLInputElement;
    currentPlayerName = nameInput.value.trim() || 'Player';
    gameScene.setPlayerName(currentPlayerName);
    engine.sceneManager.switch('game');
  });

  document.getElementById('shopBtn')?.addEventListener('click', () => {
    engine.sceneManager.switch('shop');
  });

  document.getElementById('restartBtn')!.addEventListener('click', () => {
    engine.sceneManager.switch('menu');
  });

  document.getElementById('usernameInput')!.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('playBtn')!.click();
    }
  });

  // Mute toggle
  const muteBtn = document.getElementById('muteBtn')!;
  muteBtn.addEventListener('click', () => {
    audio.toggleMute();
    muteBtn.textContent = audio.muted ? '\u{1F507}' : '\u{1F50A}';
  });

  setProgress(100, 'Ready!');

  await new Promise((r) => setTimeout(r, 400));
  document.getElementById('loadingScreen')!.classList.add('hidden');

  // Start
  engine.sceneManager.switch('menu');
  engine.start();

  // High score display
  const hs = localStorage.getItem('sawitHunterHighScore') ?? '0';
  const hsDisplay = document.getElementById('highScoreDisplay');
  if (hsDisplay && parseInt(hs, 10) > 0) {
    hsDisplay.textContent = `High Score: ${hs}`;
  }
}

init().catch(console.error);
