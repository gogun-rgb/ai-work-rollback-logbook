# Changelog

## 0.1.2 - Portfolio polish

### Documentation

- Reworked the README for public portfolio review with a CI badge, 30-second flow, safety model summary, setup, tests, limitations, roadmap, and docs links.
- Added `docs/ARCHITECTURE.md`.
- Added `docs/SAFETY_MODEL.md`.
- Added `docs/SCREENSHOT_GUIDE.md` instead of linking fake screenshots.

### Tooling

- Added a GitHub Actions CI workflow for Ubuntu and Windows.
- Pinned dependency versions in `package.json` and `pnpm-lock.yaml`.
- Added `pnpm setup` and `pnpm verify` scripts.
- Added a build wrapper that clears stale Next.js build output before running `next build --webpack`.
- Added a local SQLite migration runner for checked-in `prisma/migrations/*/migration.sql` files.
- Added Windows setup/start helper scripts.
- Excluded generated `work`, `outputs`, and Codex dependency folders from TypeScript and ESLint inputs.
- Added the Prisma migration lock file for SQLite.

### Test coverage

- Added staged deletion restore coverage.
- Added staged and unstaged modification restore coverage.
- Added skipped handling coverage for newly staged files and renamed files.
- Added binary diff, large diff truncation, detached HEAD scan, and deleted-before-restore blocking coverage.

## 0.1.1 - Restore safety update

### Safety fixes

- Preserved untracked files by never running automatic clean/delete commands.
- Blocked file paths outside the selected project folder.
- Added restore signatures that include Git status metadata, worktree blob, index state, staged diff hash, and unstaged diff hash.
- Blocked restore when content changes after review, even when line counts stay the same.
- Restored supported tracked files with `git restore --staged --worktree -- <file>`.
- Displayed staged and unstaged diffs together when both exist.

## 0.1.0 - MVP

### Core features

- Added a local-first Next.js app for reviewing AI coding changes.
- Added local Git project registration and recent project lookup.
- Added Git status scanning with branch, file status, additions, and deletions.
- Added file diff preview and untracked text-file preview.
- Added work log creation with AI tool, prompt, result, failure cause, error message, lesson, and next checklist fields.
- Added work log list and detail views.
- Added file-level restore flow with a safety checklist.

### Current limitations

- Untracked files are not automatically deleted.
- Newly staged files are not automatically restored.
- Renamed files are not automatically restored.
- Remote repository state and Pull Request metadata are outside the app scope.
- Screenshot assets are not included yet; see `docs/SCREENSHOT_GUIDE.md`.
- The app does not create backup files before restore.
- Merge conflicts, submodules, sparse checkouts, and other advanced Git states are not modeled separately.
- Binary file diffs are shown as binary notices rather than inline content.
