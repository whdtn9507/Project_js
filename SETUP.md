# MACHAW Manager

치지직 채팅 관리와 음악 신청 시스템의 로컬 데모입니다. GitHub 저장소 이름은 `Project_js`를 유지합니다. 기존 README.md는 보존했습니다.

## 실행

Node.js 22 이상과 npm이 필요합니다. PowerShell에서 이 폴더로 이동한 뒤 실행합니다.

```powershell
npm install
npm run dev
```

브라우저: http://127.0.0.1:3000

환경변수는 선택 사항입니다. 포트를 변경하려면 `.env.example`을 `.env`로 복사하고 PORT를 수정합니다. 이 단계에는 API 키가 필요하지 않습니다.

## 사용

- 데모 신청을 추가하고 승인하거나 거절합니다.
- 승인해도 현재 곡은 바뀌지 않습니다. `현재 곡 종료 시뮬레이션`을 누르면 승인된 신청곡을 신청 순서대로 선택합니다.
- 가상 채팅을 추가하거나 비울 수 있습니다. 열려 있는 다른 대시보드에도 Socket.IO로 변경 상태를 전송합니다.
- 목록 필터로 승인 대기·재생 대기 등을 확인합니다.
- 실제 음악 재생, 자동 종료 감지, OAuth, 치지직 채팅 송수신 및 YouTube Music 연결은 구현하지 않았습니다.
- 데이터는 메모리에만 있으며 서버 재시작 시 초기화됩니다. 로그인 없는 로컬 데모이므로 외부 공개용으로 사용하지 마세요. 서버는 127.0.0.1에만 바인딩합니다.

## 구조

```text
public/index.html    관리자 대시보드
public/styles.css    반응형 다크 테마
public/app.js        사용자 동작 및 실시간 상태 표시
src/server.js        Express API 및 Socket.IO 서버
src/state.js         음악 신청·승인·다음 곡 선택·데모 채팅
test/                상태 로직 및 서버 통합 검사
.env.example         비밀정보 없는 환경변수 예시
```

## 검증

```powershell
npm run check
npm test
```

개발 서버와 별도로 테스트 서버는 임의 포트에서 실행됩니다. 상태 로직만 검사하려면 `node --test test/state.test.js`를 사용합니다.

## Git 연결 및 기존 이력 보존

초기 작업 환경에서 GitHub 및 npm 도메인 조회가 실패하여 clone과 패키지 설치를 완료하지 못했습니다. 이 폴더는 원격 저장소를 clone한 결과가 아닙니다. 원격의 main에는 기존 README.md가 있으며 이 파일은 복원해 보존했습니다. Commit·Push는 수행하지 않았습니다.

네트워크 가능한 환경에서는 먼저 다른 빈 폴더로 원격 저장소를 clone합니다.

```powershell
git clone https://github.com/whdtn9507/Project_js.git Project_js
cd Project_js
git switch -c setup/machaw-manager
```

이후 생성한 소스와 SETUP.md, 설정 파일만 clone한 폴더로 복사합니다. README.md와 .git은 복사하거나 덮어쓰지 마세요. 기존 원격 파일이 추가되었다면 충돌 여부를 먼저 확인하세요.

```powershell
git remote -v
git branch -a
git status --short
npm install
npm run check
npm test
npm run dev
```

설치 시 생성되는 package-lock.json은 검토 후 함께 커밋합니다. API 키·토큰·쿠키·사용자 데이터를 추가하지 마세요. `.gitignore`는 .env, 로그, data, secrets, cookies, tokens 등을 제외합니다. 임의 파일에 직접 적은 비밀정보까지 자동 탐지하지는 않습니다.

Commit과 Push는 사용자가 변경 목록을 확인하고 승인한 후 진행합니다.
