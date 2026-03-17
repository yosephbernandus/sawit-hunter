import { Engine } from './core/Engine.ts';
import { setupScene } from './rendering/SceneSetup.ts';
import { getQualityTier } from './utils/DeviceDetect.ts';
import { MenuScene } from './scenes/MenuScene.ts';
import { GameScene } from './scenes/GameScene.ts';
import { GameOverScene } from './scenes/GameOverScene.ts';
import { AudioManager } from './audio/AudioManager.ts';

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
  const engine = new Engine(canvas);

  setProgress(30, 'Setting up scene...');
  setupScene(engine.threeScene, quality);

  setProgress(45, 'Loading audio...');
  const audio = new AudioManager();

  setProgress(60, 'Preparing scenes...');

  const menuScene = new MenuScene(engine.camera, engine.threeScene, audio);
  const gameOverScene = new GameOverScene(audio);
  let currentPlayerName = 'Player';
  const gameScene = new GameScene(
    engine.threeScene,
    engine.camera,
    quality,
    audio,
    (score, distance) => {
      gameOverScene.setResults(score, distance, currentPlayerName);
      engine.sceneManager.switch('gameOver');
    },
  );

  engine.sceneManager.register('menu', menuScene);
  engine.sceneManager.register('game', gameScene);
  engine.sceneManager.register('gameOver', gameOverScene);

  setProgress(80, 'Almost ready...');

  // UI wiring
  document.getElementById('playBtn')!.addEventListener('click', () => {
    const nameInput = document.getElementById('usernameInput') as HTMLInputElement;
    currentPlayerName = nameInput.value.trim() || 'Player';
    gameScene.setPlayerName(currentPlayerName);
    engine.sceneManager.switch('game');
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
