"use strict";

// Change these values during the live demo, then reload the page.
function getGameSettings() {
  return {
    forwardSpeed: 120, // How fast the pipes move left, in pixels per second.
    flapSpeed: 300,    // The bird's upward speed after a flap.
    gravity: 900,      // Downward acceleration, in pixels per second squared.
    pipeGap: 108,      // Space between the upper and lower pipes.
    pipeSpacing: 180,  // Horizontal distance between pairs of pipes.
    width: 288,
    height: 512,
    groundHeight: 112,
    birdX: 68,
    birdStartY: 200,
    birdRadius: 10,
    pipeWidth: 52
  };
}

function createGame(config = getGameSettings(), random = Math.random, best = 0) {
  const positive = ["forwardSpeed", "flapSpeed", "gravity", "pipeSpacing", "width", "height", "groundHeight", "birdRadius", "pipeWidth"];
  if (positive.some(key => !Number.isFinite(config[key]) || config[key] <= 0)) {
    throw new RangeError("Game dimensions and speeds must be positive numbers.");
  }
  const floor = config.height - config.groundHeight;
  if (!Number.isFinite(config.pipeGap) || config.pipeGap < config.birdRadius * 2 + 12 || config.pipeGap > floor - 96) {
    throw new RangeError("The pipe gap must fit between the sky and the ground.");
  }
  if (!Number.isFinite(config.birdStartY) || config.birdStartY < config.birdRadius || config.birdStartY > floor - config.birdRadius ||
      !Number.isFinite(config.birdX) || config.birdX < config.birdRadius || config.birdX > config.width - config.birdRadius ||
      config.pipeSpacing <= config.pipeWidth + config.birdRadius * 2) {
    throw new RangeError("The bird and pipe spacing must fit the play area.");
  }
  best = Number.isSafeInteger(best) && best >= 0 ? best : 0;
  return {
    config: { ...config }, random, phase: "ready", score: 0, best,
    previousBest: best, bird: { y: config.birdStartY, velocity: 0 },
    pipes: [], groundOffset: 0, time: 0, overTime: 0, fallTime: 0
  };
}

function addPipe(game, x) {
  const c = game.config;
  const edge = 48 + c.pipeGap / 2;
  const centerY = edge + game.random() * (c.height - c.groundHeight - edge * 2);
  game.pipes.push({ x, centerY, counted: false });
}

function flapGame(game) {
  if (game.phase === "ready") {
    game.phase = "playing";
    addPipe(game, game.config.width + 60);
  }
  if (game.phase !== "playing") return false;
  game.bird.velocity = -game.config.flapSpeed;
  return true;
}

function circleTouchesRectangle(x, y, radius, left, top, width, height) {
  const nearX = Math.max(left, Math.min(x, left + width));
  const nearY = Math.max(top, Math.min(y, top + height));
  return (x - nearX) ** 2 + (y - nearY) ** 2 <= radius ** 2;
}

function stepGame(game, delta) {
  if (!Number.isFinite(delta) || delta <= 0 || game.phase === "ready" || game.phase === "paused") return;
  const dt = Math.min(delta, 0.05);
  const c = game.config;
  const floor = c.height - c.groundHeight;
  game.time += dt;
  if (game.phase === "over") { game.overTime += dt; return; }

  game.bird.velocity += c.gravity * dt;
  game.bird.y += game.bird.velocity * dt;
  if (game.bird.y < c.birdRadius) {
    game.bird.y = c.birdRadius;
    game.bird.velocity = 0;
  }
  if (game.phase === "falling") game.fallTime += dt;
  if (game.bird.y + c.birdRadius >= floor) {
    game.bird.y = floor - c.birdRadius;
    game.bird.velocity = 0;
    game.phase = "over";
    game.best = Math.max(game.best, game.score);
    return;
  }
  if (game.phase !== "playing") return;

  game.groundOffset = (game.groundOffset + c.forwardSpeed * dt) % 24;
  if (!game.pipes.length) addPipe(game, c.width + 60);
  for (const pipe of game.pipes) {
    pipe.x -= c.forwardSpeed * dt;
    const gapTop = pipe.centerY - c.pipeGap / 2;
    const gapBottom = pipe.centerY + c.pipeGap / 2;
    const hit = circleTouchesRectangle(c.birdX, game.bird.y, c.birdRadius, pipe.x, 0, c.pipeWidth, gapTop) ||
      circleTouchesRectangle(c.birdX, game.bird.y, c.birdRadius, pipe.x, gapBottom, c.pipeWidth, floor - gapBottom);
    if (hit) {
      game.phase = "falling";
      game.fallTime = 0;
      game.best = Math.max(game.best, game.score);
      return;
    }
    if (!pipe.counted && pipe.x + c.pipeWidth < c.birdX) {
      pipe.counted = true;
      game.score += 1;
      game.best = Math.max(game.best, game.score);
    }
  }
  game.pipes = game.pipes.filter(pipe => pipe.x + c.pipeWidth > -4);
  if (!game.pipes.length) addPipe(game, c.width + 60);
  while (game.pipes.at(-1).x < c.width + c.pipeSpacing) {
    addPipe(game, game.pipes.at(-1).x + c.pipeSpacing);
  }
}

