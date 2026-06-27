import { existsSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

ensureEnvFile();
run("Generate Prisma Client", ["db:generate"]);
run("Apply SQLite migrations", ["db:migrate"]);

console.log("Setup complete. Run pnpm dev to start the app.");

function ensureEnvFile() {
  if (existsSync(".env")) {
    console.log("Existing .env file preserved.");
    return;
  }

  if (existsSync(".env.example")) {
    copyFileSync(".env.example", ".env");
    console.log("Created .env from .env.example without overwriting existing files.");
    return;
  }

  console.log('No .env file found. Create one with DATABASE_URL="file:./dev.db".');
}

function run(label, args) {
  console.log(`${label}...`);
  const result = spawnSync(pnpm, args, { stdio: "inherit", shell: false });

  if (result.status !== 0) {
    console.error(`${label} failed.`);
    process.exit(result.status ?? 1);
  }
}
