// PixiJS loaded from CDN - available as global PIXI object
const { Application, Assets, Sprite, Container, Graphics } = PIXI;

// Wait for DOM to be fully loaded before accessing elements
let canvas, startScreen, gameContainer, gameOverScreen, gameOverText;
let scoreSound, deathSound, catchSound, spawnSound, menuMusic, endingMusic;
let scoreDisplay, playerNameDisplay, highScoreDisplay, highScoreStart, finalScoreDisplay;
let leftBtn, rightBtn;

let username = "";
let running = false;
let score = 0;
let highScore = Number(localStorage.getItem("highScore")) || 0;

// Delta time tracking (same concept as your C++ implementation)
let lastTime = 0;
let deltaTime = 0;

// PixiJS Application
let app;
let bucketSprite;
let sawitSprite;
let snakeSprite;
let particleContainer;

// Detect if mobile device
function isMobileDevice() {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
		|| window.innerWidth < 768;
}

// Canvas sizing
function resizeCanvas() {
	const isMobile = isMobileDevice();

	// Different aspect ratios for mobile vs desktop
	const maxWidth = 800;
	const maxHeight = isMobile ? 600 : 450; // Taller canvas on mobile for more vertical space
	const aspectRatio = maxWidth / maxHeight;

	const windowWidth = window.innerWidth;
	const windowHeight = window.innerHeight;

	// Account for UI elements - less space needed on desktop
	const uiReservedSpace = isMobile ? 250 : 150;
	const availableHeight = windowHeight - uiReservedSpace;
	const availableWidth = Math.min(windowWidth - (isMobile ? 20 : 40), maxWidth);

	let canvasWidth = availableWidth;
	let canvasHeight = canvasWidth / aspectRatio;

	if (canvasHeight > availableHeight) {
		canvasHeight = availableHeight;
		canvasWidth = canvasHeight * aspectRatio;
	}

	// Resize PixiJS renderer
	if (app) {
		app.renderer.resize(canvasWidth, canvasHeight);
	}

	// Adjust player position - bucket positioned lower on mobile for more catching space
	if (player) {
		// Adjust bucket size on mobile for better visibility and control FIRST
		if (isMobile) {
			player.w = 70;
			player.h = 45;
		} else {
			player.w = 80;
			player.h = 50;
		}

		// On mobile, position bucket at 85% down (more space above)
		// On desktop, position bucket at 84% down
		const bucketPositionRatio = isMobile ? 0.88 : 0.84;
		player.y = app.renderer.height * bucketPositionRatio;

		// Clamp position AFTER size is updated to prevent edge bug
		player.x = Math.max(0, Math.min(player.x, app.renderer.width - player.w));

		// Update sprite if exists
		if (bucketSprite) {
			bucketSprite.width = player.w;
			bucketSprite.height = player.h;
			bucketSprite.x = player.x;
			bucketSprite.y = player.y;
		}
	}

	// Adjust sawit position and size
	if (sawit) {
		// Slightly smaller sawit on mobile for better proportion
		sawit.size = isMobile ? 35 : 40;
		// Clamp position AFTER size is updated
		sawit.x = Math.max(0, Math.min(sawit.x, app.renderer.width - sawit.size));

		// Update sprite if exists
		if (sawitSprite) {
			sawitSprite.width = sawit.size;
			sawitSprite.height = sawit.size;
			sawitSprite.x = sawit.x;
			sawitSprite.y = sawit.y;
		}
	}
}

// Player (Bucket) - initial values, will be adjusted by resizeCanvas()
// Speeds are now in pixels per SECOND (not per frame)
let player = {
	x: 360,
	y: 380,
	w: 80,
	h: 50,
	speed: isMobileDevice() ? 600 : 480 // pixels/second (was 10*60 and 8*60)
};

// Sawit
let sawit = {
	x: Math.random() * 760,
	y: -40,
	size: 40,
	speed: 150,  // pixels/second (was 2.5*60)
	caught: false  // Flag to prevent multiple collision detections
};

// Snake
let snake = null;
let snakeSpawnTimer = 0;
const SNAKE_SPAWN_INTERVAL = 5.0; // 5 seconds (in actual seconds, not frames)

