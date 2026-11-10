"use strict";

// Change these values during the live demo, then reload the page.
function getGameSettings() {
  return {
    forwardSpeed: 240, // How fast the pipes move left, in pixels per second.
    flapSpeed: 300,    // The bird's upward speed after a flap.
    gravity: 900,      // Downward acceleration, in pixels per second squared.
    pipeGap: 148,      // Space between the upper and lower pipes.
    pipeSpacing: 180,  // Horizontal distance between pairs of pipes.
    rocketMode: true,
    width: 288,
    height: 512,
    groundHeight: 32,
    birdX: 68,
    birdStartY: 200,
    birdRadius: 10,
    pipeWidth: 52
  };
}

const POWERS = {
  jetpack: { name: 'JETPACK', hint: 'HOLD TO RISE', color: '#ffb347', duration: 6 },
  boost: { name: 'ROCKET BOOST', hint: 'SMASH THROUGH', color: '#ff694f', duration: 3.2 },
  shield: { name: 'ION SHIELD', hint: 'ONE HIT SAVED', color: '#69f4dc', duration: 9 },
  slow: { name: 'TIME WARP', hint: 'TAKE A BREATH', color: '#b8a0ff', duration: 6 },
  pulse: { name: 'NOVA PULSE', hint: 'CLEAR THE SKY', color: '#ffe586', duration: 1.2 }
};

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
    pipes: [], groundOffset: 0, time: 0, overTime: 0, fallTime: 0,
    pickups: [], power: null, notice: null, debris: [], grace: 0,
    pipeCount: 0, pickupCount: 0, thrust: false, powerSerial: 0
  };
}

function addPipe(game, x) {
  const c = game.config;
  const edge = 48 + c.pipeGap / 2;
  const centerY = edge + game.random() * (c.height - c.groundHeight - edge * 2);
  game.pipes.push({ x, centerY, counted: false });
  game.pipeCount++;
  if (c.rocketMode && game.pipeCount % 5 === 0) {
    const types = Object.keys(POWERS);
    game.pickups.push({ x: x + c.pipeWidth / 2, y: centerY,
      type: types[game.pickupCount++ % types.length] });
  }
}

function breakPipe(game, pipe) {
  if (!pipe.counted) { game.score++; game.best = Math.max(game.best, game.score); }
  const floor = game.config.height - game.config.groundHeight;
  for (let i = 0; i < 12; i++) {
    game.debris.push({ x: pipe.x + (i % 3) * 18, y: i < 6 ? pipe.centerY - 80 - i * 9 : pipe.centerY + 80 + (i - 6) * 9,
      vx: -90 - (i % 4) * 45, vy: (i % 2 ? 1 : -1) * (40 + i * 9), life: 0.7,
      color: i % 2 ? '#c0e765' : '#568e2e' });
  }
  game.debris = game.debris.filter(p => p.y > 0 && p.y < floor).slice(-60);
  game.pipes = game.pipes.filter(p => p !== pipe);
}

function activatePower(game, type) {
  if (!POWERS[type] || game.phase !== 'playing') return;
  const spec = POWERS[type];
  game.power = { type, remaining: spec.duration, duration: spec.duration };
  game.notice = { type, label: spec.name, remaining: 1.6 };
  game.powerSerial++;
  game.grace = Math.max(game.grace, 0.3);
  if (type === 'jetpack') game.bird.velocity = Math.min(game.bird.velocity, -110);
  if (type === 'boost') game.bird.velocity = 0;
  if (type === 'pulse') {
    for (const pipe of [...game.pipes]) {
      if (pipe.x < game.config.width + 40 && pipe.x + game.config.pipeWidth > game.config.birdX - 20) breakPipe(game, pipe);
    }
    game.grace = 1;
  }
}

function flapGame(game) {
  if (game.phase === "ready") {
    game.phase = "playing";
    addPipe(game, game.config.birdX + 280);
    if (game.config.rocketMode) {
      game.pickups.push({ type: 'jetpack', x: game.config.birdX + 110, y: Math.max(48, game.config.birdStartY - 45) });
      game.pickupCount = 1;
    }
  }
  if (game.phase !== "playing") return false;
  if (game.power?.type === 'boost') return false;
  game.bird.velocity = game.power?.type === 'jetpack' ? -150 : -game.config.flapSpeed;
  return true;
}

