import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

type MigrationModule = {
    name?: string;
    up: (db: Database.Database) => void | Promise<void>;
    down?: (db: Database.Database) => void | Promise<void>;
};

const DB_PATH = process.env.CRIMEFILES_DB_PATH || ".data/crimefiles.db";
const MIGRATIONS_DIR = path.resolve(process.cwd(), "migrations");

function ensureMigrationsTable(db: Database.Database) {
    db.exec(
        `CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    )`
    );
}

function listMigrationFiles(): string[] {
    if (!fs.existsSync(MIGRATIONS_DIR)) return [];
    return fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((f) => /^(\d{4})_.*\.(t|j)s$/.test(f))
        .sort();
}

function stripExt(fileName: string): string {
    return fileName.replace(/\.(t|j)s$/, "");
}

async function loadMigrationByFile(fileName: string): Promise<{ name: string; up: MigrationModule["up"]; down?: MigrationModule["down"] }> {
    const full = path.join(MIGRATIONS_DIR, fileName);
    const mod: MigrationModule = await import(full);
    const name = mod.name || stripExt(fileName);
    if (typeof mod.up !== "function") throw new Error(`Migration ${fileName} missing up()`);
    return { name, up: mod.up, down: mod.down };
}

async function loadMigrationByName(name: string): Promise<{ file: string; name: string; up: MigrationModule["up"]; down?: MigrationModule["down"] } | null> {
    const files = listMigrationFiles();
    const file = files.find((f) => stripExt(f) === name);
    if (!file) return null;
    const mig = await loadMigrationByFile(file);
    return { file, ...mig };
}

function getAppliedNames(db: Database.Database): string[] {
    const rows = db.prepare(`SELECT name FROM _migrations ORDER BY id ASC`).all() as Array<{ name: string }>;
    return rows.map((r) => r.name);
}

async function migrateUp() {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const db = new Database(DB_PATH);
    try {
        ensureMigrationsTable(db);
        const applied = new Set(getAppliedNames(db));
        const files = listMigrationFiles();
        for (const f of files) {
            const { name, up } = await loadMigrationByFile(f);
            if (applied.has(name)) continue;
            await up(db);
            db.prepare(`INSERT INTO _migrations (name, applied_at) VALUES (?, ?)`).run(name, new Date().toISOString());
            console.log(`Applied: ${name}`);
        }
        console.log("All migrations applied.");
    } finally {
        db.close();
    }
}

async function migrateDown() {
    const db = new Database(DB_PATH);
    try {
        ensureMigrationsTable(db);
        const last = db.prepare(`SELECT id, name FROM _migrations ORDER BY id DESC LIMIT 1`).get() as { id?: number; name?: string } | undefined;
        if (!last?.name) {
            console.log("No migrations to rollback.");
            return;
        }
        const mig = await loadMigrationByName(last.name);
        if (!mig?.down) {
            console.log(`Migration ${last.name} has no down(); skipping.`);
            return;
        }
        await mig.down!(db);
        db.prepare(`DELETE FROM _migrations WHERE id = ?`).run(last.id);
        console.log(`Rolled back: ${last.name}`);
    } finally {
        db.close();
    }
}

async function migrateStatus() {
    const db = new Database(DB_PATH);
    try {
        ensureMigrationsTable(db);
        const applied = getAppliedNames(db);
        const files = listMigrationFiles().map(stripExt);
        console.table(
            files.map((n) => ({ name: n, applied: applied.includes(n) ? "yes" : "no" }))
        );
    } finally {
        db.close();
    }
}

const cmd = process.argv[2] || "up";
if (cmd === "up") {
    migrateUp();
} else if (cmd === "down") {
    migrateDown();
} else if (cmd === "status") {
    migrateStatus();
} else {
    console.log("Usage: tsx lib/migrate.ts [up|down|status]");
    process.exit(1);
}
