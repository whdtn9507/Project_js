import { randomUUID } from 'node:crypto';

export function createManager() {
  const state = {
    mode: 'demo',
    connections: { chzzk: false, youtubeMusic: false },
    current: { title: '방송 시작 전 플레이리스트', artist: '데모 음악 · 실제 재생 없음' },
    requests: [
      { id: 'demo-1', title: '밤 산책', artist: '데모 아티스트', requester: '호령단01', status: 'pending' },
      { id: 'demo-2', title: '기분 좋은 하루', artist: '데모 아티스트', requester: '호령단02', status: 'approved' }
    ],
    chats: [{ id: 'chat-1', user: '시스템', text: '데모 채팅입니다. 실제 치지직 연결은 꺼져 있습니다.' }]
  };
  const manager = {
    snapshot: () => structuredClone(state),
    request(input) {
      const clean = (key, max) => {
        const value = typeof input?.[key] === 'string' ? input[key].trim() : '';
        if (!value || value.length > max) throw new Error(`${key}: 1~${max}자로 입력해 주세요.`);
        return value;
      };
      if (state.requests.length >= 100) throw new Error('신청 목록이 가득 찼습니다.');
      state.requests.push({ id: randomUUID(), title: clean('title', 100), artist: clean('artist', 100), requester: clean('requester', 30), status: 'pending' });
    },
    moderate(id, action, videoId) {
      const item = state.requests.find(row => row.id === id);
      if (!item) throw new Error('신청곡을 찾을 수 없습니다.');
      if (item.status !== 'pending') throw new Error('이미 처리한 신청곡입니다.');
      if (!['approve', 'reject'].includes(action)) throw new Error('잘못된 처리입니다.');
      if (videoId !== undefined) {
        if (action !== 'approve' || typeof videoId !== 'string' || !/^[\w-]{11}$/.test(videoId)) {
          throw new Error('올바른 YouTube 영상 링크를 입력해 주세요.');
        }
        item.videoId = videoId;
      }
      item.status = action === 'approve' ? 'approved' : 'rejected';
    },
    confirmPlayback(id) {
      const next = state.requests.find(row => row.status === 'approved' && row.videoId);
      if (!next || next.id !== id) throw new Error('재생 대기 목록이 바뀌었습니다.');
      next.status = 'played';
      state.current = { title: next.title, artist: next.artist };
    },
    finish() {
      const next = state.requests.find(row => row.status === 'approved');
      if (!next) { state.current = null; return; }
      next.status = 'played';
      state.current = { title: next.title, artist: next.artist };
    },
    chat(user = '데모 시청자', text = '안녕하세요! 오늘 방송도 함께할게요.') {
      if (typeof user !== 'string' || !user.trim() || user.trim().length > 30 ||
          typeof text !== 'string' || !text.trim() || text.length > 500) {
        throw new Error('닉네임은 1~30자, 채팅은 1~500자로 입력해 주세요.');
      }
      const message = text.trim();
      if (/^!신청곡(?:\s|$)/u.test(message)) {
        const input = message.slice('!신청곡'.length).trim();
        const separated = input.match(/^(.+?)\s+(?:"([^"]+)"|([^\s"]+))$/u);
        const fields = input.includes('|')
          ? input.split('|')
          : separated ? [separated[1], separated[2] ?? separated[3]] : [];
        if (fields.length !== 2 || fields.some(field => !field.trim())) {
          throw new Error('사용법: !신청곡 곡 제목 아티스트 (여러 단어인 아티스트는 따옴표 또는 | 사용)');
        }
        manager.request({ title: fields[0], artist: fields[1], requester: user });
      }
      state.chats.push({ id: randomUUID(), user: user.trim(), text: message });
      state.chats = state.chats.slice(-50);
    },
    clearChat() { state.chats = []; }
  };
  return manager;
}