function resetGame(game) {
  Object.assign(game, createGame(game.config, game.random, game.best));
}

function togglePause(game) {
  if (game.phase === "playing") game.phase = "paused";
  else if (game.phase === "paused") game.phase = "playing";
}

if (typeof module !== "undefined") module.exports = {
  getGameSettings, createGame, flapGame, stepGame, resetGame, togglePause
};

// A tiny bitmap font keeps the artwork self-contained and crisp offline.
const PIXEL_FONT = {
  A:"01110/10001/10001/11111/10001/10001/10001", B:"11110/10001/10001/11110/10001/10001/11110",
  C:"01111/10000/10000/10000/10000/10000/01111", D:"11110/10001/10001/10001/10001/10001/11110",
  E:"11111/10000/10000/11110/10000/10000/11111", F:"11111/10000/10000/11110/10000/10000/10000",
  G:"01111/10000/10000/10111/10001/10001/01111", H:"10001/10001/10001/11111/10001/10001/10001",
  I:"11111/00100/00100/00100/00100/00100/11111", J:"00111/00010/00010/00010/10010/10010/01100",
  K:"10001/10010/10100/11000/10100/10010/10001", L:"10000/10000/10000/10000/10000/10000/11111",
  M:"10001/11011/10101/10101/10001/10001/10001", N:"10001/11001/10101/10011/10001/10001/10001",
  O:"01110/10001/10001/10001/10001/10001/01110", P:"11110/10001/10001/11110/10000/10000/10000",
  Q:"01110/10001/10001/10001/10101/10010/01101", R:"11110/10001/10001/11110/10100/10010/10001",
  S:"01111/10000/10000/01110/00001/00001/11110", T:"11111/00100/00100/00100/00100/00100/00100",
  U:"10001/10001/10001/10001/10001/10001/01110", V:"10001/10001/10001/10001/10001/01010/00100",
  W:"10001/10001/10001/10101/10101/10101/01010", X:"10001/10001/01010/00100/01010/10001/10001",
  Y:"10001/10001/01010/00100/00100/00100/00100", Z:"11111/00001/00010/00100/01000/10000/11111",
  0:"01110/10001/10011/10101/11001/10001/01110", 1:"00100/01100/00100/00100/00100/00100/01110",
  2:"01110/10001/00001/00010/00100/01000/11111", 3:"11110/00001/00001/01110/00001/00001/11110",
  4:"00010/00110/01010/10010/11111/00010/00010", 5:"11111/10000/10000/11110/00001/00001/11110",
  6:"01110/10000/10000/11110/10001/10001/01110", 7:"11111/00001/00010/00100/01000/01000/01000",
  8:"01110/10001/10001/01110/10001/10001/01110", 9:"01110/10001/10001/01111/00001/00001/01110",
  "!":"00100/00100/00100/00100/00100/00000/00100", "*":"00100/00100/11111/01110/01110/01010/10001",
  " ":"00000/00000/00000/00000/00000/00000/00000"
};