// Controls
const keys = {};

// Initialize DOM-dependent code after DOM is loaded
function initializeGame() {
	// Get all DOM elements
	canvas = document.getElementById("gameCanvas");
	startScreen = document.getElementById("startScreen");
	gameContainer = document.getElementById("gameContainer");
	gameOverScreen = document.getElementById("gameOverScreen");
	gameOverText = document.getElementById("gameOverText");

	scoreSound = document.getElementById("scoreSound");
	deathSound = document.getElementById("deathSound");
	catchSound = document.getElementById("catchSound");
	spawnSound = document.getElementById("spawnSound");
	menuMusic = document.getElementById("menuMusic");
	endingMusic = document.getElementById("endingMusic");

	scoreDisplay = document.getElementById("scoreDisplay");
	playerNameDisplay = document.getElementById("playerName");
	highScoreDisplay = document.getElementById("highScore");
	highScoreStart = document.getElementById("highScoreDisplay");
	finalScoreDisplay = document.getElementById("finalScore");

	leftBtn = document.getElementById("leftBtn");
	rightBtn = document.getElementById("rightBtn");

	// Display high score on start screen
	if (highScore > 0) {
		highScoreStart.textContent = `High Score: ${highScore}`;
	}

	// Set up keyboard controls
	window.addEventListener("keydown", e => keys[e.key] = true);
	window.addEventListener("keyup", e => keys[e.key] = false);

	// Set up mobile and mouse controls
	setupControls();

	// Set up button handlers
	document.getElementById("playBtn").onclick = () => {
		username = document.getElementById("usernameInput").value.trim() || "Player";
		resetGame();
	};

	document.getElementById("restartBtn").onclick = () => {
		// Stop ending music
		if (endingMusic) {
			endingMusic.pause();
			endingMusic.currentTime = 0;
		}

		// Restart menu music
		if (menuMusic) {
			menuMusic.currentTime = 0;
			menuMusic.volume = 0.6;
			menuMusic.play().catch(() => {
				// Autoplay blocked
			});
			menuMusicStarted = true;
		}

		// Show start screen again (not game over screen)
		gameOverScreen.style.display = "none";
		startScreen.style.display = "flex";

		// Reset username input to current username
		document.getElementById("usernameInput").value = username;
	};

	// Start initialization
	initPixi().catch(console.error);

	// Fallback: Start menu music on any user interaction (if autoplay blocked)
	document.addEventListener("click", startMenuMusic, { once: true });
	document.addEventListener("touchstart", startMenuMusic, { once: true });
	document.addEventListener("keydown", startMenuMusic, { once: true });
}

// Mobile touch controls - Button based
let leftPressed = false;
let rightPressed = false;

