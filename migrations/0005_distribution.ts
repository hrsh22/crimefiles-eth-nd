import type Database from "better-sqlite3";

export const name = "0005_distribution";

export function up(db: Database.Database) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS distributions (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_distributions_case ON distributions(case_id, created_at);

    CREATE TABLE IF NOT EXISTS distribution_payouts (
        id TEXT PRIMARY KEY,
        distribution_id TEXT NOT NULL,
        user_address TEXT NOT NULL,
        amount_usd TEXT,
        tx_hash TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(distribution_id) REFERENCES distributions(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_payouts_dist ON distribution_payouts(distribution_id);
    `);
}

export function down(): void {
    // No-op for demo
}