function pixelText(ctx, label, centerX, y, scale, fill = "#ffffff", outline = "#543847") {
  const letters = String(label).toUpperCase().split("");
  const left = Math.round(centerX - (letters.length * 6 - 1) * scale / 2);
  function paint(color, padding, offsetY) {
    ctx.fillStyle = color;
    letters.forEach((letter, index) => {
      const rows = (PIXEL_FONT[letter] || PIXEL_FONT[" "]).split("/");
      rows.forEach((row, rowIndex) => {
        for (let col = 0; col < row.length; col++) if (row[col] === "1") {
          ctx.fillRect(left + (index * 6 + col) * scale - padding, y + rowIndex * scale - padding + offsetY, scale + padding * 2, scale + padding * 2);
        }
      });
    });
  }
  if (outline) { paint(outline, 1, 2); paint(outline, 1, 0); }
  paint(fill, 0, 0);
}

function pixelDisc(ctx, x, y, radius, color) {
  ctx.fillStyle = color;
  for (let row = -radius; row <= radius; row++) {
    const half = Math.floor(Math.sqrt(radius * radius - row * row));
    ctx.fillRect(x - half, y + row, half * 2 + 1, 1);
  }
}

function paintBackground(ctx, config) {
  const floor = config.height - config.groundHeight;
  ctx.fillStyle = "#71c5cf";
  ctx.fillRect(0, 0, config.width, config.height);
  for (let x = -22; x < config.width + 70; x += 66) {
    pixelDisc(ctx, x, floor - 65, 25, "#e6f2bc");
    pixelDisc(ctx, x + 25, floor - 63, 19, "#e6f2bc");
    ctx.fillStyle = "#e6f2bc";
    ctx.fillRect(x - 25, floor - 65, 88, 65);
  }
  const heights = [35, 50, 28, 45, 61, 41, 53, 31, 49, 38, 56, 33];
  heights.forEach((height, i) => {
    const x = i * 27 - 10;
    const top = floor - 24 - height;
    ctx.fillStyle = "#9bd2c2";
    ctx.fillRect(x, top, 23, height);
    ctx.fillStyle = "#c5e7cf";
    ctx.fillRect(x + 2, top + 2, 19, height - 2);
    ctx.fillStyle = "#a4d8c4";
    for (let row = top + 6; row < floor - 28; row += 10) {
      for (let col = x + 5; col < x + 20; col += 7) ctx.fillRect(col, row, 4, 6);
    }
  });
  for (let x = -9; x < config.width + 30; x += 20) {
    pixelDisc(ctx, x, floor - 8, 17, "#75bd65");
    pixelDisc(ctx, x - 1, floor - 10, 14, "#91d278");
  }
  ctx.fillStyle = "#ded895";
  ctx.fillRect(0, floor, config.width, config.groundHeight);
}

function drawPipe(ctx, x, y, height, width, lipAtBottom) {
  x = Math.round(x);
  ctx.fillStyle = "#543847";
  ctx.fillRect(x + 2, y, width - 4, height);
  ctx.fillStyle = "#75bc35";
  ctx.fillRect(x + 4, y, width - 8, height);
  ctx.fillStyle = "#c0e765";
  ctx.fillRect(x + 6, y, 7, height);
  ctx.fillStyle = "#91d347";
  ctx.fillRect(x + 13, y, 8, height);
  ctx.fillStyle = "#568e2e";
  ctx.fillRect(x + width - 9, y, 4, height);
  const lipY = lipAtBottom ? y + height - 24 : y;
  ctx.fillStyle = "#543847";
  ctx.fillRect(x, lipY, width, 24);
  ctx.fillStyle = "#79bf39";
  ctx.fillRect(x + 2, lipY + 2, width - 4, 20);
  ctx.fillStyle = "#d1ea79";
  ctx.fillRect(x + 4, lipY + 3, 7, 17);
  ctx.fillStyle = "#99d64b";
  ctx.fillRect(x + 11, lipY + 3, 9, 17);
  ctx.fillStyle = "#568e2e";
  ctx.fillRect(x + width - 8, lipY + 3, 4, 18);
  ctx.fillStyle = "#bce66b";
  ctx.fillRect(x + 4, lipY + 3, width - 12, 2);
}

