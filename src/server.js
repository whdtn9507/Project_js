import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { createManager } from './state.js';
import { createRequestStore } from './request-store.js';
import { installChzzkAuth } from './chzzk-auth.js';
import { createChzzkChat } from './chzzk-chat.js';

export function createApp(requestStore) {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, { maxHttpBufferSize: 16384 });
  const manager = createManager(requestStore);
  // Local development only. Reject browser requests from other origins.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && origin !== `http://${req.headers.host}`) return res.status(403).json({ error: '허용되지 않은 출처입니다.' });
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://www.youtube.com; frame-src https://www.youtube.com; style-src 'self'; connect-src 'self' ws:; object-src 'none'; frame-ancestors 'none'");
    next();
  });
  app.use(express.json({ limit: '16kb' }));
  const chzzkChat = createChzzkChat((user, message) => {
    try {
      manager.chat(user, message);
      io.emit('state', manager.snapshot());
    } catch {
      // Invalid song commands must not interrupt later chat events.
    }
  });
  installChzzkAuth(app, chzzkChat);
  server.on('close', () => chzzkChat.stop());
  app.use(express.static(fileURLToPath(new URL('../public', import.meta.url))));
  app.get('/api/health', (req, res) => res.json({ ok: true, mode: 'demo' }));
  app.get('/api/state', (req, res) => res.json(manager.snapshot()));
  const mutate = handler => (req, res) => {
    try {
      handler(req);
      const state = manager.snapshot();
      io.emit('state', state);
      res.json(state);
    } catch (error) { res.status(400).json({ error: error.message }); }
  };
  app.post('/api/requests', mutate(req => manager.request(req.body)));
  app.post('/api/requests/:id/:action', mutate(req => manager.moderate(req.params.id, req.params.action, req.body?.videoId)));
  app.post('/api/playback/:id/started', mutate(req => manager.confirmPlayback(req.params.id)));
  app.post('/api/demo/track-ended', mutate(() => manager.finish()));
  app.post('/api/demo/chat', mutate(req => manager.chat(req.body?.user, req.body?.text)));
  app.delete('/api/demo/chat', mutate(() => manager.clearChat()));
  io.on('connection', socket => socket.emit('state', manager.snapshot()));
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: '요청을 처리할 수 없습니다.' }));
  return { app, server, io };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT는 1~65535의 정수여야 합니다.');
  const { server } = createApp(createRequestStore());
  server.on('error', error => { console.error(`서버 시작 실패: ${error.message}`); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`MACHAW Manager · http://127.0.0.1:${port} · DEMO`));
}
