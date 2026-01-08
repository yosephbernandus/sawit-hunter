const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const gameContainer = document.getElementById("gameContainer");
const gameOverScreen = document.getElementById("gameOverScreen");
const gameOverText = document.getElementById("gameOverText");

const scoreSound = document.getElementById("scoreSound");
const deathSound = document.getElementById("deathSound");
const catchSound = document.getElementById("catchSound");
const spawnSound = document.getElementById("spawnSound");
const menuMusic = document.getElementById("menuMusic");
const endingMusic = document.getElementById("endingMusic");

// UI Elements
const scoreDisplay = document.getElementById("scoreDisplay");
const playerNameDisplay = document.getElementById("playerName");
const highScoreDisplay = document.getElementById("highScore");
const highScoreStart = document.getElementById("highScoreDisplay");
const finalScoreDisplay = document.getElementById("finalScore");

// Mobile controls
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");

let username = "";
let running = false;
let score = 0;
let highScore = Number(localStorage.getItem("highScore")) || 0;

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

	canvas.width = canvasWidth;
	canvas.height = canvasHeight;

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
		player.y = canvas.height * bucketPositionRatio;

		// Clamp position AFTER size is updated to prevent edge bug
		player.x = Math.max(0, Math.min(player.x, canvas.width - player.w));
	}

	// Adjust sawit position and size
	if (sawit) {
		// Slightly smaller sawit on mobile for better proportion
		sawit.size = isMobile ? 35 : 40;
		// Clamp position AFTER size is updated
		sawit.x = Math.max(0, Math.min(sawit.x, canvas.width - sawit.size));
	}
}

// Load images
const bucketImg = new Image();
bucketImg.src = "assets/svgs/bucket.svg";

const sawitImg = new Image();
sawitImg.src = "assets/svgs/sawit.svg";

// Player (Bucket) - initial values, will be adjusted by resizeCanvas()
let player = {
	x: 360,
	y: 380,
	w: 80,
	h: 50,
	speed: isMobileDevice() ? 10 : 8 // Faster movement on mobile for better control
};

// Sawit
let sawit = {
	x: Math.random() * 760,
	y: -40,
	size: 40,
	speed: 2.5  // Start slow for all devices
};

// Controls
const keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

// Mobile touch controls - Button based
let leftPressed = false;
let rightPressed = false;

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
		const scaleX = canvas.width / rect.width;
		const canvasX = touchX * scaleX;

		// Move bucket to follow finger, accounting for where user grabbed it
		player.x = canvasX - touchOffsetX;
		player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
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
		const scaleX = canvas.width / rect.width;
		const canvasX = mouseX * scaleX;

		// Move bucket to follow mouse, accounting for where user grabbed it
		player.x = canvasX - mouseOffsetX;
		player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
	} else {
		// Change cursor when hovering over bucket
		const rect = canvas.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
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

// Update UI
function updateUI() {
	scoreDisplay.textContent = score;
	playerNameDisplay.textContent = username;
	highScoreDisplay.textContent = highScore;
}

// Display high score on start screen
if (highScore > 0) {
	highScoreStart.textContent = `High Score: ${highScore}`;
}

// Start game
document.getElementById("playBtn").onclick = () => {
	username = document.getElementById("usernameInput").value.trim() || "Player";
	score = 0;

	// Stop menu music when starting game
	if (menuMusic) {
		menuMusic.pause();
		menuMusic.currentTime = 0;
	}

	// Resize canvas first to set proper dimensions
	resizeCanvas();

	// Reset game state with proper canvas dimensions
	sawit.speed = 2.5;  // Start slow for all devices
	sawit.y = -40;
	sawit.x = Math.random() * (canvas.width - sawit.size);
	player.x = canvas.width / 2 - player.w / 2;

	startScreen.style.display = "none";
	gameContainer.style.display = "flex";

	updateUI();

	running = true;
	gameLoop();

	spawnSound.currentTime = 0;
	spawnSound.play();
};

// Handle window resize
window.addEventListener("resize", () => {
	if (running) {
		resizeCanvas();
	}
});

function gameLoop() {
	if (!running) return;
	update();
	draw();
	requestAnimationFrame(gameLoop);
}

function update() {
	// Keyboard controls
	if (keys["ArrowLeft"] || keys["a"] || keys["A"]) player.x -= player.speed;
	if (keys["ArrowRight"] || keys["d"] || keys["D"]) player.x += player.speed;

	// Mobile/Touch controls
	if (leftPressed) player.x -= player.speed;
	if (rightPressed) player.x += player.speed;

	player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));

	sawit.y += sawit.speed;

	if (collide(player, sawit)) {
		catchSound.currentTime = 0;
		catchSound.play();
		spawnSound.pause();
		spawnSound.currentTime = 0;
		addScore(10);
		resetSawit();
	}

	if (sawit.y > canvas.height) {
		spawnSound.pause();
		spawnSound.currentTime = 0;
		die();
	}
}

function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.drawImage(bucketImg, player.x, player.y, player.w, player.h);
	ctx.drawImage(sawitImg, sawit.x, sawit.y, sawit.size, sawit.size);
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
		scoreSound.currentTime = 0;
		scoreSound.play();
	}
}

function resetSawit() {
	sawit.x = Math.random() * (canvas.width - sawit.size);
	sawit.y = -40;

	// Only increase speed after score reaches 50, then increment faster
	if (score >= 50) {
		sawit.speed += 0.3;  // Faster increment after score 50
	}

	spawnSound.currentTime = 0;
	spawnSound.play();
}

function collide(a, b) {
	return (
		a.x < b.x + b.size &&
		a.x + a.w > b.x &&
		a.y < b.y + b.size &&
		a.y + a.h > b.y
	);
}

function die() {
	running = false;
	deathSound.play();

	gameContainer.style.display = "none";
	gameOverScreen.style.display = "flex";
	gameOverText.textContent = `${username}, you missed a sawit!`;
	finalScoreDisplay.textContent = score;

	// Start ending music
	if (endingMusic) {
		endingMusic.currentTime = 0;
		endingMusic.play().catch(() => {
			// Handle autoplay restrictions
		});
	}
}

// Initialize canvas size
resizeCanvas();

// Start menu music when page loads (after user interaction)
// Try to play on first user interaction to avoid autoplay restrictions
let menuMusicStarted = false;
function startMenuMusic() {
	if (!menuMusicStarted && menuMusic) {
		menuMusic.volume = 0.6; // Set volume to 60%
		menuMusic.play().catch(() => {
			// Autoplay blocked, will start on button click
		});
		menuMusicStarted = true;
	}
}

// Start menu music on any user interaction
document.addEventListener("click", startMenuMusic, { once: true });
document.addEventListener("touchstart", startMenuMusic, { once: true });
document.addEventListener("keydown", startMenuMusic, { once: true });

// Handle Play Again button
document.getElementById("restartBtn").onclick = () => {
	// Stop ending music
	if (endingMusic) {
		endingMusic.pause();
		endingMusic.currentTime = 0;
	}
	// Reload page to restart game
	location.reload();
};

// Also ensure menu music plays when returning to start screen
// (when game over screen reloads the page, menu music will restart)
window.addEventListener("load", () => {
	// Menu music will start on first user interaction
});
