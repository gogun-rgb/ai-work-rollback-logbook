import { execFile } from "node:child_process";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { UserFacingError } from "./errors";

const execFileAsync = promisify(execFile);
const MAX_DIFF_LINES = 2000;
const MAX_TEXT_PREVIEW_BYTES = 256 * 1024;

export type ChangeDecision = "KEEP" | "RESTORE" | "UNDECIDED";
export type GitChangeStatus =
  | "ADDED"
  | "MODIFIED"
  | "DELETED"
  | "RENAMED"
  | "UNTRACKED"
  | "UNKNOWN";

export type GitChange = {
  filePath: string;
  oldPath?: string;
  porcelainStatus: string;
  gitStatus: GitChangeStatus;
  additions: number;
  deletions: number;
  decision: ChangeDecision;
  statusSignature: string;
};

export type GitScan = {
  branch: string;
  changes: GitChange[];
  summary: {
    total: number;
    added: number;
    modified: number;
    deleted: number;
    renamed: number;
    untracked: number;
  };
};

export type DiffResult = {
  filePath: string;
  type: "diff" | "preview" | "binary" | "empty";
  content: string;
  truncated: boolean;
  lineCount: number;
  message?: string;
};

type GitCommandOptions = {
  timeout?: number;
  maxBuffer?: number;
};

type GitChangeFingerprint = {
  indexState: string;
  worktreeBlob: string;
  stagedDiff: string;
  unstagedDiff: string;
};

export function getGitBinary() {
  return process.env.GIT_BINARY || "git";
}

export async function assertUsableProjectPath(inputPath: string) {
  const absolutePath = path.resolve(inputPath.trim());

  let stat;
  try {
    stat = await fs.stat(absolutePath);
  } catch (error) {
    throw new UserFacingError(
      "입력한 폴더를 찾을 수 없습니다. 경로를 다시 복사해서 입력해주세요.",
      404,
      error
    );
  }

  if (!stat.isDirectory()) {
    throw new UserFacingError("입력한 경로는 폴더가 아닙니다. 프로젝트 폴더 경로를 입력해주세요.");
  }

  try {
    await fs.access(absolutePath);
  } catch (error) {
    throw new UserFacingError(
      "이 폴더에 접근할 권한이 없습니다. 권한을 확인한 뒤 다시 시도해주세요.",
      403,
      error
    );
  }

  await ensureGitAvailable();
  await ensureGitRepository(absolutePath);

  return absolutePath;
}

export async function ensureGitAvailable() {
  try {
    await execFileAsync(getGitBinary(), ["--version"], {
      timeout: 5000,
      windowsHide: true
    });
  } catch (error) {
    throw new UserFacingError(
      "Git 명령어를 실행할 수 없습니다. Git이 설치되어 있고 터미널에서 사용할 수 있는지 확인해주세요.",
      500,
      error
    );
  }
}

export async function ensureGitRepository(projectPath: string) {
  try {
    const result = await runGit(projectPath, ["rev-parse", "--is-inside-work-tree"]);
    if (result.trim() !== "true") {
      throw new Error("Not a Git repository");
    }
  } catch (error) {
    throw new UserFacingError(
      "이 폴더는 Git 저장소가 아닙니다. Git으로 관리 중인 프로젝트 폴더를 선택해주세요.",
      400,
      error
    );
  }
}

export async function runGit(
  projectPath: string,
  args: string[],
  options: GitCommandOptions = {}
) {
  try {
    const { stdout } = await execFileAsync(getGitBinary(), args, {
      cwd: projectPath,
      timeout: options.timeout ?? 15000,
      maxBuffer: options.maxBuffer ?? 5 * 1024 * 1024,
      windowsHide: true,
      encoding: "utf8",
      env: {
        ...process.env,
        GIT_OPTIONAL_LOCKS: "0"
      }
    });
    return stdout;
  } catch (error) {
    throw new UserFacingError(
      "Git 명령어 실행에 실패했습니다. 프로젝트 상태와 파일 권한을 확인해주세요.",
      500,
      error
    );
  }
}

