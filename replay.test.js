const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGame, flapGame, stepGame, createRecording, recordFrame } = require('./script.js');

test('recordings retain independent frames, settings, score and final state', () => {
  assert.equal(typeof createRecording, 'function');
  const game = createGame(undefined, () => 0.5);
  flapGame(game);
  const recording = createRecording(game);
  recordFrame(recording, game);
  const initial = JSON.stringify(recording.frames[0]);
  for (let i = 0; i < 300; i++) {
    stepGame(game, 1 / 120);
    recordFrame(recording, game);
  }
  assert.equal(JSON.stringify(recording.frames[0]), initial);
  assert.equal(recording.frames.at(-1).phase, 'over');
  assert.deepEqual(recording.config, game.config);
  assert.equal(recording.frames.at(-1).score, game.score);
  assert.equal(recording.fps, 120);
});