function setupControls() {
	leftBtn.addEventListener("touchstart", (e) => {
	e.preventDefault();
	leftPressed = true;
});

leftBtn.addEventListener("touchend", (e) => {
	e.preventDefault();
	leftPressed = false;
});

leftBtn.addEventListener("mousedown", (e) => {
	e.preventDefault();
	leftPressed = true;
});

leftBtn.addEventListener("mouseup", (e) => {
	e.preventDefault();
	leftPressed = false;
});

rightBtn.addEventListener("touchstart", (e) => {
	e.preventDefault();
	rightPressed = true;
});

rightBtn.addEventListener("touchend", (e) => {
	e.preventDefault();
	rightPressed = false;
});

rightBtn.addEventListener("mousedown", (e) => {
	e.preventDefault();
	rightPressed = true;
});

rightBtn.addEventListener("mouseup", (e) => {
	e.preventDefault();
	rightPressed = false;
});

// Touch drag controls - Direct drag on canvas
let isTouching = false;
let touchOffsetX = 0;

canvas.addEventListener("touchstart", (e) => {
	e.preventDefault();
	const touch = e.touches[0];
	const rect = canvas.getBoundingClientRect();
	const touchX = touch.clientX - rect.left;
	const touchY = touch.clientY - rect.top;

	// Scale touch coordinates to canvas coordinates
	const scaleX = canvas.width / rect.width;
	const scaleY = canvas.height / rect.height;
	const canvasX = touchX * scaleX;
	const canvasY = touchY * scaleY;

	// Check if touching the bucket area
	if (canvasX >= player.x && canvasX <= player.x + player.w &&
		canvasY >= player.y && canvasY <= player.y + player.h) {
		isTouching = true;
		touchOffsetX = canvasX - player.x;
	}
});

canvas.addEventListener("touchmove", (e) => {
	e.preventDefault();
	if (isTouching) {
		const touch = e.touches[0];
		const rect = canvas.getBoundingClientRect();
		const touchX = touch.clientX - rect.left;

		// Scale touch coordinates to canvas coordinates
		const scaleX = app.renderer.width / rect.width;
		const canvasX = touchX * scaleX;

		// Move bucket to follow finger, accounting for where user grabbed it
		player.x = canvasX - touchOffsetX;
		player.x = Math.max(0, Math.min(app.renderer.width - player.w, player.x));
	}
});

canvas.addEventListener("touchend", (e) => {
	e.preventDefault();
	isTouching = false;
});

canvas.addEventListener("touchcancel", (e) => {
	e.preventDefault();
	isTouching = false;
});

// Mouse drag controls for desktop
let isMouseDragging = false;
let mouseOffsetX = 0;

canvas.addEventListener("mousedown", (e) => {
	const rect = canvas.getBoundingClientRect();
	const mouseX = e.clientX - rect.left;
	const mouseY = e.clientY - rect.top;

	// Scale mouse coordinates to canvas coordinates
	const scaleX = canvas.width / rect.width;
	const scaleY = canvas.height / rect.height;
	const canvasX = mouseX * scaleX;
	const canvasY = mouseY * scaleY;

	// Check if clicking the bucket area
	if (canvasX >= player.x && canvasX <= player.x + player.w &&
		canvasY >= player.y && canvasY <= player.y + player.h) {
		isMouseDragging = true;
		mouseOffsetX = canvasX - player.x;
		canvas.style.cursor = 'grabbing';
	}
});

canvas.addEventListener("mousemove", (e) => {
	if (isMouseDragging) {
		const rect = canvas.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;

		// Scale mouse coordinates to canvas coordinates
		const scaleX = app.renderer.width / rect.width;
		const canvasX = mouseX * scaleX;

		// Move bucket to follow mouse, accounting for where user grabbed it
		player.x = canvasX - mouseOffsetX;
		player.x = Math.max(0, Math.min(app.renderer.width - player.w, player.x));
	} else {
		// Change cursor when hovering over bucket
		const rect = canvas.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;
		const scaleX = app.renderer.width / rect.width;
		const scaleY = app.renderer.height / rect.height;
		const canvasX = mouseX * scaleX;
		const canvasY = mouseY * scaleY;

		if (canvasX >= player.x && canvasX <= player.x + player.w &&
			canvasY >= player.y && canvasY <= player.y + player.h) {
			canvas.style.cursor = 'grab';
		} else {
			canvas.style.cursor = 'default';
		}
	}
});

canvas.addEventListener("mouseup", () => {
	isMouseDragging = false;
	canvas.style.cursor = 'default';
});

canvas.addEventListener("mouseleave", () => {
	isMouseDragging = false;
	canvas.style.cursor = 'default';
});
}  // End of setupControls()

// Update UI
function updateUI() {
	scoreDisplay.textContent = score;
	playerNameDisplay.textContent = username;
	highScoreDisplay.textContent = highScore;
}

// Spawn snake when score >= 100 (every 5 seconds)
function spawnSnake() {
	if (!snake && app.snakeTexture) {
		// Snake spawns near sawit position, but not overlapping
		const snakeSize = 50;
		const snakeX = Math.max(0, Math.min(sawit.x + (Math.random() - 0.5) * 100, app.renderer.width - snakeSize));

		snake = {
			x: snakeX,
			y: -50,
			size: snakeSize,
			speed: 240  // pixels/second (faster than sawit which is 150)
		};

		// Create sprite for snake
		snakeSprite = new Sprite(app.snakeTexture);
		snakeSprite.x = snake.x;
		snakeSprite.y = snake.y;
		snakeSprite.width = snake.size;
		snakeSprite.height = snake.size;

		// Add snake sprite to stage (add before sawit so it renders behind)
		app.stage.addChildAt(snakeSprite, app.stage.getChildIndex(sawitSprite));
	}
}

