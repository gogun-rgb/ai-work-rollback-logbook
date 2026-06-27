# Architecture

AI 작업 되돌리기 로그북은 로컬 Git 저장소를 대상으로 동작하는 Next.js App Router 앱입니다. 서버 API가 Git CLI와 SQLite를 다루고, 클라이언트 UI는 파일 검토와 작업 로그 작성 흐름을 제공합니다.

## 구성 요소

- Next.js UI: `src/components`와 `src/app` 페이지가 프로젝트 선택, 변경 파일 검토, 작업 로그 작성, 로그 상세 조회를 담당합니다.
- API Routes: `src/app/api` 아래 route가 프로젝트 검사, 변경 사항 스캔, diff 조회, 복구 실행, 작업 로그 CRUD를 제공합니다.
- Git 실행 계층: `src/lib/git.ts`가 Git 명령 실행, 상태 파싱, diff 생성, 안전 서명, 복구 실행을 담당합니다.
- Prisma/SQLite: `prisma/schema.prisma`와 `src/lib/prisma.ts`가 프로젝트, 작업 로그, 파일 변경 기록을 로컬 SQLite에 저장합니다.
- SQLite migration runner: `scripts/migrate-sqlite.mjs`가 `prisma/migrations/*/migration.sql`을 읽어 로컬 DB에 적용합니다.
- 검증 계층: `src/test/git-utils.test.ts`가 Git 통합 동작과 복구 안전성을 테스트합니다.

## 작업 로그 생성 흐름

1. 사용자가 프로젝트 경로를 입력합니다.
2. `/api/projects/check`가 경로를 검증하고 Git 저장소 여부를 확인합니다.
3. `scanGitChanges`가 현재 브랜치와 변경 파일 목록을 읽습니다.
4. 사용자가 파일별 결정을 선택하고 작업 메모를 작성합니다.
5. `/api/worklogs`가 작업 로그, 파일별 결정, 상태 서명을 SQLite에 저장합니다.

## 파일 복구 요청 흐름

1. 사용자가 파일을 `되돌리기 예정`으로 표시합니다.
2. 안전 체크리스트를 모두 확인합니다.
3. `/api/restore`가 요청 파일과 저장된 상태 서명을 받습니다.
4. `restoreSelectedFiles`가 복구 직전 현재 Git 상태를 다시 스캔합니다.
5. 파일 상태 서명이 바뀌면 전체 복구 요청을 중단합니다.
6. 지원되는 추적 파일만 `git restore --staged --worktree -- <file>`로 복구합니다.
7. 복구 결과와 새 Git 스캔 결과를 UI에 반환합니다.

## 데이터 모델

- `Project`: 로컬 Git 프로젝트 경로, 이름, 브랜치, 마지막 스캔 시각을 저장합니다.
- `WorkLog`: AI 작업 요청, 결과, 실패 원인, 배운 점, 다음 체크리스트를 저장합니다.
- `FileChange`: 작업 로그에 연결된 파일 경로, Git 상태, 변경량, 사용자 결정, 복구 결과를 저장합니다.

## 로컬 우선 원칙

앱은 사용자의 로컬 파일 시스템과 로컬 SQLite 데이터베이스를 사용합니다. 원격 저장소 상태, Pull Request, 클라우드 동기화는 MVP 범위에 포함하지 않습니다.
