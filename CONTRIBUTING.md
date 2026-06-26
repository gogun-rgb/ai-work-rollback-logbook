# 기여 방법

## 개발 환경 실행

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

## 브랜치 생성

```bash
git checkout -b feat/my-change
```

## 테스트 실행

```bash
npm run test
npm run lint
npm run build
```

## Pull Request 작성

- 변경한 기능을 간단히 설명합니다.
- 테스트한 명령을 적습니다.
- 되돌리기 기능을 바꿨다면 안전장치를 함께 설명합니다.

## 민감한 정보 업로드 금지

다음 파일이나 정보는 저장소에 올리지 않습니다.

- `.env`
- SQLite 데이터베이스 파일
- API 키 또는 토큰
- 개인 프로젝트 경로
- 실제 작업 로그 데이터
- 실제 Git diff 기록