export async function getCurrentBranch(projectPath: string) {
  const branch = (await runGit(projectPath, ["branch", "--show-current"])).trim();
  return branch || "(분리된 HEAD)";
}

export function parsePorcelainStatus(output: string) {
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const porcelainStatus = line.slice(0, 2);
      const rawPath = line.slice(3);
      let filePath = rawPath;
      let oldPath: string | undefined;

      if (porcelainStatus.includes("R") && rawPath.includes(" -> ")) {
        const [from, to] = rawPath.split(" -> ");
        oldPath = decodeGitPath(from);
        filePath = decodeGitPath(to);
      } else {
        filePath = decodeGitPath(rawPath);
      }

      return {
        filePath,
        oldPath,
        porcelainStatus,
        gitStatus: mapPorcelainToStatus(porcelainStatus)
      };
    });
}

export function decodeGitPath(rawPath: string) {
  if (!(rawPath.startsWith('"') && rawPath.endsWith('"'))) {
    return rawPath;
  }

  return rawPath
    .slice(1, -1)
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\\t/g, "\t")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r");
}

export function mapPorcelainToStatus(status: string): GitChangeStatus {
  if (status === "??") return "UNTRACKED";
  if (status.includes("R")) return "RENAMED";
  if (status.includes("D")) return "DELETED";
  if (status.includes("A")) return "ADDED";
  if (status.includes("M")) return "MODIFIED";
  return "UNKNOWN";
}

export function parseNumstat(output: string) {
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .reduce(
      (totals, line) => {
        const [additions, deletions] = line.split(/\s+/);
        return {
          additions: totals.additions + numberOrZero(additions),
          deletions: totals.deletions + numberOrZero(deletions)
        };
      },
      { additions: 0, deletions: 0 }
    );
}

