const api = 'https://openapi.chzzk.naver.com';

export function createChzzkChat(onChat) {
  let status = 'idle';
  let close = () => {};
  return {
    get status() { return status; },
    async start(accessToken) {
      close();
      let socket;
      let active = true;
      let timer;
      const stop = next => {
        if (!active) return;
        active = false;
        clearTimeout(timer);
        status = next;
        socket?.disconnect();
      };
      close = () => stop('idle');
      status = 'connecting';
      timer = setTimeout(() => stop('error'), 25_000);
      const call = async (path, method = 'GET') => {
        const response = await fetch(api + path, {
          method, headers: { Authorization: `Bearer ${accessToken}` },
          redirect: 'error', signal: AbortSignal.timeout(10_000)
        });
        if (!response.ok) throw new Error('CHZZK request failed');
        return response;
      };
      const parse = payload => {
        try { return typeof payload === 'string' ? JSON.parse(payload) : payload; }
        catch { return null; }
      };
      try {
        const { default: connect } = await import('chzzk-socket-client');
        const response = await call('/open/v1/sessions/auth');
        const { content } = await response.json();
        const url = new URL(content?.url);
        if (url.protocol !== 'https:' || !url.hostname.endsWith('.nchat.naver.com') ||
            url.username || url.password) throw new Error('Unexpected session host');
        if (!active) return;
        socket = connect(url.toString(), { reconnection: false, forceNew: true, timeout: 8000, transports: ['websocket'] });
        let subscribing = false;
        socket.on('connect_error', () => stop('error'));
        socket.on('disconnect', () => stop('disconnected'));
        socket.on('SYSTEM', async payload => {
          const event = parse(payload);
          if (!active || !event) return;
          if (event.type === 'connected' && typeof event.data?.sessionKey === 'string' && !subscribing) {
            subscribing = true;
            const query = new URLSearchParams({ sessionKey: event.data.sessionKey });
            try { await call(`/open/v1/sessions/events/subscribe/chat?${query}`, 'POST'); }
            catch { stop('error'); }
          }
          if (event.data?.eventType !== 'CHAT') return;
          if (event.type === 'subscribed' && subscribing) {
            clearTimeout(timer);
            status = 'subscribed';
          } else if (['unsubscribed', 'revoked'].includes(event.type)) {
            stop('disconnected');
          }
        });
        socket.on('CHAT', payload => {
          const event = parse(payload);
          if (active && status === 'subscribed' && typeof event?.content === 'string' &&
              typeof event.profile?.nickname === 'string') {
            onChat(event.profile.nickname, event.content);
          }
        });
      } catch { stop('error'); }
    },
    stop() { close(); }
  };
}