// Reset game to initial state (reusable for Play and Play Again)
function resetGame() {
	score = 0;

	// Reset delta time tracking
	lastTime = 0;
	deltaTime = 0;

	// Stop menu music when starting game
	if (menuMusic) {
		menuMusic.pause();
		menuMusic.currentTime = 0;
	}

	// Remove any existing snake sprite from stage
	if (snakeSprite && app.stage.children.includes(snakeSprite)) {
		app.stage.removeChild(snakeSprite);
	}
	snakeSprite = null;
	snake = null;
	snakeSpawnTimer = 0;

	// Resize canvas first to set proper dimensions
	resizeCanvas();

	// Reset game state with proper canvas dimensions
	sawit.speed = 150;  // pixels/second - Start slow for all devices
	sawit.y = -40;
	sawit.x = Math.random() * (app.renderer.width - sawit.size);
	sawit.caught = false;  // Reset caught flag
	player.x = app.renderer.width / 2 - player.w / 2;

	// Hide all screens, show game
	startScreen.style.display = "none";
	gameOverScreen.style.display = "none";
	gameContainer.style.display = "flex";

	updateUI();

	running = true;
	gameLoop();

	// Play spawn sound for first sawit
	try {
		spawnSound.currentTime = 0;
		spawnSound.play();
	} catch (e) {
		// Ignore audio errors
	}
}

// Handle window resize
window.addEventListener("resize", () => {
	if (running) {
		resizeCanvas();
	}
});

function gameLoop(currentTime = 0) {
	if (!running) return;

	// Calculate delta time (same as your C++ implementation)
	// deltaTime = (SDL_GetTicks() - millisecsPreviousFrame) / 1000.0f
	if (lastTime === 0) {
		lastTime = currentTime;
	}
	deltaTime = (currentTime - lastTime) / 1000.0; // Convert ms to seconds
	lastTime = currentTime;

	update();
	draw();
	requestAnimationFrame(gameLoop);
}

function update() {
	const speedMultiplier = keys["Shift"] ? 2.0 : 1.0;

	// Keyboard controls (multiply by deltaTime for frame-rate independence)
	if (keys["ArrowLeft"] || keys["a"] || keys["A"]) player.x -= player.speed * speedMultiplier * deltaTime;
	if (keys["ArrowRight"] || keys["d"] || keys["D"]) player.x += player.speed * speedMultiplier * deltaTime;

	// Mobile/Touch controls (multiply by deltaTime)
	if (leftPressed) player.x -= player.speed * deltaTime;
	if (rightPressed) player.x += player.speed * deltaTime;

	if (player.x > app.renderer.width - player.w) {
		player.x = 0;
	} else if (player.x < 0) {
		player.x = app.renderer.width - player.w;
	}

	// Sawit movement (frame-rate independent)
	sawit.y += sawit.speed * deltaTime;

	// Handle snake spawning (every 5 seconds after score reaches 100)
	if (score >= 100) {
		snakeSpawnTimer += deltaTime; // Add actual elapsed time in seconds
		if (snakeSpawnTimer >= SNAKE_SPAWN_INTERVAL && !snake) {
			spawnSnake();
			snakeSpawnTimer = 0;
		}
	}

	// Update snake position if it exists (frame-rate independent)
	if (snake) {
		snake.y += snake.speed * deltaTime;

		// Check collision with bucket - snake collision = game over
		if (collide(player, snake)) {
			die(`${username}, you hit a snake!`);
			return;
		}

		// Remove snake if it goes off screen
		if (snake.y > app.renderer.height) {
			if (snakeSprite && app.stage.children.includes(snakeSprite)) {
				app.stage.removeChild(snakeSprite);
			}
			snakeSprite = null;
			snake = null;
		}
	}

	// Only check collision if sawit hasn't been caught yet
	if (!sawit.caught && collide(player, sawit)) {
		sawit.caught = true;  // Mark as caught immediately to prevent multiple detections

		// Play catch sound
		try {
			catchSound.currentTime = 0;
			catchSound.play();
		} catch (e) {
			// Ignore audio errors
		}

		// Create particle burst effect at catch position
		createParticleBurst(sawit.x + sawit.size / 2, sawit.y + sawit.size / 2);

		addScore(10);
		resetSawit();  // Reset immediately
	}

	// Only trigger game over if sawit passed the bottom and wasn't caught
	if (!sawit.caught && sawit.y > app.renderer.height) {
		try {
			spawnSound.pause();
			spawnSound.currentTime = 0;
		} catch (e) {
			// Ignore audio errors
		}
		die();
	}
}

