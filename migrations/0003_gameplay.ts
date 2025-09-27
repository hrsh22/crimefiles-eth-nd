import type Database from "better-sqlite3";

export const name = "0003_gameplay";

export function up(db: Database.Database) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        user_address TEXT NOT NULL,
        tx_hash TEXT,
        facilitator TEXT,
        paid_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(case_id, user_address)
    );
    CREATE INDEX IF NOT EXISTS idx_entries_case_user ON entries(case_id, user_address);

    CREATE TABLE IF NOT EXISTS hint_unlocks (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        user_address TEXT NOT NULL,
        hint_index INTEGER NOT NULL,
        tx_hash TEXT,
        facilitator TEXT,
        paid_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(case_id, user_address, hint_index)
    );
    CREATE INDEX IF NOT EXISTS idx_hint_unlocks_case_user ON hint_unlocks(case_id, user_address);

    CREATE TABLE IF NOT EXISTS verdicts (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        user_address TEXT NOT NULL,
        suspect_id TEXT NOT NULL,
        amount TEXT,
        tx_hash TEXT,
        facilitator TEXT,
        submitted_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(case_id, user_address)
    );
    CREATE INDEX IF NOT EXISTS idx_verdicts_case_user ON verdicts(case_id, user_address);
    `);
}

export function down(db: Database.Database) {
    db.exec(`
    DROP TABLE IF EXISTS verdicts;
    DROP TABLE IF EXISTS hint_unlocks;
    DROP TABLE IF EXISTS entries;
    `);
}


