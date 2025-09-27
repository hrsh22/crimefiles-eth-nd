import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

// Simple synchronous SQLite wrapper for server-side usage only.
// Use absolute path to avoid cwd differences across runtimes
const DB_PATH = process.env.CRIMEFILES_DB_PATH
    ? path.resolve(process.env.CRIMEFILES_DB_PATH)
    : path.resolve(process.cwd(), ".data", "crimefiles.db");

let db: Database.Database | null = null;

function ensureDatabase(): Database.Database {
    if (db) return db;

    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("busy_timeout = 5000");
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
    solution_suspect_id?: string | null;
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

// ===== GAMEPLAY TABLE TYPES =====
export type DbEntry = {
    id: string;
    case_id: string;
    user_address: string;
    tx_hash: string | null;
    facilitator: string | null;
    paid_at: string;
    created_at: string;
};

export type DbHintUnlock = {
    id: string;
    case_id: string;
    user_address: string;
    hint_index: number;
    tx_hash: string | null;
    facilitator: string | null;
    paid_at: string;
    created_at: string;
};

export type DbVerdict = {
    id: string;
    case_id: string;
    user_address: string;
    suspect_id: string;
    amount: string | null;
    tx_hash: string | null;
    facilitator: string | null;
    submitted_at: string;
    created_at: string;
};

export type DbDistribution = { id: string; case_id: string; created_at: string };
export type DbDistributionPayout = { id: string; distribution_id: string; user_address: string; amount_usd: string | null; tx_hash: string | null; created_at: string };

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

export function setCaseSolution(caseId: string, suspectId: string | null): DbCase | null {
    const dbi = ensureDatabase();
    const ts = nowIso();
    dbi.prepare(`UPDATE cases SET solution_suspect_id = ?, updated_at = ? WHERE id = ?`).run(suspectId, ts, caseId);
    return getCaseById(caseId);
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


// ===== GAMEPLAY OPERATIONS =====

export function getEntry(caseId: string, userAddress: string): DbEntry | null {
    const dbi = ensureDatabase();
    return dbi.prepare(`SELECT * FROM entries WHERE case_id = ? AND user_address = ? LIMIT 1`).get(caseId, userAddress) as DbEntry | null;
}

export function recordEntry(params: { caseId: string; userAddress: string; txHash?: string; facilitator?: string }): DbEntry {
    const dbi = ensureDatabase();
    const id = uuid();
    const ts = nowIso();
    dbi.prepare(
        `INSERT OR IGNORE INTO entries (id, case_id, user_address, tx_hash, facilitator, paid_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, params.caseId, params.userAddress, params.txHash || null, params.facilitator || null, ts, ts);
    const row = dbi.prepare(`SELECT * FROM entries WHERE case_id = ? AND user_address = ? LIMIT 1`).get(params.caseId, params.userAddress) as DbEntry;
    return row;
}

export function listHintUnlocks(caseId: string, userAddress: string): DbHintUnlock[] {
    const dbi = ensureDatabase();
    return dbi.prepare(`SELECT * FROM hint_unlocks WHERE case_id = ? AND user_address = ? ORDER BY hint_index ASC`).all(caseId, userAddress) as DbHintUnlock[];
}

export function recordHintUnlock(params: { caseId: string; userAddress: string; hintIndex: number; txHash?: string; facilitator?: string }): DbHintUnlock {
    const dbi = ensureDatabase();
    const id = uuid();
    const ts = nowIso();
    dbi.prepare(
        `INSERT OR IGNORE INTO hint_unlocks (id, case_id, user_address, hint_index, tx_hash, facilitator, paid_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, params.caseId, params.userAddress, params.hintIndex, params.txHash || null, params.facilitator || null, ts, ts);
    const row = dbi.prepare(`SELECT * FROM hint_unlocks WHERE case_id = ? AND user_address = ? AND hint_index = ? LIMIT 1`).get(params.caseId, params.userAddress, params.hintIndex) as DbHintUnlock;
    return row;
}

export function getVerdict(caseId: string, userAddress: string): DbVerdict | null {
    const dbi = ensureDatabase();
    return dbi.prepare(`SELECT * FROM verdicts WHERE case_id = ? AND user_address = ? LIMIT 1`).get(caseId, userAddress) as DbVerdict | null;
}

export function recordVerdict(params: { caseId: string; userAddress: string; suspectId: string; amount?: string; txHash?: string; facilitator?: string }): DbVerdict {
    const dbi = ensureDatabase();
    const existing = getVerdict(params.caseId, params.userAddress);
    const id = existing?.id || uuid();
    const ts = nowIso();
    if (existing) {
        dbi.prepare(`UPDATE verdicts SET suspect_id = ?, amount = ?, tx_hash = COALESCE(?, tx_hash), facilitator = COALESCE(?, facilitator), submitted_at = ?, created_at = created_at WHERE id = ?`)
            .run(params.suspectId, params.amount || null, params.txHash || null, params.facilitator || null, ts, id);
    } else {
        dbi.prepare(
            `INSERT INTO verdicts (id, case_id, user_address, suspect_id, amount, tx_hash, facilitator, submitted_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(id, params.caseId, params.userAddress, params.suspectId, params.amount || null, params.txHash || null, params.facilitator || null, ts, ts);
    }
    return dbi.prepare(`SELECT * FROM verdicts WHERE id = ?`).get(id) as DbVerdict;
}

export function listVerdictsByCase(caseId: string): DbVerdict[] {
    const dbi = ensureDatabase();
    return dbi.prepare(`SELECT * FROM verdicts WHERE case_id = ?`).all(caseId) as DbVerdict[];
}

export function resetCaseProgress(caseId: string) {
    const dbi = ensureDatabase();
    // Clear chat threads for this case (messages cascade via FK)
    dbi.prepare(`DELETE FROM threads WHERE case_id = ?`).run(caseId);
    dbi.prepare(`DELETE FROM entries WHERE case_id = ?`).run(caseId);
    dbi.prepare(`DELETE FROM hint_unlocks WHERE case_id = ?`).run(caseId);
    dbi.prepare(`DELETE FROM verdicts WHERE case_id = ?`).run(caseId);
}

export function createDistribution(caseId: string): DbDistribution {
    const dbi = ensureDatabase();
    const id = uuid();
    const ts = nowIso();
    dbi.prepare(`INSERT INTO distributions (id, case_id, created_at) VALUES (?, ?, ?)`).run(id, caseId, ts);
    return { id, case_id: caseId, created_at: ts };
}

export function addDistributionPayout(params: { distributionId: string; userAddress: string; amountUsd?: string; txHash?: string; }): DbDistributionPayout {
    const dbi = ensureDatabase();
    const id = uuid();
    const ts = nowIso();
    dbi.prepare(`INSERT INTO distribution_payouts (id, distribution_id, user_address, amount_usd, tx_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(id, params.distributionId, params.userAddress, params.amountUsd || null, params.txHash || null, ts);
    return { id, distribution_id: params.distributionId, user_address: params.userAddress, amount_usd: params.amountUsd || null, tx_hash: params.txHash || null, created_at: ts };
}

export function getLatestDistribution(caseId: string): { distribution: DbDistribution | null; payouts: DbDistributionPayout[] } {
    const dbi = ensureDatabase();
    const dists = dbi.prepare(`SELECT * FROM distributions WHERE case_id = ? ORDER BY created_at DESC`).all(caseId) as DbDistribution[];
    if (!dists || dists.length === 0) return { distribution: null, payouts: [] };
    // Prefer the most recent distribution that has payouts; else fall back to most recent
    for (const d of dists) {
        const p = dbi.prepare(`SELECT * FROM distribution_payouts WHERE distribution_id = ? ORDER BY created_at ASC`).all(d.id) as DbDistributionPayout[];
        if (p.length > 0) return { distribution: d, payouts: p };
    }
    const latest = dists[0];
    const payouts = dbi.prepare(`SELECT * FROM distribution_payouts WHERE distribution_id = ? ORDER BY created_at ASC`).all(latest.id) as DbDistributionPayout[];
    return { distribution: latest, payouts };
}

// Maintenance utility: prune rows with invalid case_id values created by earlier route bugs
export function pruneInvalidCaseRefs(): void {
    const dbi = ensureDatabase();
    dbi.prepare(`DELETE FROM entries WHERE case_id NOT IN (SELECT id FROM cases)`).run();
    dbi.prepare(`DELETE FROM hint_unlocks WHERE case_id NOT IN (SELECT id FROM cases)`).run();
    dbi.prepare(`DELETE FROM verdicts WHERE case_id NOT IN (SELECT id FROM cases)`).run();
    dbi.prepare(`DELETE FROM threads WHERE case_id NOT IN (SELECT id FROM cases)`).run();
}