function draw() {
	// Update sprite positions (PixiJS handles rendering automatically)
	if (bucketSprite) {
		bucketSprite.x = player.x;
		bucketSprite.y = player.y;
		bucketSprite.width = player.w;
		bucketSprite.height = player.h;
	}

	if (sawitSprite) {
		sawitSprite.x = sawit.x;
		sawitSprite.y = sawit.y;
		sawitSprite.width = sawit.size;
		sawitSprite.height = sawit.size;
	}

	if (snakeSprite && snake) {
		snakeSprite.x = snake.x;
		snakeSprite.y = snake.y;
		snakeSprite.width = snake.size;
		snakeSprite.height = snake.size;
	}

	// PixiJS automatically renders the scene via WebGL!
}

// ===== PARTICLE EFFECTS (WebGL Benefits!) =====
function createParticleBurst(x, y) {
	const particleCount = 15;
	const particles = [];

	// Colors for particles (green/yellow for palm theme)
	const colors = [0x4CAF50, 0x8BC34A, 0xCDDC39, 0xFFEB3B, 0xFFC107];

	for (let i = 0; i < particleCount; i++) {
		const particle = new Graphics();
		const size = Math.random() * 6 + 3;
		const color = colors[Math.floor(Math.random() * colors.length)];

		particle.circle(0, 0, size);
		particle.fill(color);
		particle.x = x;
		particle.y = y;

		// Random velocity for burst effect
		const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
		const speed = Math.random() * 4 + 2;
		particle.vx = Math.cos(angle) * speed;
		particle.vy = Math.sin(angle) * speed;
		particle.life = 1.0; // Start at full life
		particle.gravity = 0.15;

		particleContainer.addChild(particle);
		particles.push(particle);
	}

	// Animate particles
	function animateParticles() {
		for (let i = particles.length - 1; i >= 0; i--) {
			const p = particles[i];
			p.x += p.vx;
			p.y += p.vy;
			p.vy += p.gravity; // Apply gravity
			p.life -= 0.03; // Fade out
			p.alpha = p.life;

			// Remove dead particles
			if (p.life <= 0) {
				particleContainer.removeChild(p);
				particles.splice(i, 1);
			}
		}

		// Continue animation if particles remain
		if (particles.length > 0) {
			requestAnimationFrame(animateParticles);
		}
	}

	animateParticles();
}

// ===== SCORE LOGIC =====
function addScore(amount) {
	const prev = score;
	score += amount;
	updateUI();

	// Update high score
	if (score > highScore) {
		highScore = score;
		localStorage.setItem("highScore", highScore);
		updateUI();
	}

	// sound ONLY once per 100
	if (Math.floor(prev / 100) !== Math.floor(score / 100)) {
		try {
			scoreSound.currentTime = 0;
			scoreSound.play();
		} catch (e) {
			// Ignore audio errors
		}
	}
}

function resetSawit() {
	sawit.x = Math.random() * (app.renderer.width - sawit.size);
	sawit.y = -40;
	sawit.caught = false;  // Reset caught flag for new sawit

	// Only increase speed after score reaches 50
	// Speed is in pixels/second, so increase by 18 (0.3*60 converted)
	if (score >= 50) {
		sawit.speed += 18;
	}

	// Play spawn sound
	try {
		spawnSound.currentTime = 0;
		spawnSound.play();
	} catch (e) {
		// Ignore audio errors
	}
}

