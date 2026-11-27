const $ = selector => document.querySelector(selector);
let state;
const labels = { pending: '승인 대기', approved: '재생 대기', rejected: '거절됨', played: '재생 선택됨' };
const node = (tag, text, className) => {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
};
function render(next) {
  state = next;
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
      for (const [action, label] of [['approve', '승인'], ['reject', '거절']]) {
        const button = node('button', label, action === 'approve' ? 'approve' : '');
        button.addEventListener('click', () => command(`/api/requests/${encodeURIComponent(request.id)}/${action}`));
        actions.append(button);
      }
    } else actions.textContent = '—';
    row.append(title, node('td', request.requester), status, actions);
    return row;
  }));
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
$('#finish-track').addEventListener('click', () => command('/api/demo/track-ended'));
$('#request-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (await command('/api/requests', Object.fromEntries(new FormData(form)))) form.reset();
});
const socket = io();
socket.on('state', render);
socket.on('connect', () => { $('#feedback').textContent = '로컬 서버에 연결되었습니다'; });
socket.on('disconnect', () => { $('#feedback').textContent = '로컬 서버 연결이 끊겼습니다. 다시 연결하는 중입니다.'; });
socket.on('connect_error', () => { $('#feedback').textContent = '로컬 서버 연결을 확인해 주세요'; });
