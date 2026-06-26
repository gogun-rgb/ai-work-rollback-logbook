import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { UserFacingError } from "@/lib/errors";
import {
  assertSafeRelativePath,
  ensureGitRepository,
  getGitBinary,
  parseNumstat,
  parsePorcelainStatus,
  restoreSelectedFiles,
  scanGitChanges
} from "@/lib/git";

const execFileAsync = promisify(execFile);

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rollback-logbook-"));
});

afterEach(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe("Git status parsing", () => {
  it("parses modified, deleted, untracked, renamed, Korean, and spaced paths", () => {
    const rows = parsePorcelainStatus(
      [
        " M src/app/page.tsx",
        ' D "old file.txt"',
        '?? "한글 파일 (1).txt"',
        'R  "old name.ts" -> "new name.ts"'
      ].join("\n")
    );

    expect(rows).toEqual([
      {
        filePath: "src/app/page.tsx",
        oldPath: undefined,
        porcelainStatus: " M",
        gitStatus: "MODIFIED"
      },
      {
        filePath: "old file.txt",
        oldPath: undefined,
        porcelainStatus: " D",
        gitStatus: "DELETED"
      },
      {
        filePath: "한글 파일 (1).txt",
        oldPath: undefined,
        porcelainStatus: "??",
        gitStatus: "UNTRACKED"
      },
      {
        filePath: "new name.ts",
        oldPath: "old name.ts",
        porcelainStatus: "R ",
        gitStatus: "RENAMED"
      }
    ]);
  });

  it("adds text numstat and ignores binary markers", () => {
    expect(parseNumstat("10\t2\tsrc/a.ts\n-\t-\timage.png")).toEqual({
      additions: 10,
      deletions: 2
    });
  });
});

describe("Path safety", () => {
  it("rejects paths outside of the project", () => {
    expect(() => assertSafeRelativePath(tempRoot, "../outside.txt")).toThrow(UserFacingError);
    expect(() => assertSafeRelativePath(tempRoot, path.resolve(tempRoot, "file.txt"))).toThrow(
      UserFacingError
    );
  });
});

describe("Git integration", () => {
  it("rejects a folder that is not a Git repository", async () => {
    await expect(ensureGitRepository(tempRoot)).rejects.toThrow(UserFacingError);
  });

  it("scans modified, deleted, untracked, Korean, and spaced filenames", async () => {
    await initRepository(tempRoot);
    await fs.writeFile(path.join(tempRoot, "tracked.txt"), "one\n", "utf8");
    await fs.writeFile(path.join(tempRoot, "delete me.txt"), "remove\n", "utf8");
    await fs.writeFile(path.join(tempRoot, "한글 파일 (1).txt"), "처음\n", "utf8");
    await git(tempRoot, ["add", "."]);
    await git(tempRoot, ["commit", "-m", "initial"]);

    await fs.writeFile(path.join(tempRoot, "tracked.txt"), "one\ntwo\n", "utf8");
    await fs.rm(path.join(tempRoot, "delete me.txt"));
    await fs.writeFile(path.join(tempRoot, "new file.txt"), "new\n", "utf8");
    await fs.writeFile(path.join(tempRoot, "한글 파일 (1).txt"), "처음\n둘\n", "utf8");

    const scan = await scanGitChanges(tempRoot);
    const byPath = new Map(scan.changes.map((change) => [change.filePath, change.gitStatus]));

    expect(byPath.get("tracked.txt")).toBe("MODIFIED");
    expect(byPath.get("delete me.txt")).toBe("DELETED");
    expect(byPath.get("new file.txt")).toBe("UNTRACKED");
    expect(byPath.get("한글 파일 (1).txt")).toBe("MODIFIED");
  });

  it("restores one tracked modified file", async () => {
    await initRepository(tempRoot);
    await fs.writeFile(path.join(tempRoot, "tracked.txt"), "one\n", "utf8");
    await git(tempRoot, ["add", "."]);
    await git(tempRoot, ["commit", "-m", "initial"]);
    await fs.writeFile(path.join(tempRoot, "tracked.txt"), "changed\n", "utf8");

    const scan = await scanGitChanges(tempRoot);
    const change = scan.changes.find((item) => item.filePath === "tracked.txt");
    expect(change).toBeDefined();

    const results = await restoreSelectedFiles(tempRoot, [
      {
        filePath: change!.filePath,
        gitStatus: change!.gitStatus,
        statusSignature: change!.statusSignature
      }
    ]);

    expect(results[0]).toMatchObject({ success: true, skipped: false });
    const restored = await fs.readFile(path.join(tempRoot, "tracked.txt"), "utf8");
    expect(restored.replace(/\r\n/g, "\n")).toBe("one\n");
  });

  it("does not delete untracked files", async () => {
    await initRepository(tempRoot);
    await fs.writeFile(path.join(tempRoot, "tracked.txt"), "one\n", "utf8");
    await git(tempRoot, ["add", "."]);
    await git(tempRoot, ["commit", "-m", "initial"]);
    await fs.writeFile(path.join(tempRoot, "new file.txt"), "new\n", "utf8");

    const scan = await scanGitChanges(tempRoot);
    const change = scan.changes.find((item) => item.filePath === "new file.txt");
    expect(change).toBeDefined();

    const results = await restoreSelectedFiles(tempRoot, [
      {
        filePath: change!.filePath,
        gitStatus: change!.gitStatus,
        statusSignature: change!.statusSignature
      }
    ]);

    expect(results[0]).toMatchObject({ success: false, skipped: true });
    await expect(fs.readFile(path.join(tempRoot, "new file.txt"), "utf8")).resolves.toBe("new\n");
  });

  it("blocks restore when the file changed after review", async () => {
    await initRepository(tempRoot);
    await fs.writeFile(path.join(tempRoot, "tracked.txt"), "one\n", "utf8");
    await git(tempRoot, ["add", "."]);
    await git(tempRoot, ["commit", "-m", "initial"]);
    await fs.writeFile(path.join(tempRoot, "tracked.txt"), "changed once\n", "utf8");

    const scan = await scanGitChanges(tempRoot);
    const change = scan.changes.find((item) => item.filePath === "tracked.txt");
    expect(change).toBeDefined();

    await fs.writeFile(path.join(tempRoot, "tracked.txt"), "changed again\nextra\n", "utf8");

    await expect(
      restoreSelectedFiles(tempRoot, [
        {
          filePath: change!.filePath,
          gitStatus: change!.gitStatus,
          statusSignature: change!.statusSignature
        }
      ])
    ).rejects.toThrow(UserFacingError);
  });
});

async function initRepository(repoPath: string) {
  await git(repoPath, ["init"]);
  await git(repoPath, ["config", "user.email", "example@example.com"]);
  await git(repoPath, ["config", "user.name", "Example User"]);
  await git(repoPath, ["config", "core.autocrlf", "false"]);
}

async function git(repoPath: string, args: string[]) {
  await execFileAsync(getGitBinary(), args, {
    cwd: repoPath,
    windowsHide: true,
    env: {
      ...process.env,
      GIT_OPTIONAL_LOCKS: "0"
    }
  });
}
