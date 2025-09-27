import type Database from "better-sqlite3";

export const name = "0004_solution";

export function up(db: Database.Database) {
    db.exec(`
    ALTER TABLE cases ADD COLUMN solution_suspect_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_cases_solution ON cases(solution_suspect_id);
    `);

    // Seed solution for initial case if present
    try {
        db.prepare(`UPDATE cases SET solution_suspect_id = ? WHERE id = ?`).run(
            'c28bf9a2-9e2c-4b3c-8d4a-7f45ba9cd123', // Maya Singh
            'b4fa1f9a-ef3f-4f39-9b65-9a6f35288968'  // Initial case id
        );
    } catch { }
}

export function down(): void {
    // SQLite doesn't support dropping columns easily; skip down migration for simplicity
}


