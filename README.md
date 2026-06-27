# AI 작업 되돌리기 로그북

AI 코딩 도구가 바꾼 파일을 검토하고, 유지할 변경과 되돌릴 변경을 안전하게 기록하는 로컬 우선 웹 앱입니다.

[![CI](https://github.com/gogun-rgb/ai-work-rollback-logbook/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/gogun-rgb/ai-work-rollback-logbook/actions/workflows/ci.yml)

## 화면 자료

아직 저장소에 실제 스크린샷은 포함하지 않았습니다. 가짜 이미지는 넣지 않았으며, 촬영할 장면과 샘플 저장소 구성은 [스크린샷 촬영 가이드](docs/SCREENSHOT_GUIDE.md)에 정리했습니다.

## 만든 이유

AI 코딩 도구가 여러 파일을 동시에 수정하면 Git 초보자는 어떤 변경을 유지하고 어떤 변경을 되돌려야 하는지 판단하기 어렵습니다. 이 프로젝트는 변경 파일 검토, diff 확인, 선택 복구, 실패 기록을 하나의 로컬 앱으로 묶어 “일단 전체를 되돌리기” 대신 파일 단위로 차분하게 결정할 수 있게 만들었습니다.

## 30초 사용 흐름

1. Git으로 관리 중인 프로젝트 폴더의 절대 경로를 입력합니다.
2. 앱이 현재 브랜치와 변경 파일 목록을 읽습니다.
3. 파일별 diff를 보고 `유지`, `되돌리기 예정`, `미결정`으로 분류합니다.
4. 작업 로그에 AI 도구, 요청, 결과, 실패 원인, 배운 점을 저장합니다.
5. 되돌릴 파일만 선택하고 안전 체크리스트를 확인한 뒤 복구합니다.
6. 복구 후 다시 스캔된 Git 상태를 확인합니다.

## 핵심 기능

- 로컬 Git 프로젝트 경로 검사
- Git 저장소 여부와 현재 브랜치 확인
- `git status --porcelain` 기반 변경 파일 목록 표시
- 파일별 diff 또는 새 텍스트 파일 미리보기
- staged 변경과 unstaged 변경 동시 표시
- 파일별 유지, 되돌리기 예정, 미결정 기록
- AI 작업 요청, 실패 원인, 오류 메시지, 배운 점 저장
- 로그북 목록과 상세 조회
- 선택한 추적 파일만 `git restore --staged --worktree -- <file>`로 복구
- 추적되지 않은 새 파일 자동 삭제 방지
- 검토 이후 상태나 내용이 바뀐 파일의 복구 차단

## 안전 설계

- Git 명령은 shell 문자열 조합 대신 `execFile`과 인자 배열로 실행합니다.
- 프로젝트 폴더 밖의 상대 경로, 절대 경로, `..` 경로는 차단합니다.
- 복구 직전 Git 상태를 다시 스캔해 사용자가 검토한 상태와 같은지 확인합니다.
- 상태 서명에는 파일 경로, Git 상태, 변경 통계, 작업트리 blob, 인덱스 상태, staged diff 해시, unstaged diff 해시가 들어갑니다.
- staged-only 변경도 작업트리와 스테이징 영역을 함께 되돌립니다.
- 추적되지 않은 파일은 앱에서 자동 삭제하지 않습니다.
- 이름 변경 파일과 새로 staged된 파일은 MVP에서 자동 복구하지 않고 제한 사항으로 안내합니다.

자세한 내용은 [안전 모델 문서](docs/SAFETY_MODEL.md)를 참고하세요.

## 빠른 설치

필요한 프로그램:

- Node.js 22.12 이상, 24 권장
- pnpm 11.7.0
- Git

```bash
git clone https://github.com/gogun-rgb/ai-work-rollback-logbook.git
cd ai-work-rollback-logbook
pnpm install --frozen-lockfile
pnpm setup
pnpm dev
```

브라우저에서 표시된 로컬 주소를 엽니다.

`pnpm setup`은 기존 `.env`를 덮어쓰지 않고, Prisma Client 생성과 SQLite migration 적용을 수행합니다.

## 상세 사용 방법

첫 화면의 입력창에 Git으로 관리 중인 프로젝트 폴더의 절대 경로를 넣습니다.

```text
C:\Example\sample-project
```

Windows에서 경로를 복사하는 방법:

1. 파일 탐색기에서 프로젝트 폴더를 엽니다.
2. 주소 표시줄의 빈 곳을 클릭합니다.
3. 전체 경로를 복사합니다.
4. 앱의 프로젝트 경로 입력창에 붙여넣습니다.

작업 로그를 만들 때는 각 파일의 결정을 저장합니다. 복구를 실행할 때는 되돌리기 예정 파일만 처리되며, 복구 직전에 상태 서명을 다시 비교합니다.

## 테스트 방법

```bash
pnpm verify
```

개별 명령은 다음과 같습니다.

```bash
pnpm lint
pnpm test
pnpm build
```

CI에서는 `pnpm db:generate`, `pnpm db:migrate`, `pnpm lint`, `pnpm test`, `pnpm build`를 Ubuntu와 Windows에서 실행합니다.

## 지원 범위와 제한

- 기존 추적 파일의 수정 및 삭제 복구를 지원합니다.
- staged 및 unstaged 수정은 `git restore --staged --worktree -- <file>`로 함께 되돌립니다.
- 추적되지 않은 새 파일은 자동 삭제하지 않습니다.
- 새로 staged된 파일은 변경 목록과 diff 확인 대상이지만 자동 복구 대상은 아닙니다.
- renamed 파일은 변경 목록에 표시하지만 자동 복구 대상은 아닙니다.
- 원격 저장소 상태, Pull Request, GitHub Actions 결과는 앱 안에서 다루지 않습니다.
- 여러 프로젝트를 한 화면에서 동시에 비교하지 않습니다.

## 구조 문서

- [아키텍처](docs/ARCHITECTURE.md)
- [안전 모델](docs/SAFETY_MODEL.md)
- [스크린샷 촬영 가이드](docs/SCREENSHOT_GUIDE.md)
- [변경 로그](CHANGELOG.md)

## 로드맵

1. 로그북 기록 내 diff 스냅샷 저장 옵션
2. 파일별 테스트 명령 메모
3. 실제 스크린샷과 실행 결과 첨부
4. 복원 전 백업 파일 생성 옵션
5. 프로젝트별 기본 체크리스트 템플릿

## 기여 방법

기여 전 [CONTRIBUTING.md](CONTRIBUTING.md)를 읽어주세요. API 키, 개인 경로, 실제 작업 로그, SQLite 데이터베이스 파일, 환경변수 파일은 저장소에 올리지 않습니다.

## 라이선스

MIT License입니다. 자세한 내용은 [LICENSE](LICENSE)를 확인하세요.
