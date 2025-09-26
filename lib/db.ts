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

    // Schema is managed via migrations (see /migrations). No implicit schema creation here.

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

export type DbCase = {
    id: string;
    title: string;
    excerpt: string;
    story: string;
    created_at: string;
    updated_at: string;
};

export type DbSuspect = {
    id: string;
    case_id: string;
    name: string;
    description: string | null;
    age: number;
    occupation: string;
    image: string;
    gender: string;
    traits: string | null; // JSON string
    mannerisms: string | null; // JSON string
    ai_prompt: string | null;
    whereabouts: string | null; // JSON string
    created_at: string;
    updated_at: string;
};

export type DbHint = {
    id: string;
    case_id: string;
    hint_text: string;
    created_at: string;
};

export type DbTimeline = {
    id: string;
    case_id: string;
    created_at: string;
    updated_at: string;
};

export type DbTimelineTick = {
    id: string;
    timeline_id: string;
    label: string;
    position: number;
    created_at: string;
};

export type DbTimelineLane = {
    id: string;
    timeline_id: string;
    title: string;
    kind: string;
    position: number;
    created_at: string;
};

export type DbTimelineEvent = {
    id: string;
    timeline_id: string;
    lane_id: string;
    title: string;
    start_tick: number;
    end_tick: number | null;
    tags: string | null; // JSON string
    created_at: string;
    updated_at: string;
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

// ===== CASE OPERATIONS =====

export function createCase(params: { title: string; excerpt: string; story: string }): DbCase {
    const dbi = ensureDatabase();
    const id = uuid();
    const ts = nowIso();

    dbi.prepare(
        `INSERT INTO cases (id, title, excerpt, story, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, params.title, params.excerpt, params.story, ts, ts);

    return { id, title: params.title, excerpt: params.excerpt, story: params.story, created_at: ts, updated_at: ts };
}

export function getCaseById(id: string): DbCase | null {
    const dbi = ensureDatabase();
    return dbi.prepare(`SELECT * FROM cases WHERE id = ?`).get(id) as DbCase | null;
}

export function getAllCases(): DbCase[] {
    const dbi = ensureDatabase();
    return dbi.prepare(`SELECT * FROM cases ORDER BY created_at DESC`).all() as DbCase[];
}

export function updateCase(id: string, params: { title?: string; excerpt?: string; story?: string }): DbCase | null {
    const dbi = ensureDatabase();
    const ts = nowIso();

    const updateFields: string[] = [];
    const updateValues: Array<string | number> = [];

    if (params.title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(params.title);
    }
    if (params.excerpt !== undefined) {
        updateFields.push('excerpt = ?');
        updateValues.push(params.excerpt);
    }
    if (params.story !== undefined) {
        updateFields.push('story = ?');
        updateValues.push(params.story);
    }

    if (updateFields.length === 0) return null;

    updateFields.push('updated_at = ?');
    updateValues.push(ts);
    updateValues.push(id);

    dbi.prepare(
        `UPDATE cases SET ${updateFields.join(', ')} WHERE id = ?`
    ).run(...updateValues);

    return getCaseById(id);
}

export function deleteCase(id: string): boolean {
    const dbi = ensureDatabase();
    const result = dbi.prepare(`DELETE FROM cases WHERE id = ?`).run(id);
    return result.changes > 0;
}

// ===== SUSPECT OPERATIONS =====

export function createSuspect(params: {
    caseId: string;
    name: string;
    description?: string;
    age: number;
    occupation: string;
    image: string;
    gender: string;
    traits?: string[];
    mannerisms?: string[];
    aiPrompt?: string;
    whereabouts?: string[];
}): DbSuspect {
    const dbi = ensureDatabase();
    const id = uuid();
    const ts = nowIso();

    dbi.prepare(
        `INSERT INTO suspects (id, case_id, name, description, age, occupation, image, gender, traits, mannerisms, ai_prompt, whereabouts, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
        id,
        params.caseId,
        params.name,
        params.description || null,
        params.age,
        params.occupation,
        params.image,
        params.gender,
        params.traits ? JSON.stringify(params.traits) : null,
        params.mannerisms ? JSON.stringify(params.mannerisms) : null,
        params.aiPrompt || null,
        params.whereabouts ? JSON.stringify(params.whereabouts) : null,
        ts,
        ts
    );

    const result = dbi.prepare(`SELECT * FROM suspects WHERE id = ?`).get(id) as DbSuspect;
    return result;
}

export function getSuspectsByCaseId(caseId: string): DbSuspect[] {
    const dbi = ensureDatabase();
    return dbi.prepare(`SELECT * FROM suspects WHERE case_id = ? ORDER BY created_at ASC`).all(caseId) as DbSuspect[];
}

export function updateSuspect(id: string, params: Partial<{
    name: string;
    description: string;
    age: number;
    occupation: string;
    image: string;
    gender: string;
    traits: string[];
    mannerisms: string[];
    aiPrompt: string;
    whereabouts: string[];
}>): DbSuspect | null {
    const dbi = ensureDatabase();
    const ts = nowIso();

    const updateFields: string[] = [];
    const updateValues: Array<string | number> = [];

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
            if (key === 'traits' || key === 'mannerisms' || key === 'whereabouts') {
                updateFields.push(`${key} = ?`);
                updateValues.push(JSON.stringify(value));
            } else {
                updateFields.push(`${key} = ?`);
                updateValues.push(value as string | number);
            }
        }
    });

    if (updateFields.length === 0) return null;

    updateFields.push('updated_at = ?');
    updateValues.push(ts);
    updateValues.push(id);

    dbi.prepare(
        `UPDATE suspects SET ${updateFields.join(', ')} WHERE id = ?`
    ).run(...updateValues);

    return dbi.prepare(`SELECT * FROM suspects WHERE id = ?`).get(id) as DbSuspect | null;
}

