const $ = selector => document.querySelector(selector);
let state;
const approvalForms = new Map();
const labels = { pending: '승인 대기', approved: '재생 대기', rejected: '거절됨', played: '재생 선택됨' };
const node = (tag, text, className) => {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
};
function render(next) {
  state = next;
  const focused = document.activeElement;
  for (const id of approvalForms.keys()) {
    if (!state.requests.some(request => request.id === id && request.status === 'pending')) approvalForms.delete(id);
  }
  $('#chat-count').textContent = state.chats.length;
  $('#pending-count').textContent = state.requests.filter(r => r.status === 'pending').length;
  $('#queue-count').textContent = state.requests.filter(r => r.status === 'approved').length;
  $('#track-title').textContent = state.current?.title || '재생 대기 중';
  $('#track-artist').textContent = state.current?.artist || '승인된 신청곡이 없습니다';
  $('#chat-list').replaceChildren(...state.chats.map(chat => {
    const line = node('div', '', 'chat-line');
    line.append(node('strong', chat.user), node('p', chat.text));
    return line;
  }));
  if (!state.chats.length) $('#chat-list').append(node('p', '표시할 데모 채팅이 없습니다', 'empty'));
  const rows = state.requests.filter(r => $('#filter').value === 'all' || r.status === $('#filter').value);
  $('#request-list').replaceChildren(...rows.map(request => {
    const row = document.createElement('tr');
    const title = document.createElement('td');
    title.append(node('strong', request.title), node('small', request.artist));
    const status = document.createElement('td');
    status.append(node('span', labels[request.status], `status ${request.status}`));
    const actions = document.createElement('td');
    if (request.status === 'pending') {
      const search = node('a', 'YouTube 검색', 'song-search');
      const query = new URLSearchParams({ search_query: `${request.title} ${request.artist}` });
      search.href = `https://www.youtube.com/results?${query}`;
      search.target = '_blank';
      search.rel = 'noopener noreferrer';
      actions.append(search);
      const approve = node('button', '승인', 'approve');
      const reject = node('button', '거절');
      const endpoint = `/api/requests/${encodeURIComponent(request.id)}`;
      const existingForm = approvalForms.get(request.id);
      approve.hidden = Boolean(existingForm);
      approve.addEventListener('click', () => {
        const form = document.createElement('form');
        const label = node('label', 'YouTube 영상 링크');
        const input = document.createElement('input');
        input.type = 'text';
        input.inputMode = 'url';
        input.placeholder = 'https://www.youtube.com/watch?v=…';
        input.required = true;
        input.addEventListener('input', () => input.setCustomValidity(''));
        label.append(input);
        const submit = node('button', '승인 확정', 'approve');
        const cancel = node('button', '취소');
        cancel.type = 'button';
        cancel.addEventListener('click', () => {
          approvalForms.delete(request.id);
          render(state);
          $('#request-list tr[data-request-id="' + CSS.escape(request.id) + '"] button.approve')?.focus();
        });
        form.addEventListener('submit', async event => {
          event.preventDefault();
          const videoId = youtubeVideoId(input.value);
          if (!videoId) {
            input.setCustomValidity('올바른 YouTube 영상 링크를 입력해 주세요.');
            input.reportValidity();
            return;
          }
          submit.disabled = true;
          try { await command(endpoint + '/approve', { videoId }); }
          finally { submit.disabled = false; }
        });
        form.append(label, submit, cancel);
        approvalForms.set(request.id, form);
        approve.hidden = true;
        actions.append(form);
        input.focus();
      });
      reject.addEventListener('click', () => command(endpoint + '/reject'));
      actions.append(approve, reject);
      if (existingForm) actions.append(existingForm);
    } else if (request.status === 'approved') {
      const cancel = node('button', '승인 취소');
      cancel.addEventListener('click', () => command(`/api/requests/${encodeURIComponent(request.id)}/cancel`));
      actions.append(cancel);
    } else actions.textContent = '—';
    row.dataset.requestId = request.id;
    row.append(title, node('td', request.requester), status, actions);
    return row;
  }));
  if (focused?.isConnected && $('#request-list').contains(focused)) focused.focus({ preventScroll: true });
  if (!rows.length) {
    const row = document.createElement('tr');
    const cell = node('td', '표시할 신청곡이 없습니다', 'empty');
    cell.colSpan = 4;
    row.append(cell);
    $('#request-list').append(row);
  }
}
async function command(url, body, method = 'POST') {
  try {
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '요청 실패');
    render(result);
    $('#feedback').textContent = '데모 상태를 반영했습니다';
    return true;
  } catch (error) { $('#feedback').textContent = error.message; return false; }
}
$('#filter').addEventListener('change', () => state && render(state));
$('#add-chat').addEventListener('click', () => command('/api/demo/chat'));
$('#clear-chat').addEventListener('click', () => command('/api/demo/chat', null, 'DELETE'));
$('#request-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (await command('/api/requests', Object.fromEntries(new FormData(form)))) form.reset();
});
const socket = io();
const refreshChzzkStatus = () => fetch('/api/chzzk/auth-status').then(response => {
  if (!response.ok) throw new Error('인증 상태 조회 실패');
  return response.json();
}).then(({ authenticated, chatStatus }) => {
  const labels = {
    connecting: '채팅 연결 중', subscribed: '채팅 수신 중',
    error: '채팅 연결 실패 · 다시 로그인', disconnected: '채팅 연결 끊김 · 다시 로그인'
  };
  $('#chzzk-auth-status').textContent = labels[chatStatus] ?? (authenticated ? '인증 완료' : '인증 필요');
  $('#chat .tag').textContent = chatStatus === 'subscribed' ? '치지직 수신 중' : '치지직 미연결';
  $('#chat .panel-foot .muted').textContent = chatStatus === 'subscribed'
    ? '치지직 채팅과 가상 채팅이 이 목록에 표시됩니다.'
    : '가상 채팅으로 신청곡 명령을 테스트할 수 있습니다.';
}).catch(() => {
  $('#chzzk-auth-status').textContent = '인증 상태 조회 실패';
  $('#chat .tag').textContent = '연결 상태 확인 불가';
  $('#chat .panel-foot .muted').textContent = '서비스 연결 상태를 확인해 주세요.';
});
refreshChzzkStatus();
setInterval(refreshChzzkStatus, 3000);
$('#chat-command-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (await command('/api/demo/chat', Object.fromEntries(new FormData(form)))) {
    form.elements.text.value = '';
  }
});
socket.on('state', render);
socket.on('connect', () => { $('#feedback').textContent = '로컬 서버에 연결되었습니다'; });
socket.on('disconnect', () => { $('#feedback').textContent = '로컬 서버 연결이 끊겼습니다. 다시 연결하는 중입니다.'; });
socket.on('connect_error', () => { $('#feedback').textContent = '로컬 서버 연결을 확인해 주세요'; });
