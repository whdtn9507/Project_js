import { randomBytes } from 'node:crypto';

export function installChzzkAuth(app, chat, env = process.env, request = fetch) {
  const callbackPath = '/auth/chzzk/callback';
  const redirectUri = env.CHZZK_REDIRECT_URI || 'http://127.0.0.1:3000/auth/chzzk/callback';
  const clientId = env.CHZZK_CLIENT_ID?.trim();
  const clientSecret = env.CHZZK_CLIENT_SECRET?.trim();
  let pending;
  let credentials;

  app.get('/auth/chzzk/start', (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!clientId || !clientSecret) return res.status(503).send('로컬 .env에 치지직 Client ID와 Client Secret을 입력하세요.');
    const state = randomBytes(32).toString('hex');
    pending = { state, expiresAt: Date.now() + 600_000 };
    res.cookie('machaw_chzzk_state', state, { httpOnly: true, sameSite: 'lax', path: callbackPath, maxAge: 600_000 });
    const url = new URL('https://chzzk.naver.com/account-interlock');
    url.search = new URLSearchParams({ clientId, redirectUri, state }).toString();
    res.redirect(url.toString());
  });

  app.get(callbackPath, async (req, res) => {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    const { state, code } = req.query;
    const cookie = req.headers.cookie?.split(';').some(value => value.trim() === `machaw_chzzk_state=${state}`);
    if (typeof state !== 'string' || !pending || state !== pending.state || !cookie || Date.now() >= pending.expiresAt) {
      return res.status(400).send('인증이 만료됐거나 시작한 브라우저와 다릅니다. 대시보드에서 다시 시작해 주세요.');
    }
    pending = undefined;
    res.clearCookie('machaw_chzzk_state', { path: callbackPath, httpOnly: true, sameSite: 'lax' });
    if (typeof code !== 'string' || !code) return res.status(400).send('치지직에서 인증 코드를 받지 못했습니다.');
    try {
      const response = await request('https://openapi.chzzk.naver.com/auth/v1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({ grantType: 'authorization_code', clientId, clientSecret, code, state })
      });
      if (!response.ok) throw new Error('Token request failed');
      const { content } = await response.json();
      const seconds = Number(content?.expiresIn);
      if (typeof content?.accessToken !== 'string' || !content.accessToken || !Number.isFinite(seconds) || seconds <= 0) {
        throw new Error('Invalid token response');
      }
      credentials = { accessToken: content.accessToken, expiresAt: Date.now() + seconds * 1000 };
      void chat.start(credentials.accessToken);
      res.redirect(303, '/#connections');
    } catch {
      res.status(502).send('치지직 인증에 실패했습니다. 발급 정보와 등록한 리디렉션 주소를 확인하세요.');
    }
  });

  app.get('/api/chzzk/auth-status', (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (credentials && Date.now() >= credentials.expiresAt) credentials = undefined;
    res.json({ authenticated: Boolean(credentials), chatStatus: chat.status });
  });
}
