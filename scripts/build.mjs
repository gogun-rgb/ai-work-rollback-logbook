import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

rmSync(path.resolve(process.cwd(), ".next"), { recursive: true, force: true });

const result = spawnSync(process.execPath, [nextBin, "build", "--webpack"], {
  stdio: "inherit",
  shell: false
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
