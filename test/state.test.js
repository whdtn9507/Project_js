import test from 'node:test';
import assert from 'node:assert/strict';
import { createManager } from '../src/state.js';

test('chat song commands create pending requests and preserve the playing track', () => {
  const manager = createManager();
  const before = manager.snapshot();
  manager.chat('마차우', '오늘도 안녕하세요');
  assert.equal(manager.snapshot().requests.length, before.requests.length);
  assert.throws(() => manager.chat('마차우', '!신청곡 곡 제목'), /사용법/);
  manager.chat('마차우', '!신청곡 그럼에도 우리의 이름은 | 달담');
  const after = manager.snapshot();
  assert.equal(after.requests.length, before.requests.length + 1);
  const { title, artist, requester, status } = after.requests.at(-1);
  assert.deepEqual({ title, artist, requester, status }, {
    title: '그럼에도 우리의 이름은', artist: '달담', requester: '마차우', status: 'pending'
  });
  assert.deepEqual(after.current, before.current);
});

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