function circleTouchesRectangle(x, y, radius, left, top, width, height) {
  const nearX = Math.max(left, Math.min(x, left + width));
  const nearY = Math.max(top, Math.min(y, top + height));
  return (x - nearX) ** 2 + (y - nearY) ** 2 <= radius ** 2;
}

function stepGame(game, delta) {
  if (!Number.isFinite(delta) || delta <= 0 || game.phase === "ready" || game.phase === "paused") return;
  const elapsed = Math.min(delta, 0.05);
  const c = game.config;
  const floor = c.height - c.groundHeight;
  game.time += elapsed;
  if (game.phase === "over") { game.overTime += elapsed; return; }
  game.grace = Math.max(0, game.grace - elapsed);
  if (game.notice) {
    game.notice.remaining -= elapsed;
    if (game.notice.remaining <= 0) game.notice = null;
  }
  for (const p of game.debris) {
    p.life -= elapsed; p.x += p.vx * elapsed; p.y += p.vy * elapsed; p.vy += 300 * elapsed;
  }
  game.debris = game.debris.filter(p => p.life > 0);
  if (game.power) {
    game.power.remaining -= elapsed;
    if (game.power.remaining <= 0) {
      if (game.power.type === 'boost' || game.power.type === 'jetpack') game.grace = Math.max(game.grace, 0.8);
      game.power = null;
    }
  }
  const type = game.phase === 'playing' ? game.power?.type : undefined;
  const dt = elapsed * (type === 'slow' ? 0.5 : 1);
  const speed = c.forwardSpeed * (type === 'boost' ? 2.8 : 1);

  if (type === 'boost' && game.phase === 'playing') {
    game.bird.y += (floor * 0.48 - game.bird.y) * Math.min(1, elapsed * 5);
    game.bird.velocity = 0;
  } else {
    game.bird.velocity += (type === 'jetpack' ? c.gravity * 0.65 - (game.thrust ? 1100 : 0) : c.gravity) * dt;
    if (type === 'jetpack') game.bird.velocity = Math.max(-155, Math.min(175, game.bird.velocity));
    game.bird.y += game.bird.velocity * dt;
  }
  if (game.bird.y < c.birdRadius) {
    game.bird.y = c.birdRadius;
    game.bird.velocity = 0;
  }
  if (game.phase === "falling") game.fallTime += dt;
  if (game.bird.y + c.birdRadius >= floor) {
    if (game.phase === 'playing' && (game.grace > 0 || type === 'shield')) {
      if (type === 'shield' && game.grace <= 0) {
        game.power = null; game.grace = 1;
        game.notice = { type: 'shield', label: 'HIT ABSORBED', remaining: 1.2 };
      }
      game.bird.y = floor - c.birdRadius - 2;
      game.bird.velocity = -240;
      return;
    }
    game.bird.y = floor - c.birdRadius;
    game.bird.velocity = 0;
    game.phase = "over";
    game.power = null; game.thrust = false;
    game.best = Math.max(game.best, game.score);
    return;
  }
  if (game.phase !== "playing") return;

  game.groundOffset = (game.groundOffset + speed * dt) % 24;
  if (!game.pipes.length) addPipe(game, c.width + 60);
  for (const pickup of game.pickups) {
    pickup.x -= speed * dt;
    if (Math.hypot(pickup.x - c.birdX, pickup.y - game.bird.y) < c.birdRadius + 38) {
      activatePower(game, pickup.type);
      pickup.collected = true;
    }
  }
  game.pickups = game.pickups.filter(p => !p.collected && p.x > -24);
  for (const pipe of [...game.pipes]) {
    pipe.x -= speed * dt;
    const gapTop = pipe.centerY - c.pipeGap / 2;
    const gapBottom = pipe.centerY + c.pipeGap / 2;
    const hit = circleTouchesRectangle(c.birdX, game.bird.y, c.birdRadius, pipe.x, 0, c.pipeWidth, gapTop) ||
      circleTouchesRectangle(c.birdX, game.bird.y, c.birdRadius, pipe.x, gapBottom, c.pipeWidth, floor - gapBottom);
    if (game.power?.type === 'boost' && pipe.x < c.birdX + 45 && pipe.x + c.pipeWidth > c.birdX - 35) {
      breakPipe(game, pipe);
      continue;
    }
    if (hit) {
      if (game.power?.type === 'shield') {
        game.power = null; game.grace = 1;
        game.notice = { type: 'shield', label: 'HIT ABSORBED', remaining: 1.2 };
        breakPipe(game, pipe);
        continue;
      }
      if (game.grace > 0) continue;
      game.phase = "falling";
      game.power = null; game.thrust = false;
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

function createRecording(game) {
  return { version: 1, startedAt: new Date().toISOString(), fps: 120,
    config: { ...game.config }, frames: [] };
}

function resizeGameViewport(game, width) {
  const birdX = Math.max(68, Math.round(width * 0.22));
  const shift = birdX - game.config.birdX;
  game.config.width = width;
  game.config.birdX = birdX;
  for (const item of [...game.pipes, ...game.pickups, ...game.debris]) item.x += shift;
}

function recordFrame(recording, game) {
  const { phase, score, best, previousBest, bird, pipes, groundOffset, time, overTime, fallTime,
    power, pickups, notice, debris, grace, thrust, powerSerial } = game;
  recording.frames.push({ phase, score, best, previousBest, bird: { ...bird },
    pipes: pipes.map(pipe => ({ ...pipe })), groundOffset, time, overTime, fallTime,
    power: power ? { ...power } : null, pickups: pickups.map(p => ({ ...p })),
    notice: notice ? { ...notice } : null, debris: debris.map(p => ({ ...p })), grace, thrust, powerSerial,
    viewport: { width: game.config.width, birdX: game.config.birdX } });
}

function applyReplayFrame(game, frame) {
  Object.assign(game, { power: null, pickups: [], notice: null, debris: [], grace: 0, thrust: false, powerSerial: 0 }, frame);
  if (frame.viewport) {
    game.config.width = frame.viewport.width;
    game.config.birdX = frame.viewport.birdX;
  }
}

if (typeof module !== "undefined") module.exports = {
  getGameSettings, createGame, flapGame, stepGame, resetGame, togglePause,
  createRecording, recordFrame, activatePower, applyReplayFrame, resizeGameViewport
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
  Array.from({ length: Math.ceil(config.width / 27) + 1 }, (_, i) => heights[i % heights.length]).forEach((height, i) => {
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
  if (game.power?.type === 'boost') angle = -0.06;
  if (game.power?.type === 'jetpack') angle *= 0.3;
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

const POWER_ICONS = {
  jetpack: ['.##.##.', '#######', '#..#..#', '#######', '.##.##.', '.##.##.', '..#.#..'],
  boost: ['....#..', '...###.', '..####.', '.#####.', '.####..', '###....', '#.#....'],
  shield: ['#######', '#######', '##...##', '##.#.##', '.##.##.', '..###..', '...#...'],
  slow: ['#######', '.#####.', '..###..', '...#...', '..###..', '.#####.', '#######'],
  pulse: ['...#...', '.#.#.#.', '..###..', '#######', '..###..', '.#.#.#.', '...#...']
};

function powerIcon(ctx, type, x, y, scale = 2, color = '#fff5d7') {
  ctx.fillStyle = color;
  for (const [row, pixels] of POWER_ICONS[type].entries()) {
    for (let col = 0; col < pixels.length; col++) {
      if (pixels[col] === '#') ctx.fillRect(Math.round(x + (col - 3.5) * scale), Math.round(y + (row - 3.5) * scale), scale, scale);
    }
  }
}

function drawPickup(ctx, pickup, time, reducedMotion) {
  const { color } = POWERS[pickup.type];
  const x = Math.round(pickup.x);
  const y = Math.round(pickup.y + (reducedMotion ? 0 : Math.sin(time * 4) * 3));
  ctx.save();
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 30);
  glow.addColorStop(0, color + '80'); glow.addColorStop(1, color + '00');
  ctx.fillStyle = glow; ctx.fillRect(x - 30, y - 30, 60, 60);
  ctx.strokeStyle = color; ctx.lineWidth = 1;
  ctx.strokeRect(x - 18, y - 18, 36, 36);
  ctx.fillStyle = '#172c3a';
  ctx.fillRect(x - 14, y - 16, 28, 32);
  ctx.fillRect(x - 16, y - 12, 32, 24);
  ctx.fillStyle = color; ctx.fillRect(x - 12, y - 15, 24, 2);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 13, y - 13, 2, 8);
  powerIcon(ctx, pickup.type, x, y, 2, color);
  if (!reducedMotion) for (let i = 0; i < 3; i++) {
    const a = time * 1.6 + i * Math.PI * 2 / 3;
    ctx.fillStyle = '#fff5dc';
    ctx.fillRect(Math.round(x + Math.cos(a) * 23), Math.round(y + Math.sin(a) * 23), 2, 2);
  }
  ctx.restore();
}

function drawPowerAtmosphere(ctx, game, reducedMotion) {
  const type = game.power?.type;
  if (!type) return;
  const { width, height, groundHeight } = game.config;
  const floor = height - groundHeight;
  const colors = { boost: '#1e1a3ec9', slow: '#20194391', jetpack: '#3c243333', shield: '#07334444', pulse: '#53351844' };
  ctx.fillStyle = colors[type]; ctx.fillRect(0, 0, width, floor);
  if (reducedMotion) return;
  ctx.save();
  ctx.strokeStyle = POWERS[type].color;
  ctx.lineWidth = 1;
  for (let i = 0; i < 24; i++) {
    const fast = type === 'boost';
    const x = width - ((game.time * (fast ? 650 : 45) + i * 73.31) % (width + 80));
    const y = 24 + ((i * 97.13) % (floor - 48));
    ctx.globalAlpha = 0.15 + (i % 4) * 0.08;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (fast ? 18 + i % 25 : 2), y); ctx.stroke();
  }
  if (type === 'slow') {
    ctx.globalAlpha = 0.16;
    ctx.beginPath(); ctx.arc(width - 42, 130, 63, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      ctx.beginPath(); ctx.moveTo(width - 42 + Math.cos(angle) * 53, 130 + Math.sin(angle) * 53);
      ctx.lineTo(width - 42 + Math.cos(angle) * 60, 130 + Math.sin(angle) * 60); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(width - 42, 130); ctx.lineTo(width - 42 + Math.cos(game.time) * 42, 130 + Math.sin(game.time) * 42); ctx.stroke();
  }
  ctx.restore();
}

function drawPowerVehicle(ctx, game, reducedMotion) {
  const type = game.power?.type;
  const x = game.config.birdX;
  const y = Math.round(game.bird.y);
  const t = game.time;
  const flame = reducedMotion ? 0 : Math.floor(t * 28) % 3;
  ctx.save();
  if (type === 'boost') {
    const trail = ctx.createLinearGradient(0, y, x, y);
    trail.addColorStop(0, '#ff694f00'); trail.addColorStop(1, '#ffb347aa');
    ctx.fillStyle = trail; ctx.fillRect(0, y - 9, x, 20);
    ctx.fillStyle = '#ff5a36';
    ctx.beginPath(); ctx.moveTo(x - 24, y - 9); ctx.lineTo(x - 80 - flame * 6, y + 2); ctx.lineTo(x - 24, y + 14); ctx.fill();
    ctx.fillStyle = '#ffcc63';
    ctx.beginPath(); ctx.moveTo(x - 25, y - 6); ctx.lineTo(x - 65 - flame * 5, y + 2); ctx.lineTo(x - 25, y + 11); ctx.fill();
    ctx.fillStyle = '#fff6c8'; ctx.fillRect(x - 42 - flame * 3, y - 2, 22 + flame * 3, 8);
    // The bird rides a chunky, riveted rocket rather than changing its hitbox.
    ctx.fillStyle = '#402c43'; ctx.fillRect(x - 27, y - 9, 66, 26);
    ctx.fillStyle = '#b9d6dd'; ctx.fillRect(x - 24, y - 7, 56, 22);
    ctx.fillStyle = '#f5f4da'; ctx.fillRect(x - 20, y - 6, 52, 6);
    ctx.fillStyle = '#5e8392'; ctx.fillRect(x - 20, y + 10, 52, 5);
    ctx.fillStyle = '#fa7352';
    ctx.beginPath(); ctx.moveTo(x + 30, y - 8); ctx.lineTo(x + 51, y + 3); ctx.lineTo(x + 30, y + 16); ctx.fill();
    ctx.fillRect(x - 18, y - 17, 14, 9); ctx.fillRect(x - 18, y + 16, 14, 9);
    ctx.fillStyle = '#4a5267'; ctx.fillRect(x - 29, y - 8, 6, 24);
    ctx.fillStyle = '#ffe6a3'; ctx.fillRect(x + 20, y - 3, 4, 4);
    ctx.fillStyle = '#69e3ed'; ctx.fillRect(x - 2, y - 18, 23, 10);
  } else if (type === 'jetpack') {
    const hot = game.thrust;
    ctx.fillStyle = '#543847'; ctx.fillRect(x - 25, y - 12, 12, 26);
    ctx.fillStyle = '#91abb9'; ctx.fillRect(x - 23, y - 10, 9, 22);
    ctx.fillStyle = '#e6eeee'; ctx.fillRect(x - 22, y - 9, 3, 18);
    ctx.fillStyle = '#ff8c4b'; ctx.fillRect(x - 24, y - 3, 10, 5);
    ctx.fillStyle = '#3b4257'; ctx.fillRect(x - 24, y + 10, 12, 5);
    const length = hot ? 25 + flame * 5 : 8 + flame * 2;
    ctx.fillStyle = '#ff653c'; ctx.fillRect(x - 22, y + 15, 8, length);
    ctx.fillStyle = '#ffd46a'; ctx.fillRect(x - 20, y + 15, 4, length - 4);
    ctx.fillStyle = '#fff7cc'; ctx.fillRect(x - 20, y + 15, 3, hot ? 13 : 4);
  }
  if (type === 'shield' || (game.grace > 0 && type !== 'boost')) {
    const radius = type === 'shield' ? 29 : 25;
    ctx.fillStyle = '#69f4dc22'; ctx.strokeStyle = '#c1fff2'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#69f4dc'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, radius + 4, -1.2, 0.6); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 19, y - 19, 3, 3);
  }
  if (type === 'slow') {
    for (let i = 3; i > 0; i--) {
      ctx.globalAlpha = 0.1 + i * 0.015; pixelDisc(ctx, x - i * 12, y, 12 - i, '#d6baff');
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawPowerBurst(ctx, game, reducedMotion) {
  const n = game.notice;
  if (!n || reducedMotion) return;
  const age = 1.6 - n.remaining;
  const color = POWERS[n.type].color;
  ctx.save();
  if (n.type === 'pulse') {
    ctx.strokeStyle = color;
    for (let i = 0; i < 3; i++) {
      const radius = Math.max(0, age * 350 - i * 28);
      ctx.globalAlpha = Math.max(0, 0.8 - age * 0.55);
      ctx.lineWidth = i === 0 ? 4 : 1;
      ctx.beginPath(); ctx.arc(game.config.birdX, game.bird.y, radius, 0, Math.PI * 2); ctx.stroke();
    }
  }
  if (age < 0.7) for (let i = 0; i < 14; i++) {
    const angle = i * 2.39996;
    const radius = 18 + age * (60 + i % 4 * 35);
    ctx.globalAlpha = Math.max(0, 1 - age / 0.7); ctx.fillStyle = i % 3 ? color : '#fff8da';
    ctx.fillRect(Math.round(game.config.birdX + Math.cos(angle) * radius), Math.round(game.bird.y + Math.sin(angle) * radius), 3, 3);
  }
  ctx.restore();
}

function drawPowerNotice(ctx, game) {
  if (game.notice && game.phase === 'playing') {
    const spec = POWERS[game.notice.type];
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.notice.remaining * 3);
    pixelText(ctx, game.notice.label, game.config.width / 2, 60, 1, spec.color);
    ctx.restore();
  }
}

function drawReady(ctx, game) {
  pixelText(ctx, 'FLAPPY BIRD', game.config.width / 2, 100, 3, '#fff0b0');
  pixelText(ctx, 'TAP TO FLY', game.config.width / 2, 290, 1, '#fff9db');
}

function drawGameOver(ctx, game) {
  const center = game.config.width / 2;
  ctx.fillStyle = '#17283266'; ctx.fillRect(0, 0, game.config.width, game.config.height - game.config.groundHeight);
  pixelText(ctx, 'GAME OVER', center, 138, 3, '#ffe0a0');
  pixelText(ctx, 'SCORE ' + game.score, center, 204, 2);
  pixelText(ctx, 'BEST ' + game.best, center, 235, 1, '#e1eadb');
  pixelText(ctx, 'TAP TO RETRY', center, 300, 1, '#fff9db');
}

function drawGame(ctx, backdrop, game, animationTime, reducedMotion) {
  const c = game.config;
  ctx.save();
  if (!reducedMotion && game.power?.type === 'boost' && game.phase === 'playing') {
    ctx.translate(Math.sin(game.time * 73) * 0.7, Math.cos(game.time * 61) * 0.7);
  }
  ctx.drawImage(backdrop, 0, 0);
  drawPowerAtmosphere(ctx, game, reducedMotion);
  for (const pipe of game.pipes) {
    const top = Math.round(pipe.centerY - c.pipeGap / 2);
    const bottom = Math.round(pipe.centerY + c.pipeGap / 2);
    drawPipe(ctx, pipe.x, 0, top, c.pipeWidth, true);
    drawPipe(ctx, pipe.x, bottom, c.height - c.groundHeight - bottom, c.pipeWidth, false);
  }
  for (const pickup of game.pickups) drawPickup(ctx, pickup, game.time, reducedMotion);
  for (const p of reducedMotion ? [] : game.debris) {
    ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 6, 9);
  }
  ctx.globalAlpha = 1;
  drawGround(ctx, game, animationTime, reducedMotion);
  drawPowerVehicle(ctx, game, reducedMotion);
  drawBird(ctx, game, animationTime, reducedMotion);
  drawPowerBurst(ctx, game, reducedMotion);
  ctx.restore();
  drawPowerNotice(ctx, game);
  if (game.phase !== "over" && game.phase !== 'ready') pixelText(ctx, game.score, c.width / 2, 23, 3);
  if (game.phase === "ready") drawReady(ctx, game);
  if (game.phase === "over") drawGameOver(ctx, game);
  if (game.phase === "paused") {
    ctx.fillStyle = "#263b4266";
    ctx.fillRect(0, 0, c.width, c.height - c.groundHeight);
    pixelText(ctx, "PAUSED", c.width / 2, 170, 3, "#f6dc67");
    pixelText(ctx, "TAP TO RESUME", c.width / 2, 216, 1);
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
  const modeButtons = document.querySelectorAll('[data-mode]');
  const settings = document.querySelector('#settings');
  const settingsOpen = document.querySelector('#settings-open');
  const fullscreenButton = document.querySelector('#fullscreen');
  const screenStatus = document.querySelector('#screen-status');
  let pausedForSettings = false;
  let rocketMode = true;
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
  let lastPowerSerial = 0;
  let recording;
  let playback;
  let playbackFrame = 0;
  const recordingStatus = document.querySelector('#recording-status');
  const replaySelect = document.querySelector('#replays');
  const replayButton = document.querySelector('#watch-replay');
  const retryButton = document.querySelector('#retry-save');
  const pending = new Set();

  function syncCanvas() {
    if (canvas.width === game.config.width && canvas.height === game.config.height &&
        backdrop.width === game.config.width && backdrop.height === game.config.height) return;
    canvas.width = backdrop.width = game.config.width;
    canvas.height = backdrop.height = game.config.height;
    ctx.imageSmoothingEnabled = false;
    paintBackground(backdrop.getContext('2d'), game.config);
  }

  function fitDisplay() {
    const fullscreen = !!document.fullscreenElement;
    document.body.classList.toggle('is-fullscreen', fullscreen);
    fullscreenButton.textContent = fullscreen ? 'Exit full screen' : 'Enter full screen';
    if (!playback) {
      const bounds = document.querySelector('.playfield').getBoundingClientRect();
      const width = fullscreen ? Math.max(200, Math.round(game.config.height * bounds.width / Math.max(1, bounds.height))) : 288;
      resizeGameViewport(game, width);
    }
    syncCanvas();
    previousTime = performance.now(); accumulator = 0;
    scheduleFrame();
  }

  settingsOpen.addEventListener('click', () => {
    pausedForSettings = !playback && game.phase === 'playing';
    if (pausedForSettings) { game.thrust = false; togglePause(game); scheduleFrame(); }
    settings.showModal();
  });
  settings.addEventListener('close', () => {
    if (pausedForSettings && game.phase === 'paused') togglePause(game);
    pausedForSettings = false;
    previousTime = performance.now(); accumulator = 0;
    canvas.focus({ preventScroll: true });
    scheduleFrame();
  });
  fullscreenButton.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      screenStatus.textContent = 'Full screen fits the game to your display. Esc exits.';
      settings.close();
    } catch {
      screenStatus.textContent = 'Full screen is unavailable in this browser window. Try opening the game in your browser.';
    }
  });
  document.addEventListener('fullscreenchange', fitDisplay);
  window.addEventListener('resize', fitDisplay);

  async function listRecordings() {
    try {
      const response = await fetch('/api/recordings');
      if (!response.ok) throw new Error();
      const files = await response.json();
      replaySelect.replaceChildren(new Option('Choose a recording', ''));
      for (const file of files) replaySelect.add(new Option(file, file));
    } catch {
      if (['localhost', '127.0.0.1'].includes(location.hostname) && location.port !== '8766') {
        location.replace('http://127.0.0.1:8766/');
        return;
      }
      recordingStatus.textContent = 'Recording needs the local server: node server.js';
    }
  }

  async function saveRecording(item) {
    pending.add(item);
    recordingStatus.textContent = 'Saving recording…';
    try {
      const response = await fetch('/api/recordings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item)
      });
      if (!response.ok) throw new Error();
      const { filename } = await response.json();
      pending.delete(item);
      recordingStatus.textContent = `Saved recordings/${filename}`;
      await listRecordings();
    } catch {
      recordingStatus.textContent = 'Recording not saved. Start node server.js, then retry before closing this page.';
    }
    retryButton.hidden = pending.size === 0;
  }

  retryButton.addEventListener('click', () => {
    for (const item of pending) saveRecording(item);
  });

  function newGame() {
    playback = null;
    recording = null;
    game = createGame({ ...getGameSettings(), rocketMode }, Math.random, best);
    fitDisplay();
    paintBackground(backdrop.getContext('2d'), game.config);
    lastStatus = '';
    lastPowerSerial = 0;
    replayButton.textContent = 'Watch replay';
    if (!pending.size) recordingStatus.textContent = 'Games save automatically in recordings/.';
    for (const button of modeButtons) button.setAttribute('aria-pressed', String((button.dataset.mode === 'rocket') === rocketMode));
    previousTime = performance.now();
    accumulator = 0;
    canvas.focus();
    scheduleFrame();
  }

  for (const button of modeButtons) button.addEventListener('click', () => {
    if (playback || !['ready', 'over'].includes(game.phase)) return;
    rocketMode = button.dataset.mode === 'rocket';
    for (const other of modeButtons) other.setAttribute('aria-pressed', String(other === button));
    newGame();
  });

  replayButton.addEventListener('click', async () => {
    if (playback) { newGame(); settings.close(); return; }
    if (!replaySelect.value || !['ready', 'over'].includes(game.phase)) return;
    try {
      const response = await fetch('/recordings/' + encodeURIComponent(replaySelect.value));
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (data.version !== 1 || data.fps !== 120 || !data.frames?.length) throw new Error();
      game = createGame(data.config);
      for (const button of modeButtons) button.setAttribute('aria-pressed', String((button.dataset.mode === 'rocket') === !!game.config.rocketMode));
      playback = data;
      playbackFrame = 0;
      applyReplayFrame(game, playback.frames[0]);
      syncCanvas();
      paintBackground(backdrop.getContext('2d'), game.config);
      replayButton.textContent = 'Back to game';
      recordingStatus.textContent = 'Watching ' + replaySelect.value;
      settings.close();
      previousTime = performance.now();
      accumulator = 0;
      scheduleFrame();
    } catch { recordingStatus.textContent = 'Could not load this recording.'; }
  });
  listRecordings();

  function playSound(kind) {
    if (!soundOn) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audio ||= new Audio();
      if (audio.state === "suspended") audio.resume().catch(() => {});
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const [start, end, duration] = kind === 'power' ? [220, 1400, 0.32] : kind === "point" ? [880, 1320, 0.09] : kind === "hit" ? [150, 42, 0.16] : [650, 250, 0.055];
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
    const current = `${game.phase}:${game.score}:${game.powerSerial}:${game.power?.type || ''}`;
    if (current === lastStatus) return;
    lastStatus = current;
    const labels = {
      ready: "Get ready. Press Space, Arrow Up, click, or tap to start.",
      playing: `Flying. Score ${game.score}.${game.power ? ' ' + POWERS[game.power.type].name + '. ' + POWERS[game.power.type].hint + '.' : ''}`,
      paused: "Paused. Press P or tap to resume.",
      falling: `Game over. Score ${game.score}.`,
      over: `Game over. Score ${game.score}. Best ${game.best}. Press Space or tap to try again.`
    };
    status.textContent = labels[game.phase];
    canvas.setAttribute("aria-label", labels[game.phase]);
    pauseButton.hidden = !["playing", "paused"].includes(game.phase);
    if (playback) pauseButton.hidden = true;
    replaySelect.disabled = !playback && !['ready', 'over'].includes(game.phase);
    replayButton.disabled = replaySelect.disabled;
    for (const button of modeButtons) button.disabled = !!playback || !['ready', 'over'].includes(game.phase);
    pauseButton.setAttribute("aria-label", game.phase === "paused" ? "Resume game" : "Pause game");
    pauseButton.textContent = game.phase === "paused" ? "Resume game" : "Pause game";
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
      if (playback) {
        playbackFrame = Math.min(playbackFrame + 1, playback.frames.length - 1);
        applyReplayFrame(game, playback.frames[playbackFrame]);
      } else {
        stepGame(game, 1 / 120);
        if (recording && ['playing', 'falling', 'over'].includes(game.phase)) {
          recordFrame(recording, game);
          if (game.phase === 'over') {
            recording.completed = true;
            saveRecording(recording);
            recording = null;
          }
        }
      }
      accumulator -= 1 / 120;
    }
    if (game.score > oldScore) playSound("point");
    if (game.powerSerial !== lastPowerSerial) {
      if (game.powerSerial > lastPowerSerial) playSound('power');
      lastPowerSerial = game.powerSerial;
    }
    if (oldPhase === "playing" && ["falling", "over"].includes(game.phase)) {
      playSound("hit");
      if (!playback) {
        best = game.best;
        try { localStorage.setItem("flappybird-showcase.best", String(game.best)); } catch {}
      }
    }
    syncCanvas();
    drawGame(ctx, backdrop, game, now / 1000, motion.matches);
    updateStatus();
    const animating = ["playing", "falling"].includes(game.phase) ||
      (game.phase === "ready" && !motion.matches) || (game.phase === "over" && game.overTime < 0.8);
    if (playback ? playbackFrame < playback.frames.length - 1 : animating) scheduleFrame();
  }

  function act() {
    if (playback || settings.open) return;
    if (game.phase === "over") {
      if (game.overTime < 0.65) return;
      resetGame(game);
      lastPowerSerial = 0;
    } else if (game.phase === "paused") togglePause(game);
    else if (flapGame(game)) {
      if (!recording) {
        recording = createRecording(game);
        recording.id = crypto.randomUUID();
        recordFrame(recording, game);
        recordingStatus.textContent = 'Recording this game';
      }
      playSound("flap");
    }
    previousTime = performance.now();
    accumulator = 0;
    scheduleFrame();
  }

  canvas.addEventListener("pointerdown", event => {
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    game.thrust = true;
    canvas.setPointerCapture?.(event.pointerId);
    act();
  });
  const releaseThrust = () => { game.thrust = false; };
  canvas.addEventListener('pointerup', releaseThrust);
  canvas.addEventListener('pointercancel', releaseThrust);
  canvas.addEventListener('lostpointercapture', releaseThrust);
  window.addEventListener('blur', releaseThrust);
  document.addEventListener('keyup', event => {
    if (['Space', 'ArrowUp'].includes(event.code)) releaseThrust();
  });
  document.addEventListener("keydown", event => {
    if (playback || settings.open) return;
    if (event.repeat || event.target.closest("button, a, input, textarea, select")) return;
    if (["Space", "ArrowUp"].includes(event.code)) {
      event.preventDefault(); game.thrust = true; act();
    }
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
    pausedForSettings = false;
    settings.close();
    previousTime = performance.now();
    accumulator = 0;
    scheduleFrame();
  });
  document.addEventListener("visibilitychange", () => {
    releaseThrust();
    if (!playback && document.hidden && game.phase === "playing") togglePause(game);
    if (frameRequest) cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    previousTime = performance.now();
    accumulator = 0;
    scheduleFrame();
  });
  motion.addEventListener("change", scheduleFrame);
  window.addEventListener('pagehide', () => {
    const items = [...pending];
    if (recording) items.push(recording);
    for (const item of items) {
      navigator.sendBeacon('/api/recordings', new Blob([JSON.stringify(item)], { type: 'application/json' }));
    }
  });
  scheduleFrame();
}

if (typeof document !== "undefined") bootGame();
