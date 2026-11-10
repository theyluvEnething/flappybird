const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGame, flapGame, resizeGameViewport, createRecording, recordFrame, applyReplayFrame } = require('./script.js');

test('widening the playfield preserves obstacle and pickup distances from the bird', () => {
  assert.equal(typeof resizeGameViewport, 'function');
  const game = createGame();
  flapGame(game);
  const pipeDistance = game.pipes[0].x - game.config.birdX;
  const pickupDistance = game.pickups[0].x - game.config.birdX;
  resizeGameViewport(game, 960);
  assert.equal(game.config.width, 960);
  assert.equal(game.pipes[0].x - game.config.birdX, pipeDistance);
  assert.equal(game.pickups[0].x - game.config.birdX, pickupDistance);
  resizeGameViewport(game, 288);
  assert.equal(game.config.birdX, 68);
  assert.equal(game.pipes[0].x - game.config.birdX, pipeDistance);
});

test('recordings reproduce a full-screen resize and a return to portrait', () => {
  const game = createGame();
  flapGame(game);
  const recording = createRecording(game);
  resizeGameViewport(game, 960);
  recordFrame(recording, game);
  resizeGameViewport(game, 288);
  recordFrame(recording, game);
  const replay = createGame(recording.config);
  applyReplayFrame(replay, recording.frames[0]);
  assert.equal(replay.config.width, 960);
  assert.equal(replay.pipes[0].x - replay.config.birdX, 280);
  applyReplayFrame(replay, recording.frames[1]);
  assert.equal(replay.config.width, 288);
  assert.equal(replay.config.birdX, 68);
});
