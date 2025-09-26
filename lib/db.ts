import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

// Simple synchronous SQLite wrapper for server-side usage only.
// DB file lives under .data to avoid accidental commits
const DB_PATH = process.env.CRIMEFILES_DB_PATH || ".data/crimefiles.db";

let db: Database.Database | null = null;

function ensureDatabase(): Database.Database {
    if (db) return db;

    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    // Create schema if not exists
    db.exec(`
    CREATE TABLE IF NOT EXISTS threads (
        id TEXT PRIMARY KEY,
        user_address TEXT NOT NULL,
        case_id TEXT NOT NULL,
        suspect_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_threads_lookup
        ON threads (user_address, case_id, suspect_id, status);

    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(thread_id) REFERENCES threads(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at);
    `);

    return db;
}

export type DbThread = {
    id: string;
    user_address: string;
    case_id: string;
    suspect_id: string;
    status: string;
    created_at: string;
    updated_at: string;
};

export type DbMessage = {
    id: string;
    thread_id: string;
    role: "user" | "assistant" | "system";
    content: string;
    created_at: string;
};

function nowIso(): string {
    return new Date().toISOString();
}

function uuid(): string { return uuidv4(); }

export function getOrCreateOpenThread(params: { userAddress: string; caseId: string; suspectId: string }): DbThread {
    const dbi = ensureDatabase();
    const { userAddress, caseId, suspectId } = params;

    const existing = dbi.prepare(
        `SELECT * FROM threads WHERE user_address = ? AND case_id = ? AND suspect_id = ? AND status = 'open' LIMIT 1`
    ).get(userAddress, caseId, suspectId) as DbThread | undefined;

    if (existing) {
        return existing;
    }

    const id = uuid();
    const ts = nowIso();

    dbi.prepare(
        `INSERT INTO threads (id, user_address, case_id, suspect_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'open', ?, ?)`
    ).run(id, userAddress, caseId, suspectId, ts, ts);

    return dbi.prepare(`SELECT * FROM threads WHERE id = ?`).get(id) as DbThread;
}

export function closeThread(threadId: string): void {
    const dbi = ensureDatabase();
    dbi.prepare(`UPDATE threads SET status = 'closed', updated_at = ? WHERE id = ?`).run(nowIso(), threadId);
}

export function insertMessage(params: { threadId: string; role: DbMessage["role"]; content: string }): DbMessage {
    const dbi = ensureDatabase();
    const id = uuid();
    const ts = nowIso();

    dbi.prepare(`INSERT INTO messages (id, thread_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)`)
        .run(id, params.threadId, params.role, params.content, ts);

    return { id, thread_id: params.threadId, role: params.role, content: params.content, created_at: ts };
}

export function listMessages(threadId: string): DbMessage[] {
    const dbi = ensureDatabase();
    return dbi.prepare(`SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC`).all(threadId) as DbMessage[];
}

export function getOpenThreadWithMessages(params: { userAddress: string; caseId: string; suspectId: string }): { thread: DbThread | null; messages: DbMessage[] } {
    const dbi = ensureDatabase();
    const { userAddress, caseId, suspectId } = params;

    const t = dbi.prepare(
        `SELECT * FROM threads WHERE user_address = ? AND case_id = ? AND suspect_id = ? AND status = 'open' LIMIT 1`
    ).get(userAddress, caseId, suspectId) as DbThread | undefined;

    if (!t) {
        return { thread: null, messages: [] };
    }

    return { thread: t, messages: listMessages(t.id) };
}