function collide(a, b) {
	return (
		a.x < b.x + b.size &&
		a.x + a.w > b.x &&
		a.y < b.y + b.size &&
		a.y + a.h > b.y
	);
}

function die(customMessage = null) {
	running = false;

	// Play death sound
	try {
		deathSound.play();
	} catch (e) {
		// Ignore audio errors
	}

	gameContainer.style.display = "none";
	gameOverScreen.style.display = "flex";
	gameOverText.textContent = customMessage || `${username}, you missed a sawit!`;
	finalScoreDisplay.textContent = score;

	// Start ending music
	if (endingMusic) {
		endingMusic.currentTime = 0;
		endingMusic.play().catch(() => {
			// Handle autoplay restrictions
		});
	}
}

// Loading screen elements
const loadingScreen = document.getElementById('loadingScreen');
const loadingFill = document.getElementById('loadingFill');
const loadingText = document.getElementById('loadingText');

// Menu music state
let menuMusicStarted = false;

// Update loading progress
function updateLoadingProgress(progress, text) {
	loadingFill.style.width = `${progress}%`;
	loadingText.textContent = text;
}

// Initialize PixiJS with parallel loading
async function initPixi() {
	try {
		updateLoadingProgress(10, 'Initializing renderer...');

		// Create PixiJS application
		app = new Application();

		await app.init({
			canvas: canvas,
			background: 'transparent',
			backgroundAlpha: 0,
			antialias: true,
			resolution: window.devicePixelRatio || 1,
			autoDensity: true,
			width: 800,
			height: 450
		});

		updateLoadingProgress(30, 'Loading game assets...');

		// ✅ PARALLEL LOADING - Load all textures at once!
		const [bucketTexture, sawitTexture, snakeTexture] = await Promise.all([
			Assets.load('assets/svgs/bucket.svg'),
			Assets.load('assets/png/sawit-new.webp'),
			Assets.load('assets/png/snake.png')
		]);

		updateLoadingProgress(70, 'Creating sprites...');

		// Create sprites
		bucketSprite = new Sprite(bucketTexture);
		bucketSprite.x = player.x;
		bucketSprite.y = player.y;
		bucketSprite.width = player.w;
		bucketSprite.height = player.h;

		sawitSprite = new Sprite(sawitTexture);
		sawitSprite.x = sawit.x;
		sawitSprite.y = sawit.y;
		sawitSprite.width = sawit.size;
		sawitSprite.height = sawit.size;

		// Store snake texture for later creation
		app.snakeTexture = snakeTexture;

		// Create particle container
		particleContainer = new Container();

		// Add sprites to stage
		app.stage.addChild(bucketSprite);
		app.stage.addChild(sawitSprite);
		app.stage.addChild(particleContainer);

		updateLoadingProgress(90, 'Finalizing...');

		// Resize canvas to fit
		resizeCanvas();

		updateLoadingProgress(100, 'Ready!');

		// Start menu music after assets loaded
		if (menuMusic && !menuMusicStarted) {
			menuMusic.volume = 0.6; // Set volume to 60%
			menuMusic.play().then(() => {
				menuMusicStarted = true;
				// Music started successfully!
			}).catch(() => {
				// Autoplay blocked - will start on first user click/touch
			});
		}

		// Wait a bit to show 100%, then show start screen
		setTimeout(() => {
			loadingScreen.style.display = 'none';
			startScreen.style.display = 'flex';
		}, 500);

	} catch (error) {
		console.error('Failed to initialize game:', error);
		updateLoadingProgress(0, 'Error loading game. Please refresh.');
	}
}

// Fallback: Start menu music on user interaction if autoplay was blocked
function startMenuMusic() {
	if (!menuMusicStarted && menuMusic) {
		menuMusic.volume = 0.6;
		menuMusic.play().then(() => {
			menuMusicStarted = true;
		}).catch(() => {
			// Still blocked - browser restriction
		});
	}
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initializeGame);
} else {
	// DOM already loaded
	initializeGame();
}
