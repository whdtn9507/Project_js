import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequestStore } from '../src/request-store.js';
import { createManager } from '../src/state.js';

test('a fresh manager restores the pending and approved queue from disk', t => {
  const directory = mkdtempSync(join(tmpdir(), 'machaw-requests-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, 'requests.json');
  const open = () => createManager(createRequestStore(path));
  const manager = open();
  manager.chat('viewer', '!신청곡 First Artist');
  manager.chat('viewer', '!신청곡 Second Artist');
  const [first, second] = manager.snapshot().requests;
  manager.moderate(first.id, 'approve', 'abcdefghijk');
  const restarted = open();
  assert.deepEqual(restarted.snapshot().requests, [
    { ...first, status: 'approved', videoId: 'abcdefghijk' }, second
  ]);
  restarted.confirmPlayback(first.id);
  assert.deepEqual(open().snapshot().requests, [second]);
});