export function deleteSuspect(id: string): boolean {
    const dbi = ensureDatabase();
    const result = dbi.prepare(`DELETE FROM suspects WHERE id = ?`).run(id);
    return result.changes > 0;
}

// ===== HINT OPERATIONS =====

export function createHint(params: { caseId: string; hintText: string }): DbHint {
    const dbi = ensureDatabase();
    const id = uuid();
    const ts = nowIso();

    dbi.prepare(
        `INSERT INTO hints (id, case_id, hint_text, created_at) VALUES (?, ?, ?, ?)`
    ).run(id, params.caseId, params.hintText, ts);

    const result = dbi.prepare(`SELECT * FROM hints WHERE id = ?`).get(id) as DbHint;
    return result;
}

export function getHintsByCaseId(caseId: string): DbHint[] {
    const dbi = ensureDatabase();
    return dbi.prepare(`SELECT * FROM hints WHERE case_id = ? ORDER BY created_at ASC`).all(caseId) as DbHint[];
}

export function updateHint(id: string, hintText: string): DbHint | null {
    const dbi = ensureDatabase();
    dbi.prepare(`UPDATE hints SET hint_text = ? WHERE id = ?`).run(hintText, id);
    return dbi.prepare(`SELECT * FROM hints WHERE id = ?`).get(id) as DbHint | null;
}

export function deleteHint(id: string): boolean {
    const dbi = ensureDatabase();
    const result = dbi.prepare(`DELETE FROM hints WHERE id = ?`).run(id);
    return result.changes > 0;
}

// ===== TIMELINE OPERATIONS =====

export function createTimeline(caseId: string): DbTimeline {
    const dbi = ensureDatabase();
    const id = uuid();
    const ts = nowIso();

    dbi.prepare(
        `INSERT INTO timelines (id, case_id, created_at, updated_at) VALUES (?, ?, ?, ?)`
    ).run(id, caseId, ts, ts);

    const result = dbi.prepare(`SELECT * FROM timelines WHERE id = ?`).get(id) as DbTimeline;
    return result;
}

export function getTimelineByCaseId(caseId: string): DbTimeline | null {
    const dbi = ensureDatabase();
    return dbi.prepare(`SELECT * FROM timelines WHERE case_id = ?`).get(caseId) as DbTimeline | null;
}

export function createTimelineTick(params: { timelineId: string; label: string; position: number }): DbTimelineTick {
    const dbi = ensureDatabase();
    const id = uuid();
    const ts = nowIso();

    dbi.prepare(
        `INSERT INTO timeline_ticks (id, timeline_id, label, position, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(id, params.timelineId, params.label, params.position, ts);

    const result = dbi.prepare(`SELECT * FROM timeline_ticks WHERE id = ?`).get(id) as DbTimelineTick;
    return result;
}

export function getTimelineTicks(timelineId: string): DbTimelineTick[] {
    const dbi = ensureDatabase();
    return dbi.prepare(`SELECT * FROM timeline_ticks WHERE timeline_id = ? ORDER BY position ASC`).all(timelineId) as DbTimelineTick[];
}

export function createTimelineLane(params: { timelineId: string; title: string; kind: string; position: number }): DbTimelineLane {
    const dbi = ensureDatabase();
    const id = uuid();
    const ts = nowIso();

    dbi.prepare(
        `INSERT INTO timeline_lanes (id, timeline_id, title, kind, position, created_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, params.timelineId, params.title, params.kind, params.position, ts);

    const result = dbi.prepare(`SELECT * FROM timeline_lanes WHERE id = ?`).get(id) as DbTimelineLane;
    return result;
}

export function getTimelineLanes(timelineId: string): DbTimelineLane[] {
    const dbi = ensureDatabase();
    return dbi.prepare(`SELECT * FROM timeline_lanes WHERE timeline_id = ? ORDER BY position ASC`).all(timelineId) as DbTimelineLane[];
}

export function createTimelineEvent(params: {
    timelineId: string;
    laneId: string;
    title: string;
    startTick: number;
    endTick?: number;
    tags?: string[];
}): DbTimelineEvent {
    const dbi = ensureDatabase();
    const id = uuid();
    const ts = nowIso();

    dbi.prepare(
        `INSERT INTO timeline_events (id, timeline_id, lane_id, title, start_tick, end_tick, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
        id,
        params.timelineId,
        params.laneId,
        params.title,
        params.startTick,
        params.endTick || null,
        params.tags ? JSON.stringify(params.tags) : null,
        ts,
        ts
    );

    const result = dbi.prepare(`SELECT * FROM timeline_events WHERE id = ?`).get(id) as DbTimelineEvent;
    return result;
}

export function getTimelineEvents(timelineId: string): DbTimelineEvent[] {
    const dbi = ensureDatabase();
    return dbi.prepare(`SELECT * FROM timeline_events WHERE timeline_id = ? ORDER BY start_tick ASC`).all(timelineId) as DbTimelineEvent[];
}


