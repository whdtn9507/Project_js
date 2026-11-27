function youtubeVideoId(value) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return null;
    const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) :
      ['youtube.com', 'www.youtube.com', 'music.youtube.com'].includes(url.hostname) &&
      url.pathname === '/watch' ? url.searchParams.get('v') : null;
    return typeof id === 'string' && /^[\w-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

const youtubeForm = $('#youtube-start');
const youtubeStatus = $('#youtube-status');
let youtubePlayer;
let loadingPlayer;
let selected;
let playing = false;
let started = Promise.resolve(true);

function nextYoutubeTrack() {
  const next = state?.requests.find(row => row.status === 'approved' && row.videoId);
  if (!next) {
    selected = null;
    youtubeStatus.textContent = '영상 링크가 지정된 승인곡이 없습니다.';
    return;
  }
  loadYoutubeTrack(next);
}

const nextTrackButton = $('#finish-track');
nextTrackButton.addEventListener('click', async () => {
  if (state?.mode === 'demo') {
    await command('/api/demo/track-ended');
    return;
  }
  if (!state?.requests.some(row => row.status === 'approved' && row.videoId)) {
    $('#feedback').textContent = 'YouTube 링크가 지정된 재생 대기곡이 없습니다.';
    return;
  }
  const previous = selected;
  nextTrackButton.disabled = true;
  try {
    await initializeYoutubePlayer();
    await started;
    if (selected === previous) nextYoutubeTrack();
  } catch (error) {
    $('#feedback').textContent = error.message;
  } finally {
    nextTrackButton.disabled = false;
  }
});

function loadYoutubeTrack(track) {
  selected = track;
  playing = false;
  started = Promise.resolve(true);
  youtubeStatus.textContent = track.title || '시작 곡을 불러오는 중입니다.';
  youtubePlayer.loadVideoById(track.videoId);
}

function initializeYoutubePlayer() {
  if (loadingPlayer) return loadingPlayer;
  loadingPlayer = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('YouTube 플레이어 연결 시간이 초과됐습니다. 페이지를 새로고침해 주세요.')), 15_000);
    window.onYouTubeIframeAPIReady = () => {
      new YT.Player('youtube-player', {
        width: '100%', height: 240,
        playerVars: { origin: location.origin },
        events: {
          onReady(event) {
            clearTimeout(timeout);
            youtubePlayer = event.target;
            youtubePlayer.getIframe().setAttribute('allow', 'autoplay; encrypted-media; fullscreen');
            resolve();
          },
          onStateChange: async ({ data }) => {
            if (data === YT.PlayerState.PLAYING && selected && !playing) {
              playing = true;
              if (selected.id) started = command(`/api/playback/${encodeURIComponent(selected.id)}/started`);
            }
            if (data === YT.PlayerState.ENDED && playing) {
              const ended = selected;
              playing = false;
              if (await started && selected === ended) nextYoutubeTrack();
            }
          },
          onAutoplayBlocked() {
            youtubeStatus.textContent = '자동 재생이 차단됐습니다. 플레이어에서 재생 버튼을 눌러 주세요.';
          },
          onError() {
            youtubeStatus.textContent = '이 영상을 재생할 수 없습니다. 링크와 YouTube의 임베드 허용 여부를 확인해 주세요.';
          }
        }
      });
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('YouTube 플레이어를 불러오지 못했습니다.'));
    };
    document.head.append(script);
  });
  return loadingPlayer;
}

youtubeForm.addEventListener('submit', async event => {
  event.preventDefault();
  const url = youtubeForm.elements.url.value.trim();
  const videoId = youtubeVideoId(url);
  if (url && !videoId) {
    youtubeStatus.textContent = 'YouTube 영상 링크를 확인해 주세요.';
    return;
  }
  const button = youtubeForm.querySelector('button');
  button.disabled = true;
  try {
    await initializeYoutubePlayer();
    if (videoId) loadYoutubeTrack({ videoId });
    else nextYoutubeTrack();
  } catch (error) {
    youtubeStatus.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
