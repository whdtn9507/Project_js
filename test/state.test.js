import test from 'node:test';
import assert from 'node:assert/strict';
import { createManager } from '../src/state.js';

test('approval leaves current track unchanged; track end selects approved requests FIFO', () => {
  const manager = createManager();
  const before = manager.snapshot().current;
  manager.moderate('demo-1', 'approve');
  assert.deepEqual(manager.snapshot().current, before);
  manager.finish();
  assert.equal(manager.snapshot().current.title, '밤 산책');
  manager.finish();
  assert.equal(manager.snapshot().current.title, '기분 좋은 하루');
  manager.finish();
  assert.equal(manager.snapshot().current, null);
});
test('pending and rejected requests never enter playback', () => {
  const manager = createManager();
  manager.moderate('demo-1', 'reject');
  manager.finish();
  manager.finish();
  assert.equal(manager.snapshot().current, null);
});
test('invalid input and repeated moderation are rejected', () => {
  const manager = createManager();
  assert.throws(() => manager.request({ title: ' ' }));
  assert.throws(() => manager.request({ title: 'x'.repeat(101) }));
  assert.throws(() => manager.moderate('missing', 'approve'));
  assert.throws(() => manager.moderate('demo-1', 'delete'));
  manager.moderate('demo-1', 'approve');
  assert.throws(() => manager.moderate('demo-1', 'reject'));
});
test('state snapshots are isolated and chat history is bounded', () => {
  const manager = createManager();
  manager.snapshot().requests.length = 0;
  assert.equal(manager.snapshot().requests.length, 2);
  for (let i = 0; i < 60; i++) manager.chat();
  assert.equal(manager.snapshot().chats.length, 50);
  manager.clearChat();
  assert.equal(manager.snapshot().chats.length, 0);
});
