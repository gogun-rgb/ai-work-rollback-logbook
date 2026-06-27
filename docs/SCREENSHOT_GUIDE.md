# Screenshot Guide

이 저장소에는 아직 실제 스크린샷이나 데모 GIF가 포함되어 있지 않습니다. 포트폴리오용 이미지를 추가할 때는 아래 절차로 실제 앱 화면만 캡처하세요.

## 샘플 Git 저장소 구성

개인 경로가 드러나지 않는 임시 위치에 샘플 저장소를 만듭니다.

```bash
mkdir rollback-logbook-demo-repo
cd rollback-logbook-demo-repo
git init
git config user.email demo@example.com
git config user.name "Demo User"
```

샘플 파일:

```text
notes.md
src/example.ts
docs/guide.md
```

초기 커밋 후 다음 변경을 만듭니다.

- `notes.md`: unstaged 수정
- `src/example.ts`: staged 수정 후 다시 unstaged 수정
- `docs/guide.md`: 삭제
- `new-idea.md`: untracked 파일

staged와 unstaged가 동시에 있는 파일을 만들려면 다음 흐름을 사용할 수 있습니다.

```bash
echo "export const value = 1;" > src/example.ts
git add src/example.ts
git commit -m "initial demo"
echo "export const value = 2;" > src/example.ts
git add src/example.ts
echo "export const value = 3;" > src/example.ts
```

## 캡처할 화면

다음 파일명으로 `docs/images/`에 저장하는 것을 권장합니다.

- `01-project-input.png`: 프로젝트 경로 입력 화면
- `02-change-list.png`: 변경 파일 목록 화면
- `03-staged-unstaged-diff.png`: staged와 unstaged diff가 함께 표시되는 화면
- `04-file-decisions.png`: 유지/되돌리기 결정 화면
- `05-restore-complete.png`: 복구 완료 메시지 화면
- `06-worklog-detail.png`: 작업 로그 목록 또는 상세 화면

## 짧은 데모 영상 흐름

가능하면 `docs/demo/rollback-flow.webm` 또는 `docs/demo/rollback-flow.gif`로 저장합니다.

```text
샘플 저장소 선택
-> 변경 파일 검토
-> staged/unstaged diff 검토
-> 복구할 파일 선택
-> 안전 체크리스트 확인
-> 복구 실행
-> Git 상태 확인
```

## 주의사항

- 실제 사용자 이름, 개인 폴더 경로, API 키, 실제 작업 로그를 노출하지 마세요.
- 이미지를 만들거나 합성하지 마세요.
- README에는 파일이 실제로 존재할 때만 이미지 링크를 추가하세요.