function drawGround(ctx, game, animationTime, reducedMotion) {
  const c = game.config;
  const floor = c.height - c.groundHeight;
  const offset = game.phase === "ready" && !reducedMotion ? animationTime * c.forwardSpeed : game.groundOffset;
  ctx.fillStyle = "#543847";
  ctx.fillRect(0, floor, c.width, 2);
  ctx.fillStyle = "#d3ed8c";
  ctx.fillRect(0, floor + 2, c.width, 2);
  ctx.fillStyle = "#77bf43";
  ctx.fillRect(0, floor + 4, c.width, 9);
  ctx.fillStyle = "#a1d65b";
  for (let x = -24 - Math.floor(offset % 24); x < c.width + 24; x += 12) {
    for (let row = 0; row < 3; row++) ctx.fillRect(x + row * 3, floor + 4 + row * 3, 6, 3);
  }
  ctx.fillStyle = "#577737";
  ctx.fillRect(0, floor + 13, c.width, 2);
  ctx.fillStyle = "#f2e4a7";
  ctx.fillRect(0, floor + 15, c.width, 3);
  ctx.fillStyle = "#c6bf7c";
  ctx.fillRect(0, floor + 18, c.width, 2);
}

const BIRD_PIXELS = [
  ".....oooooo......", "...ooyyyyyyoo....", "..oyyyyylllwwwo..",
  ".oyyyyyllwwwwwwo.", "oyyyyyyllwwwkwwo.", "oyyyyyyllwwwkwwo.",
  "oyyyyyyyywwwwwwo.", "oyyyyyyyyyrrrrrro", ".oyyyyyyyorrrrrro",
  "..oyyyyyyyobbbbo.", "...ooyyyyoo......", ".....oooo........"
];
const BIRD_COLORS = { o:"#543847", y:"#f7c531", l:"#fff29b", w:"#fffef6", k:"#282430", r:"#f2643e", b:"#be4832" };

function drawBird(ctx, game, animationTime, reducedMotion) {
  const ready = game.phase === "ready";
  const bob = ready && !reducedMotion ? Math.sin(animationTime * 5) * 3 : 0;
  let angle = Math.max(-0.35, Math.min(1.5, (game.bird.velocity - 70) / 380));
  if (ready) angle = 0;
  if (game.phase === "falling") angle = Math.min(Math.PI / 2, 0.35 + game.fallTime * 4);
  if (game.phase === "over") angle = Math.PI / 2;
  ctx.save();
  ctx.translate(game.config.birdX, Math.round(game.bird.y + bob));
  ctx.rotate(angle);
  BIRD_PIXELS.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (BIRD_COLORS[row[x]]) {
      ctx.fillStyle = BIRD_COLORS[row[x]];
      ctx.fillRect(x * 2 - 17, y * 2 - 12, 2, 2);
    }
  });
  const animate = !reducedMotion && ["ready", "playing"].includes(game.phase);
  const wing = animate ? Math.floor((ready ? animationTime : game.time) * 10) % 3 : 1;
  const wingY = [-3, 0, 3][wing];
  ctx.fillStyle = "#543847";
  ctx.fillRect(-15, wingY, 12, 8);
  ctx.fillStyle = "#fff0aa";
  ctx.fillRect(-13, wingY, 8, 5);
  ctx.fillStyle = "#e8b743";
  ctx.fillRect(-11, wingY + 5, 8, 3);
  ctx.restore();
}

function drawReady(ctx) {
  pixelText(ctx, "FLAPPY BIRD", 144, 66, 3, "#f6dc67");
  pixelText(ctx, "GET READY!", 144, 126, 3, "#f5d64c");
  const hand = ["..oo.....", ".owwo....", ".owwo....", ".owwo....", ".owwooo..", ".owwwwwo.", "oowwwwwwo", "owwwwwwwo", ".owwwwwwo", "..owwwwo.", "..owwwwo.", "..oooooo."];
  hand.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] !== ".") {
      ctx.fillStyle = row[x] === "o" ? "#543847" : "#fffdf0";
      ctx.fillRect(135 + x * 2, 262 + y * 2, 2, 2);
    }
  });
  ctx.fillStyle = "#543847";
  ctx.fillRect(163, 264, 43, 20);
  ctx.fillStyle = "#f2644b";
  ctx.fillRect(165, 266, 39, 16);
  pixelText(ctx, "TAP", 185, 270, 1, "#fffdf0", null);
}

