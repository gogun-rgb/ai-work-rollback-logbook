import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import Database from "better-sqlite3";

const migrationsRoot = path.resolve(process.cwd(), "prisma", "migrations");
const databaseUrl = process.env.DATABASE_URL ?? readDatabaseUrlFromEnvFile() ?? "file:./dev.db";
const databasePath = resolveSqliteFilePath(databaseUrl);

mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);

try {
  ensureMigrationsTable(db);

  const migrations = listMigrations(migrationsRoot);

  for (const migration of migrations) {
    applyMigration(db, migration);
  }

  console.log(`SQLite migrations complete: ${migrations.length} checked.`);
} finally {
  db.close();
}

function readDatabaseUrlFromEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return undefined;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  const line = lines.find((item) => item.trim().startsWith("DATABASE_URL="));
  const value = line?.split("=").slice(1).join("=").trim();

  if (!value) {
    return undefined;
  }

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

function resolveSqliteFilePath(value) {
  if (!value.startsWith("file:")) {
    throw new Error("Only SQLite file: DATABASE_URL values are supported.");
  }

  let filePath = decodeURIComponent(value.slice("file:".length));

  if (filePath.startsWith("//")) {
    throw new Error("SQLite network file URLs are not supported.");
  }

  if (/^\/[a-zA-Z]:\//.test(filePath)) {
    filePath = filePath.slice(1);
  }

  if (!path.isAbsolute(filePath)) {
    filePath = path.resolve(process.cwd(), filePath);
  }

  return filePath;
}

function ensureMigrationsTable(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    );
  `);
}

function listMigrations(root) {
  if (!existsSync(root)) {
    return [];
  }

  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const migrationPath = path.join(root, entry.name, "migration.sql");
      const sql = readFileSync(migrationPath, "utf8");

      return {
        name: entry.name,
        sql,
        checksum: createHash("sha256").update(sql).digest("hex")
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function applyMigration(database, migration) {
  const existing = database
    .prepare('SELECT "checksum", "finished_at", "rolled_back_at" FROM "_prisma_migrations" WHERE "migration_name" = ?')
    .get(migration.name);

  if (existing) {
    if (existing.checksum !== migration.checksum) {
      throw new Error(`Migration checksum mismatch: ${migration.name}`);
    }

    if (!existing.finished_at && !existing.rolled_back_at) {
      throw new Error(`Migration is marked as started but not finished: ${migration.name}`);
    }

    return;
  }

  const now = new Date().toISOString();

  const run = database.transaction(() => {
    database.exec(migration.sql);
    database
      .prepare(
        `INSERT INTO "_prisma_migrations"
          ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
         VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)`
      )
      .run(randomUUID(), migration.checksum, now, migration.name, now, 1);
  });

  run();
  console.log(`Applied migration: ${migration.name}`);
}