function numberOrZero(value?: string) {
  if (!value || value === "-") return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function createStatusSignature(
  change: Omit<GitChange, "statusSignature" | "decision">,
  fingerprint: GitChangeFingerprint = {
    indexState: "",
    worktreeBlob: "",
    stagedDiff: "",
    unstagedDiff: ""
  }
) {
  return crypto
    .createHash("sha256")
    .update(
      [
        change.filePath,
        change.oldPath ?? "",
        change.porcelainStatus,
        change.gitStatus,
        change.additions,
        change.deletions,
        fingerprint.indexState,
        fingerprint.worktreeBlob,
        fingerprint.stagedDiff,
        fingerprint.unstagedDiff
      ].join("\0")
    )
    .digest("hex");
}

export async function scanGitChanges(projectPath: string): Promise<GitScan> {
  const [branch, statusOutput] = await Promise.all([
    getCurrentBranch(projectPath),
    runGit(projectPath, ["-c", "core.quotePath=false", "status", "--porcelain=v1"])
  ]);

  const parsed = parsePorcelainStatus(statusOutput);
  const changes = await Promise.all(
    parsed.map(async (change) => {
      const [stats, fingerprint] = await Promise.all([
        getFileNumstat(projectPath, change.filePath, change.gitStatus),
        getFileFingerprint(projectPath, change.filePath)
      ]);
      const base = {
        ...change,
        additions: stats.additions,
        deletions: stats.deletions
      };

      return {
        ...base,
        decision: "UNDECIDED" as const,
        statusSignature: createStatusSignature(base, fingerprint)
      };
    })
  );

  return {
    branch,
    changes,
    summary: summarizeChanges(changes)
  };
}

export async function getFileNumstat(
  projectPath: string,
  filePath: string,
  status: GitChangeStatus
) {
  if (status === "UNTRACKED") {
    return { additions: 0, deletions: 0 };
  }

  const [unstaged, staged] = await Promise.all([
    runGit(projectPath, ["diff", "--numstat", "--", filePath]).catch(() => ""),
    runGit(projectPath, ["diff", "--cached", "--numstat", "--", filePath]).catch(() => "")
  ]);

  const unstagedStats = parseNumstat(unstaged);
  const stagedStats = parseNumstat(staged);

  return {
    additions: unstagedStats.additions + stagedStats.additions,
    deletions: unstagedStats.deletions + stagedStats.deletions
  };
}

async function getFileFingerprint(
  projectPath: string,
  filePath: string
): Promise<GitChangeFingerprint> {
  const [indexState, worktreeBlob, stagedDiff, unstagedDiff] = await Promise.all([
    runGit(projectPath, ["ls-files", "--stage", "--", filePath]).catch(() => ""),
    runGit(projectPath, ["hash-object", "--no-filters", "--", filePath]).catch(() => "missing"),
    getDiffHash(projectPath, filePath, true),
    getDiffHash(projectPath, filePath, false)
  ]);

  return {
    indexState: hashText(indexState),
    worktreeBlob: worktreeBlob.trim() || "missing",
    stagedDiff,
    unstagedDiff
  };
}

async function getDiffHash(projectPath: string, filePath: string, staged: boolean) {
  const args = staged
    ? ["-c", "core.quotePath=false", "diff", "--cached", "--full-index", "--binary", "--", filePath]
    : ["-c", "core.quotePath=false", "diff", "--full-index", "--binary", "--", filePath];
  const diff = await runGit(projectPath, args, { maxBuffer: 16 * 1024 * 1024 }).catch(() => "");
  return hashText(diff);
}

function hashText(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function summarizeChanges(changes: GitChange[]) {
  return {
    total: changes.length,
    added: changes.filter((change) => change.gitStatus === "ADDED").length,
    modified: changes.filter((change) => change.gitStatus === "MODIFIED").length,
    deleted: changes.filter((change) => change.gitStatus === "DELETED").length,
    renamed: changes.filter((change) => change.gitStatus === "RENAMED").length,
    untracked: changes.filter((change) => change.gitStatus === "UNTRACKED").length
  };
}

export async function getFileDiff(
  projectPath: string,
  filePath: string,
  gitStatus: GitChangeStatus
): Promise<DiffResult> {
  assertSafeRelativePath(projectPath, filePath);

  if (gitStatus === "UNTRACKED") {
    return getUntrackedPreview(projectPath, filePath);
  }

  const [diff, cachedDiff] = await Promise.all([
    runGit(projectPath, ["-c", "core.quotePath=false", "diff", "--", filePath], {
      maxBuffer: 8 * 1024 * 1024
    }),
    runGit(projectPath, ["-c", "core.quotePath=false", "diff", "--cached", "--", filePath], {
      maxBuffer: 8 * 1024 * 1024
    })
  ]);
  const content = combineDiffs(cachedDiff, diff);

  if (!content.trim()) {
    return {
      filePath,
      type: "empty",
      content: "",
      truncated: false,
      lineCount: 0,
      message: "표시할 diff가 없습니다. 파일 상태가 다시 바뀌었을 수 있습니다."
    };
  }

  if (/^Binary files/m.test(content)) {
    return {
      filePath,
      type: "binary",
      content: "",
      truncated: false,
      lineCount: 0,
      message: "바이너리 파일은 앱에서 미리보기를 제공하지 않습니다."
    };
  }

  return limitLines(filePath, "diff", content);
}

function combineDiffs(stagedDiff: string, unstagedDiff: string) {
  const sections = [];

  if (stagedDiff.trim()) {
    sections.push(["# Staged changes", stagedDiff.trimEnd()].join("\n\n"));
  }

  if (unstagedDiff.trim()) {
    sections.push(["# Unstaged changes", unstagedDiff.trimEnd()].join("\n\n"));
  }

  return sections.join("\n\n");
}

async function getUntrackedPreview(projectPath: string, filePath: string): Promise<DiffResult> {
  const absoluteFilePath = assertSafeRelativePath(projectPath, filePath);

  let handle;
  try {
    handle = await fs.open(absoluteFilePath, "r");
    const buffer = Buffer.alloc(MAX_TEXT_PREVIEW_BYTES + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const data = buffer.subarray(0, bytesRead);

    if (data.includes(0)) {
      return {
        filePath,
        type: "binary",
        content: "",
        truncated: false,
        lineCount: 0,
        message: "추적되지 않은 바이너리 파일은 미리보기를 제공하지 않습니다."
      };
    }

    const content = data.toString("utf8");
    const result = limitLines(filePath, "preview", content);
    return {
      ...result,
      truncated: result.truncated || bytesRead > MAX_TEXT_PREVIEW_BYTES,
      message: bytesRead > MAX_TEXT_PREVIEW_BYTES ? "파일 일부만 표시했습니다." : result.message
    };
  } catch (error) {
    throw new UserFacingError(
      "새 파일 미리보기를 불러오지 못했습니다. 파일이 이동되었거나 권한이 바뀌었을 수 있습니다.",
      400,
      error
    );
  } finally {
    await handle?.close();
  }
}

function limitLines(filePath: string, type: "diff" | "preview", content: string): DiffResult {
  const lines = content.split(/\r?\n/);
  const truncated = lines.length > MAX_DIFF_LINES;
  return {
    filePath,
    type,
    content: truncated ? lines.slice(0, MAX_DIFF_LINES).join("\n") : content,
    truncated,
    lineCount: lines.length,
    message: truncated ? `${MAX_DIFF_LINES.toLocaleString("ko-KR")}줄까지만 표시했습니다.` : undefined
  };
}

export function assertSafeRelativePath(projectPath: string, relativePath: string) {
  if (path.isAbsolute(relativePath)) {
    throw new UserFacingError("프로젝트 내부의 상대 파일 경로만 사용할 수 있습니다.");
  }

  const resolvedProjectPath = path.resolve(projectPath);
  const resolvedFilePath = path.resolve(resolvedProjectPath, relativePath);
  const relative = path.relative(resolvedProjectPath, resolvedFilePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new UserFacingError("프로젝트 폴더 밖의 파일은 조작할 수 없습니다.");
  }

  return resolvedFilePath;
}

export function canRestoreWithGitRestore(status: GitChangeStatus) {
  return status === "MODIFIED" || status === "DELETED";
}

export async function restoreSelectedFiles(
  projectPath: string,
  files: Array<{ filePath: string; gitStatus: GitChangeStatus; statusSignature: string }>
) {
  const currentScan = await scanGitChanges(projectPath);
  const currentByPath = new Map(
    currentScan.changes.map((change) => [change.filePath, change.statusSignature])
  );

  const changedAfterReview = files.filter(
    (file) => currentByPath.get(file.filePath) !== file.statusSignature
  );

  if (changedAfterReview.length > 0) {
    throw new UserFacingError(
      "파일을 확인한 이후 변경 내용이 다시 수정되었습니다. 최신 변경 사항을 새로고침한 뒤 다시 선택하세요.",
      409,
      changedAfterReview
    );
  }

  const results = [];

  for (const file of files) {
    assertSafeRelativePath(projectPath, file.filePath);

    if (!canRestoreWithGitRestore(file.gitStatus)) {
      results.push({
        filePath: file.filePath,
        success: false,
        skipped: true,
        message:
          file.gitStatus === "UNTRACKED"
            ? "이 파일은 Git이 추적하지 않는 새 파일이므로 앱에서 자동 삭제하지 않습니다. 파일 탐색기에서 직접 확인한 뒤 삭제하세요."
            : "MVP에서는 수정되었거나 삭제된 추적 파일만 자동으로 되돌립니다."
      });
      continue;
    }

    try {
      await runGit(projectPath, ["restore", "--staged", "--worktree", "--", file.filePath], {
        timeout: 15000
      });
      results.push({
        filePath: file.filePath,
        success: true,
        skipped: false,
        message: "파일을 되돌렸습니다."
      });
    } catch (error) {
      results.push({
        filePath: file.filePath,
        success: false,
        skipped: false,
        message: error instanceof Error ? error.message : "파일 되돌리기에 실패했습니다."
      });
    }
  }

  return results;
}

export function projectNameFromPath(projectPath: string) {
  return path.basename(path.resolve(projectPath));
}