function drawGameOver(ctx, game) {
  pixelText(ctx, "GAME OVER", 144, 113, 3, "#f4bf50");
  ctx.fillStyle = "#543847";
  ctx.fillRect(35, 170, 218, 117);
  ctx.fillStyle = "#f4e7ab";
  ctx.fillRect(37, 172, 214, 112);
  ctx.fillStyle = "#ded598";
  ctx.fillRect(40, 176, 208, 105);
  pixelText(ctx, "MEDAL", 87, 189, 1, "#817b54", null);
  pixelDisc(ctx, 87, 232, 22, "#b6ae75");
  pixelDisc(ctx, 87, 231, 19, "#c9c18a");
  if (game.score >= 10) {
    const color = game.score >= 30 ? "#f9d246" : game.score >= 20 ? "#d9e8e6" : "#dca16b";
    pixelDisc(ctx, 87, 231, 19, "#fff2be");
    pixelDisc(ctx, 87, 231, 16, color);
    pixelText(ctx, "*", 87, 221, 2, "#ffffff", null);
  }
  pixelText(ctx, "SCORE", 207, 187, 1, "#817b54", null);
  pixelText(ctx, game.score, 211, 202, 2);
  pixelText(ctx, "BEST", 210, 235, 1, "#817b54", null);
  pixelText(ctx, game.best, 211, 250, 2);
  if (game.score > game.previousBest) pixelText(ctx, "NEW", 169, 255, 1, "#df6544", null);
  ctx.fillStyle = "#543847";
  ctx.fillRect(102, 310, 84, 34);
  ctx.fillStyle = "#fff7d0";
  ctx.fillRect(104, 312, 80, 30);
  ctx.fillStyle = "#e96f3c";
  ctx.fillRect(107, 315, 74, 24);
  pixelText(ctx, "OK", 144, 319, 2);
}

