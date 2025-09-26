import type Database from "better-sqlite3";

export const name = "0001_initial";

export function up(db: Database.Database) {
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
    CREATE INDEX IF NOT EXISTS idx_threads_lookup ON threads (user_address, case_id, suspect_id, status);

    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(thread_id) REFERENCES threads(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at);

    CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        story TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cases_id ON cases(id);

    CREATE TABLE IF NOT EXISTS suspects (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        age INTEGER NOT NULL,
        occupation TEXT NOT NULL,
        image TEXT NOT NULL,
        gender TEXT NOT NULL,
        traits TEXT,
        mannerisms TEXT,
        ai_prompt TEXT,
        whereabouts TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_suspects_case ON suspects(case_id);

    CREATE TABLE IF NOT EXISTS hints (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        hint_text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_hints_case ON hints(case_id);

    CREATE TABLE IF NOT EXISTS timelines (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_timelines_case ON timelines(case_id);

    CREATE TABLE IF NOT EXISTS timeline_ticks (
        id TEXT PRIMARY KEY,
        timeline_id TEXT NOT NULL,
        label TEXT NOT NULL,
        position INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(timeline_id) REFERENCES timelines(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_ticks_timeline ON timeline_ticks(timeline_id, position);

    CREATE TABLE IF NOT EXISTS timeline_lanes (
        id TEXT PRIMARY KEY,
        timeline_id TEXT NOT NULL,
        title TEXT NOT NULL,
        kind TEXT NOT NULL,
        position INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(timeline_id) REFERENCES timelines(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_lanes_timeline ON timeline_lanes(timeline_id, position);

    CREATE TABLE IF NOT EXISTS timeline_events (
        id TEXT PRIMARY KEY,
        timeline_id TEXT NOT NULL,
        lane_id TEXT NOT NULL,
        title TEXT NOT NULL,
        start_tick INTEGER NOT NULL,
        end_tick INTEGER,
        tags TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(timeline_id) REFERENCES timelines(id) ON DELETE CASCADE,
        FOREIGN KEY(lane_id) REFERENCES timeline_lanes(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_events_timeline ON timeline_events(timeline_id);
    CREATE INDEX IF NOT EXISTS idx_events_lane ON timeline_events(lane_id);
    `);
}

export function down(db: Database.Database) {
    db.exec(`
    DROP TABLE IF EXISTS timeline_events;
    DROP TABLE IF EXISTS timeline_lanes;
    DROP TABLE IF EXISTS timeline_ticks;
    DROP TABLE IF EXISTS timelines;
    DROP TABLE IF EXISTS hints;
    DROP TABLE IF EXISTS suspects;
    DROP TABLE IF EXISTS cases;
    DROP TABLE IF EXISTS messages;
    DROP TABLE IF EXISTS threads;
    `);
}


