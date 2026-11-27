import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { io as client } from 'socket.io-client';
import { createApp } from '../src/server.js';

test('HTTP dashboard, validation, origin protection and Socket.IO state broadcast', async t => {
  const { server, io } = createApp();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  t.after(() => new Promise(resolve => io.close(resolve)));
  const socket = client(url, { autoConnect: false });
  t.after(() => socket.disconnect());
  const initial = once(socket, 'state', { signal: AbortSignal.timeout(5000) });
  socket.connect();
  assert.equal((await initial)[0].mode, 'demo');
  assert.equal((await (await fetch(`${url}/api/health`)).json()).ok, true);
  assert.match(await (await fetch(url)).text(), /MACHAW Manager/);
  const broadcast = once(socket, 'state', { signal: AbortSignal.timeout(5000) });
  const response = await fetch(`${url}/api/requests/demo-1/approve`, { method: 'POST' });
  assert.equal(response.status, 200);
  assert.equal((await broadcast)[0].requests[0].status, 'approved');
  assert.equal((await fetch(`${url}/api/requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 400);
  assert.equal((await fetch(`${url}/api/demo/track-ended`, { method: 'POST', headers: { Origin: 'https://example.com' } })).status, 403);
});