function drawGame(ctx, backdrop, game, animationTime, reducedMotion) {
  const c = game.config;
  ctx.drawImage(backdrop, 0, 0);
  for (const pipe of game.pipes) {
    const top = Math.round(pipe.centerY - c.pipeGap / 2);
    const bottom = Math.round(pipe.centerY + c.pipeGap / 2);
    drawPipe(ctx, pipe.x, 0, top, c.pipeWidth, true);
    drawPipe(ctx, pipe.x, bottom, c.height - c.groundHeight - bottom, c.pipeWidth, false);
  }
  drawGround(ctx, game, animationTime, reducedMotion);
  drawBird(ctx, game, animationTime, reducedMotion);
  if (game.phase !== "over") pixelText(ctx, game.score, c.width / 2, 23, 4);
  if (game.phase === "ready") drawReady(ctx);
  if (game.phase === "over") drawGameOver(ctx, game);
  if (game.phase === "paused") {
    ctx.fillStyle = "#263b4266";
    ctx.fillRect(0, 0, c.width, c.height - c.groundHeight);
    pixelText(ctx, "PAUSED", 144, 170, 3, "#f6dc67");
    pixelText(ctx, "TAP TO RESUME", 144, 216, 1);
  }
  if (game.phase === "falling" && game.fallTime < 0.1 && !reducedMotion) {
    ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - game.fallTime / 0.1)})`;
    ctx.fillRect(0, 0, c.width, c.height);
  }
}

function bootGame() {
  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const status = document.querySelector("#game-status");
  const soundButton = document.querySelector("#sound");
  const pauseButton = document.querySelector("#pause");
  if (!ctx) { status.textContent = "This browser cannot display the game."; return; }
  ctx.imageSmoothingEnabled = false;
  let best = 0;
  try { best = Number(localStorage.getItem("flappybird-showcase.best") || 0); } catch {}
  let game;
  try { game = createGame(getGameSettings(), Math.random, best); }
  catch (error) { status.textContent = error.message; throw error; }
  const backdrop = document.createElement("canvas");
  backdrop.width = game.config.width;
  backdrop.height = game.config.height;
  paintBackground(backdrop.getContext("2d"), game.config);
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let soundOn = true;
  let audio;
  let frameRequest = 0;
  let previousTime = performance.now();
  let accumulator = 0;
  let lastStatus = "";

  function playSound(kind) {
    if (!soundOn) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audio ||= new Audio();
      if (audio.state === "suspended") audio.resume().catch(() => {});
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const [start, end, duration] = kind === "point" ? [880, 1320, 0.09] : kind === "hit" ? [150, 42, 0.16] : [650, 250, 0.055];
      oscillator.type = kind === "hit" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(start, audio.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(end, audio.currentTime + duration);
      gain.gain.setValueAtTime(0.045, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + duration);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch { /* A blocked audio device must not stop the game. */ }
  }

  function updateStatus() {
    const current = `${game.phase}:${game.score}`;
    if (current === lastStatus) return;
    lastStatus = current;
    const labels = {
      ready: "Get ready. Press Space, Arrow Up, click, or tap to start.",
      playing: `Flying. Score ${game.score}.`,
      paused: "Paused. Press P or tap to resume.",
      falling: `Game over. Score ${game.score}.`,
      over: `Game over. Score ${game.score}. Best ${game.best}. Press Space or tap to try again.`
    };
    status.textContent = labels[game.phase];
    canvas.setAttribute("aria-label", labels[game.phase]);
    pauseButton.hidden = !["playing", "paused"].includes(game.phase);
    pauseButton.setAttribute("aria-label", game.phase === "paused" ? "Resume game" : "Pause game");
    pauseButton.textContent = game.phase === "paused" ? "▶" : "Ⅱ";
  }

  function scheduleFrame() {
    if (!frameRequest && !document.hidden) frameRequest = requestAnimationFrame(frame);
  }

  function frame(now) {
    frameRequest = 0;
    accumulator += Math.min((now - previousTime) / 1000, 0.05);
    previousTime = now;
    const oldScore = game.score;
    const oldPhase = game.phase;
    // A fixed timestep makes the game behave the same at 60 Hz and 120 Hz.
    while (accumulator >= 1 / 120) {
      stepGame(game, 1 / 120);
      accumulator -= 1 / 120;
    }
    if (game.score > oldScore) playSound("point");
    if (oldPhase === "playing" && ["falling", "over"].includes(game.phase)) {
      playSound("hit");
      try { localStorage.setItem("flappybird-showcase.best", String(game.best)); } catch {}
    }
    drawGame(ctx, backdrop, game, now / 1000, motion.matches);
    updateStatus();
    const animating = ["playing", "falling"].includes(game.phase) ||
      (game.phase === "ready" && !motion.matches) || (game.phase === "over" && game.overTime < 0.8);
    if (animating) scheduleFrame();
  }

  function act() {
    if (game.phase === "over") {
      if (game.overTime < 0.65) return;
      resetGame(game);
    } else if (game.phase === "paused") togglePause(game);
    else if (flapGame(game)) playSound("flap");
    previousTime = performance.now();
    accumulator = 0;
    scheduleFrame();
  }

  canvas.addEventListener("pointerdown", event => {
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    act();
  });
  document.addEventListener("keydown", event => {
    if (event.repeat || event.target.closest("button, a, input, textarea, select")) return;
    if (["Space", "ArrowUp"].includes(event.code)) { event.preventDefault(); act(); }
    if (event.code === "KeyP") {
      event.preventDefault();
      togglePause(game);
      previousTime = performance.now();
      accumulator = 0;
      scheduleFrame();
    }
  });
  soundButton.addEventListener("click", () => {
    soundOn = !soundOn;
    soundButton.textContent = "Sound: " + (soundOn ? "on" : "off");
    soundButton.setAttribute("aria-pressed", String(soundOn));
  });
  pauseButton.addEventListener("click", () => {
    togglePause(game);
    previousTime = performance.now();
    accumulator = 0;
    scheduleFrame();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && game.phase === "playing") togglePause(game);
    if (frameRequest) cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    previousTime = performance.now();
    accumulator = 0;
    scheduleFrame();
  });
  motion.addEventListener("change", scheduleFrame);
  document.querySelector("#version").textContent = "v" + document.querySelector('meta[name="application-version"]').content;
  scheduleFrame();
}

if (typeof document !== "undefined") bootGame();
