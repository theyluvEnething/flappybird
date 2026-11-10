const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGame, flapGame, stepGame, togglePause, resetGame, activatePower,
  createRecording, recordFrame, applyReplayFrame } = require('./script.js');

function flying() {
  const game = createGame(undefined, () => 0.5);
  flapGame(game);
  return game;
}

test('touching a pickup activates it once; missing it does not', () => {
  const game = flying();
  assert.ok(Array.isArray(game.pickups), 'Rocket Mode must spawn collectibles');
  game.pickups = [{ type: 'jetpack', x: 68, y: 200 }, { type: 'shield', x: 280, y: 50 }];
  stepGame(game, 1 / 120);
  assert.equal(game.power.type, 'jetpack');
  assert.equal(game.pickups.length, 1);
  assert.equal(game.pickups[0].type, 'shield');
});

test('all five types spawn in reachable gaps and Classic has none', () => {
  const game = flying();
  const seen = new Set(game.pickups.map(p => p.type));
  for (let i = 0; i < 30; i++) {
    game.pipes = [];
    game.bird.y = 200;
    game.bird.velocity = 0;
    stepGame(game, 1 / 120);
    for (const pickup of game.pickups) {
      seen.add(pickup.type);
      assert(pickup.y >= 48 && pickup.y <= 352);
    }
  }
  assert.deepEqual([...seen].sort(), ['boost', 'jetpack', 'pulse', 'shield', 'slow']);
  const classic = createGame({ ...game.config, rocketMode: false });
  flapGame(classic);
  stepGame(classic, 1 / 120);
  assert.deepEqual(classic.pickups, []);
});

test('Jetpack rises while held and descends after release', () => {
  const game = flying();
  game.pickups = [];
  activatePower(game, 'jetpack');
  game.bird.velocity = 0;
  game.thrust = true;
  for (let i = 0; i < 24; i++) stepGame(game, 1 / 120);
  assert(game.bird.y < 200);
  game.thrust = false;
  for (let i = 0; i < 48; i++) stepGame(game, 1 / 120);
  assert(game.bird.velocity > 0);
});

test('the first capsule meets a normal opening flap', () => {
  const game = flying();
  for (let i = 0; i < 65; i++) stepGame(game, 1 / 120);
  assert.equal(game.power?.type, 'jetpack');
});

test('a Jetpack collision ends the run even if thrust is held', () => {
  const game = flying();
  activatePower(game, 'jetpack');
  game.thrust = true;
  game.grace = 0;
  game.pipes = [{ x: 60, centerY: 350, counted: false }];
  stepGame(game, 1 / 120);
  assert.equal(game.phase, 'falling');
  for (let i = 0; i < 250; i++) stepGame(game, 1 / 120);
  assert.equal(game.phase, 'over');
});

test('Boost is faster, auto-flies, breaks pipes and gives exit protection', () => {
  const game = flying();
  activatePower(game, 'boost');
  game.pipes = [{ x: 250, centerY: 200, counted: false }, { x: 65, centerY: 320, counted: false }];
  stepGame(game, 0.05);
  assert(game.pipes[0].x < 225);
  assert.equal(game.phase, 'playing');
  assert.equal(game.score, 1);
  assert(game.debris.length > 0);
  game.power.remaining = 0.001;
  stepGame(game, 1 / 120);
  assert.equal(game.power, null);
  assert(game.grace > 0);
});

test('Shield absorbs one collision, then ordinary collisions kill again', () => {
  const game = flying();
  activatePower(game, 'shield');
  game.pipes = [{ x: 60, centerY: 350, counted: false }];
  stepGame(game, 1 / 120);
  assert.equal(game.phase, 'playing');
  assert.equal(game.power, null);
  assert(game.grace > 0);
  game.grace = 0;
  game.pipes = [{ x: 60, centerY: 350, counted: false }];
  stepGame(game, 1 / 120);
  assert.equal(game.phase, 'falling');
});

test('Slow Motion slows world and gravity while ability time uses real time', () => {
  const normal = flying();
  const slow = flying();
  activatePower(slow, 'slow');
  normal.bird.velocity = slow.bird.velocity = 0;
  stepGame(normal, 0.05);
  stepGame(slow, 0.05);
  assert(slow.pipes[0].x > normal.pipes[0].x);
  assert(slow.bird.y < normal.bird.y);
  assert.equal(Math.round((6 - slow.power.remaining) * 100), 5);
});

test('Pulse destroys nearby pipes once without removing distant pipes', () => {
  const game = flying();
  game.pipes = [{ x: 150, centerY: 200, counted: false }, { x: 450, centerY: 200, counted: false }];
  activatePower(game, 'pulse');
  assert.equal(game.score, 1);
  assert.equal(game.pipes.length, 1);
  assert.equal(game.pipes[0].x, 450);
  assert(game.debris.length > 0);
});

test('Pause freezes powers; reset clears effects and does not change settings', () => {
  const game = flying();
  activatePower(game, 'boost');
  const before = game.power.remaining;
  togglePause(game);
  stepGame(game, 0.05);
  assert.equal(game.power.remaining, before);
  resetGame(game);
  assert.equal(game.power, null);
  assert.deepEqual(game.debris, []);
  assert.equal(game.phase, 'ready');
  assert.equal(game.config.forwardSpeed, 240);
});

test('Replay snapshots preserve effects independently; old frames clear new fields', () => {
  const game = flying();
  activatePower(game, 'boost');
  const recording = createRecording(game);
  recordFrame(recording, game);
  const copy = JSON.stringify(recording.frames[0]);
  stepGame(game, 0.05);
  assert.equal(JSON.stringify(recording.frames[0]), copy);
  const replay = createGame();
  applyReplayFrame(replay, JSON.parse(copy));
  assert.deepEqual(replay.power, recording.frames[0].power);
  assert.deepEqual(replay.pickups, recording.frames[0].pickups);
  applyReplayFrame(replay, { phase: 'playing', bird: { y: 200, velocity: 0 }, pipes: [], time: 1 });
  assert.equal(replay.power, null);
  assert.deepEqual(replay.pickups, []);
  assert.deepEqual(replay.debris, []);
});
