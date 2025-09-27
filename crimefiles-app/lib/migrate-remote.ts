import path from "path";
import fs from "fs";

type MigrationModule = {
    name?: string;
    up: (db: any) => void | Promise<void>;
    down?: (db: any) => void | Promise<void>;
};

const MIGRATIONS_DIR = path.resolve(process.cwd(), "migrations");

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

// Minimal adapter with exec() and prepare().run() to satisfy our migration modules
class RemoteDbAdapter {
    private client: any;
    private chain: Promise<void> = Promise.resolve();
    constructor(client: any) { this.client = client; }
    exec(sql: string): void {
        this.chain = this.chain.then(() => this.client.execute(sql).then(() => { }));
    }
    prepare(sql: string) {
        return {
            run: (...args: Array<string | number | null>) => {
                this.chain = this.chain.then(() => this.client.execute({ sql, args }).then(() => { }));
                return { changes: 0 } as { changes: number };
            },
            get: async (...args: Array<string | number | null>) => {
                await this.chain;
                const res = await this.client.execute({ sql, args });
                return (res.rows && res.rows[0]) || undefined;
            },
            all: async (...args: Array<string | number | null>) => {
                await this.chain;
                const res = await this.client.execute({ sql, args });
                return res.rows || [];
            },
        };
    }
    async flush(): Promise<void> { await this.chain; }
}

async function getClient() {
    const LIBSQL_URL = process.env.LIBSQL_URL;
    const LIBSQL_AUTH_TOKEN = process.env.LIBSQL_AUTH_TOKEN;
    if (!LIBSQL_URL) {
        throw new Error("LIBSQL_URL (or TURSO_DATABASE_URL) is required for remote migrations");
    }
    const { createClient } = await import("@libsql/client");
    return createClient({ url: LIBSQL_URL, authToken: LIBSQL_AUTH_TOKEN });
}

async function ensureMigrationsTable(db: RemoteDbAdapter) {
    await db.exec(
        `CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    )`
    );
}

async function getAppliedNames(db: RemoteDbAdapter): Promise<string[]> {
    const rows = await db.prepare(`SELECT name FROM _migrations ORDER BY id ASC`).all();
    return (rows as Array<{ name: string }>).map((r) => (r as any).name);
}

async function migrateUp() {
    const client = await getClient();
    const db = new RemoteDbAdapter(client);
    await ensureMigrationsTable(db);
    const applied = new Set(await getAppliedNames(db));
    const files = listMigrationFiles();
    for (const f of files) {
        const { name, up } = await loadMigrationByFile(f);
        if (applied.has(name)) continue;
        await up(db as any);
        await db.flush();
        await db.prepare(`INSERT INTO _migrations (name, applied_at) VALUES (?, ?)`).run(name, new Date().toISOString());
        console.log(`Applied: ${name}`);
    }
    console.log("All remote migrations applied.");
}

async function migrateDown() {
    const client = await getClient();
    const db = new RemoteDbAdapter(client);
    await ensureMigrationsTable(db);
    const last = await db.prepare(`SELECT id, name FROM _migrations ORDER BY id DESC LIMIT 1`).get();
    if (!last?.name) {
        console.log("No migrations to rollback.");
        return;
    }
    const mig = await loadMigrationByName((last as any).name);
    if (!mig?.down) {
        console.log(`Migration ${(last as any).name} has no down(); skipping.`);
        return;
    }
    await mig.down!(db as any);
    await db.flush();
    await db.prepare(`DELETE FROM _migrations WHERE id = ?`).run((last as any).id);
    console.log(`Rolled back: ${(last as any).name}`);
}

async function migrateStatus() {
    const client = await getClient();
    const db = new RemoteDbAdapter(client);
    await ensureMigrationsTable(db);
    const applied = new Set(await getAppliedNames(db));
    const files = listMigrationFiles().map(stripExt);
    console.table(files.map((n) => ({ name: n, applied: applied.has(n) ? "yes" : "no" })));
}

const cmd = process.argv[2] || "up";
if (cmd === "up") {
    migrateUp();
} else if (cmd === "down") {
    migrateDown();
} else if (cmd === "status") {
    migrateStatus();
} else {
    console.log("Usage: tsx lib/migrate-remote.ts [up|down|status]");
    process.exit(1);
}


