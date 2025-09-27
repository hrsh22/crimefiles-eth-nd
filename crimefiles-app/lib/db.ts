import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

// Database adapter: uses Turso/libsql when LIBSQL_URL/TURSO_DATABASE_URL is set; falls back to local better-sqlite3

// Server-only envs (never expose as NEXT_PUBLIC_*)
const LIBSQL_URL = process.env.LIBSQL_URL;
const LIBSQL_AUTH_TOKEN = process.env.LIBSQL_AUTH_TOKEN;
const USE_REMOTE = !!LIBSQL_URL;

// Local file path for dev fallback
const DB_PATH = process.env.CRIMEFILES_DB_PATH
    ? path.resolve(process.env.CRIMEFILES_DB_PATH)
    : path.resolve(process.cwd(), ".data", "crimefiles.db");

// Lazily initialize clients to keep client-only deps out of serverless bundles when not needed
let createClientPromise: Promise<any> | null = null;
async function loadLibsqlCreateClient(): Promise<(opts: { url: string; authToken?: string }) => any> {
    if (!createClientPromise) {
        createClientPromise = import("@libsql/client");
    }
    const mod = await createClientPromise;
    return mod.createClient;
}

type LocalDatabase = any;
let db: LocalDatabase | null = null;
let remoteClient: any | null = null;

let localDbImportPromise: Promise<any> | null = null;
async function ensureLocalDatabase(): Promise<LocalDatabase> {
    if (db) return db;
    if (!localDbImportPromise) {
        localDbImportPromise = import("better-sqlite3");
    }
    const mod = await localDbImportPromise;
    const BetterSqlite3 = mod.default || mod;
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    db = new BetterSqlite3(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("busy_timeout = 5000");
    db.pragma("foreign_keys = ON");
    return db;
}

async function ensureRemoteClient(): Promise<any> {
    if (!USE_REMOTE) return null;
    if (remoteClient) return remoteClient;
    const createClient = await loadLibsqlCreateClient();
    remoteClient = createClient({ url: LIBSQL_URL as string, authToken: LIBSQL_AUTH_TOKEN });
    return remoteClient;
}

async function dbGet<T>(sql: string, params: Array<string | number | null> = []): Promise<T | null> {
    if (USE_REMOTE) {
        const client = await ensureRemoteClient();
        const res = await client.execute({ sql, args: params });
        const row = (res.rows && res.rows[0]) || null;
        return (row as T) || null;
    } else {
        const ldb = await ensureLocalDatabase();
        const row = ldb.prepare(sql).get(...params) as T | undefined;
        return row ?? null;
    }
}

async function dbAll<T>(sql: string, params: Array<string | number | null> = []): Promise<T[]> {
    if (USE_REMOTE) {
        const client = await ensureRemoteClient();
        const res = await client.execute({ sql, args: params });
        // libsql returns an array-like rows; cast to T[]
        return (res.rows as T[]) || [];
    } else {
        const ldb = await ensureLocalDatabase();
        return ldb.prepare(sql).all(...params) as T[];
    }
}

async function dbRun(sql: string, params: Array<string | number | null> = []): Promise<void> {
    if (USE_REMOTE) {
        const client = await ensureRemoteClient();
        await client.execute({ sql, args: params });
    } else {
        const ldb = await ensureLocalDatabase();
        ldb.prepare(sql).run(...params);
    }
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

export async function getOrCreateOpenThread(params: { userAddress: string; caseId: string; suspectId: string }): Promise<DbThread> {
    const { userAddress, caseId, suspectId } = params;
    const existing = await dbGet<DbThread>(
        `SELECT * FROM threads WHERE user_address = ? AND case_id = ? AND suspect_id = ? AND status = 'open' LIMIT 1`,
        [userAddress, caseId, suspectId]
    );
    if (existing) return existing;
    const id = uuid();
    const ts = nowIso();
    await dbRun(
        `INSERT INTO threads (id, user_address, case_id, suspect_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'open', ?, ?)`,
        [id, userAddress, caseId, suspectId, ts, ts]
    );
    const row = await dbGet<DbThread>(`SELECT * FROM threads WHERE id = ?`, [id]);
    return row as DbThread;
}

export async function closeThread(threadId: string): Promise<void> {
    await dbRun(`UPDATE threads SET status = 'closed', updated_at = ? WHERE id = ?`, [nowIso(), threadId]);
}

export async function insertMessage(params: { threadId: string; role: DbMessage["role"]; content: string }): Promise<DbMessage> {
    const id = uuid();
    const ts = nowIso();
    await dbRun(`INSERT INTO messages (id, thread_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)`, [
        id,
        params.threadId,
        params.role,
        params.content,
        ts,
    ]);
    return { id, thread_id: params.threadId, role: params.role, content: params.content, created_at: ts };
}

export async function listMessages(threadId: string): Promise<DbMessage[]> {
    return await dbAll<DbMessage>(`SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC`, [threadId]);
}

export async function getOpenThreadWithMessages(params: { userAddress: string; caseId: string; suspectId: string }): Promise<{ thread: DbThread | null; messages: DbMessage[] }> {
    const { userAddress, caseId, suspectId } = params;
    const t = await dbGet<DbThread>(
        `SELECT * FROM threads WHERE user_address = ? AND case_id = ? AND suspect_id = ? AND status = 'open' LIMIT 1`,
        [userAddress, caseId, suspectId]
    );
    if (!t) return { thread: null, messages: [] };
    const messages = await listMessages(t.id);
    return { thread: t, messages };
}

// ===== CASE OPERATIONS =====

export async function createCase(params: { title: string; excerpt: string; story: string }): Promise<DbCase> {
    const id = uuid();
    const ts = nowIso();
    await dbRun(
        `INSERT INTO cases (id, title, excerpt, story, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, params.title, params.excerpt, params.story, ts, ts]
    );
    return { id, title: params.title, excerpt: params.excerpt, story: params.story, created_at: ts, updated_at: ts };
}

export async function getCaseById(id: string): Promise<DbCase | null> {
    return await dbGet<DbCase>(`SELECT * FROM cases WHERE id = ?`, [id]);
}

export async function getAllCases(): Promise<DbCase[]> {
    return await dbAll<DbCase>(`SELECT * FROM cases ORDER BY created_at DESC`);
}

export async function updateCase(id: string, params: { title?: string; excerpt?: string; story?: string }): Promise<DbCase | null> {
    const ts = nowIso();
    const updateFields: string[] = [];
    const updateValues: Array<string | number> = [];
    if (params.title !== undefined) { updateFields.push('title = ?'); updateValues.push(params.title); }
    if (params.excerpt !== undefined) { updateFields.push('excerpt = ?'); updateValues.push(params.excerpt); }
    if (params.story !== undefined) { updateFields.push('story = ?'); updateValues.push(params.story); }
    if (updateFields.length === 0) return null;
    updateFields.push('updated_at = ?');
    updateValues.push(ts);
    updateValues.push(id);
    await dbRun(`UPDATE cases SET ${updateFields.join(', ')} WHERE id = ?`, updateValues as Array<string | number | null>);
    return await getCaseById(id);
}

export async function setCaseSolution(caseId: string, suspectId: string | null): Promise<DbCase | null> {
    const ts = nowIso();
    await dbRun(`UPDATE cases SET solution_suspect_id = ?, updated_at = ? WHERE id = ?`, [suspectId, ts, caseId]);
    return await getCaseById(caseId);
}

export async function deleteCase(id: string): Promise<boolean> {
    if (USE_REMOTE) {
        const before = await dbGet<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM cases WHERE id = ?`, [id]);
        await dbRun(`DELETE FROM cases WHERE id = ?`, [id]);
        const after = await dbGet<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM cases WHERE id = ?`, [id]);
        return (before?.cnt || 0) > (after?.cnt || 0);
    } else {
        const ldb = await ensureLocalDatabase();
        const result = ldb.prepare(`DELETE FROM cases WHERE id = ?`).run(id);
        return result.changes > 0;
    }
}

// ===== SUSPECT OPERATIONS =====

export async function createSuspect(params: {
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
}): Promise<DbSuspect> {
    const id = uuid();
    const ts = nowIso();
    await dbRun(
        `INSERT INTO suspects (id, case_id, name, description, age, occupation, image, gender, traits, mannerisms, ai_prompt, whereabouts, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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
            ts,
        ]
    );
    const result = await dbGet<DbSuspect>(`SELECT * FROM suspects WHERE id = ?`, [id]);
    return result as DbSuspect;
}

export async function getSuspectsByCaseId(caseId: string): Promise<DbSuspect[]> {
    return await dbAll<DbSuspect>(`SELECT * FROM suspects WHERE case_id = ? ORDER BY created_at ASC`, [caseId]);
}

export async function updateSuspect(id: string, params: Partial<{
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
}>): Promise<DbSuspect | null> {
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

    await dbRun(`UPDATE suspects SET ${updateFields.join(', ')} WHERE id = ?`, updateValues as Array<string | number | null>);
    return await dbGet<DbSuspect>(`SELECT * FROM suspects WHERE id = ?`, [id]);
}

export async function deleteSuspect(id: string): Promise<boolean> {
    if (USE_REMOTE) {
        const before = await dbGet<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM suspects WHERE id = ?`, [id]);
        await dbRun(`DELETE FROM suspects WHERE id = ?`, [id]);
        const after = await dbGet<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM suspects WHERE id = ?`, [id]);
        return (before?.cnt || 0) > (after?.cnt || 0);
    } else {
        const ldb = await ensureLocalDatabase();
        const result = ldb.prepare(`DELETE FROM suspects WHERE id = ?`).run(id);
        return result.changes > 0;
    }
}

// ===== HINT OPERATIONS =====

export async function createHint(params: { caseId: string; hintText: string }): Promise<DbHint> {
    const id = uuid();
    const ts = nowIso();
    await dbRun(`INSERT INTO hints (id, case_id, hint_text, created_at) VALUES (?, ?, ?, ?)`, [id, params.caseId, params.hintText, ts]);
    const result = await dbGet<DbHint>(`SELECT * FROM hints WHERE id = ?`, [id]);
    return result as DbHint;
}

export async function getHintsByCaseId(caseId: string): Promise<DbHint[]> {
    return await dbAll<DbHint>(`SELECT * FROM hints WHERE case_id = ? ORDER BY created_at ASC`, [caseId]);
}

export async function updateHint(id: string, hintText: string): Promise<DbHint | null> {
    await dbRun(`UPDATE hints SET hint_text = ? WHERE id = ?`, [hintText, id]);
    return await dbGet<DbHint>(`SELECT * FROM hints WHERE id = ?`, [id]);
}

export async function deleteHint(id: string): Promise<boolean> {
    if (USE_REMOTE) {
        const before = await dbGet<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM hints WHERE id = ?`, [id]);
        await dbRun(`DELETE FROM hints WHERE id = ?`, [id]);
        const after = await dbGet<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM hints WHERE id = ?`, [id]);
        return (before?.cnt || 0) > (after?.cnt || 0);
    } else {
        const ldb = await ensureLocalDatabase();
        const result = ldb.prepare(`DELETE FROM hints WHERE id = ?`).run(id);
        return result.changes > 0;
    }
}

// ===== TIMELINE OPERATIONS =====

export async function createTimeline(caseId: string): Promise<DbTimeline> {
    const id = uuid();
    const ts = nowIso();
    await dbRun(`INSERT INTO timelines (id, case_id, created_at, updated_at) VALUES (?, ?, ?, ?)`, [id, caseId, ts, ts]);
    const result = await dbGet<DbTimeline>(`SELECT * FROM timelines WHERE id = ?`, [id]);
    return result as DbTimeline;
}

export async function getTimelineByCaseId(caseId: string): Promise<DbTimeline | null> {
    return await dbGet<DbTimeline>(`SELECT * FROM timelines WHERE case_id = ?`, [caseId]);
}

export async function createTimelineTick(params: { timelineId: string; label: string; position: number }): Promise<DbTimelineTick> {
    const id = uuid();
    const ts = nowIso();
    await dbRun(`INSERT INTO timeline_ticks (id, timeline_id, label, position, created_at) VALUES (?, ?, ?, ?, ?)`, [id, params.timelineId, params.label, params.position, ts]);
    const result = await dbGet<DbTimelineTick>(`SELECT * FROM timeline_ticks WHERE id = ?`, [id]);
    return result as DbTimelineTick;
}

export async function getTimelineTicks(timelineId: string): Promise<DbTimelineTick[]> {
    return await dbAll<DbTimelineTick>(`SELECT * FROM timeline_ticks WHERE timeline_id = ? ORDER BY position ASC`, [timelineId]);
}

export async function createTimelineLane(params: { timelineId: string; title: string; kind: string; position: number }): Promise<DbTimelineLane> {
    const id = uuid();
    const ts = nowIso();
    await dbRun(`INSERT INTO timeline_lanes (id, timeline_id, title, kind, position, created_at) VALUES (?, ?, ?, ?, ?, ?)`, [id, params.timelineId, params.title, params.kind, params.position, ts]);
    const result = await dbGet<DbTimelineLane>(`SELECT * FROM timeline_lanes WHERE id = ?`, [id]);
    return result as DbTimelineLane;
}

export async function getTimelineLanes(timelineId: string): Promise<DbTimelineLane[]> {
    return await dbAll<DbTimelineLane>(`SELECT * FROM timeline_lanes WHERE timeline_id = ? ORDER BY position ASC`, [timelineId]);
}

export async function createTimelineEvent(params: {
    timelineId: string;
    laneId: string;
    title: string;
    startTick: number;
    endTick?: number;
    tags?: string[];
}): Promise<DbTimelineEvent> {
    const id = uuid();
    const ts = nowIso();
    await dbRun(
        `INSERT INTO timeline_events (id, timeline_id, lane_id, title, start_tick, end_tick, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            params.timelineId,
            params.laneId,
            params.title,
            params.startTick,
            params.endTick || null,
            params.tags ? JSON.stringify(params.tags) : null,
            ts,
            ts,
        ]
    );
    const result = await dbGet<DbTimelineEvent>(`SELECT * FROM timeline_events WHERE id = ?`, [id]);
    return result as DbTimelineEvent;
}

export async function getTimelineEvents(timelineId: string): Promise<DbTimelineEvent[]> {
    return await dbAll<DbTimelineEvent>(`SELECT * FROM timeline_events WHERE timeline_id = ? ORDER BY start_tick ASC`, [timelineId]);
}


// ===== GAMEPLAY OPERATIONS =====

export async function getEntry(caseId: string, userAddress: string): Promise<DbEntry | null> {
    return await dbGet<DbEntry>(`SELECT * FROM entries WHERE case_id = ? AND user_address = ? LIMIT 1`, [caseId, userAddress]);
}

export async function recordEntry(params: { caseId: string; userAddress: string; txHash?: string; facilitator?: string }): Promise<DbEntry> {
    const id = uuid();
    const ts = nowIso();
    await dbRun(
        `INSERT OR IGNORE INTO entries (id, case_id, user_address, tx_hash, facilitator, paid_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, params.caseId, params.userAddress, params.txHash || null, params.facilitator || null, ts, ts]
    );
    const row = await dbGet<DbEntry>(`SELECT * FROM entries WHERE case_id = ? AND user_address = ? LIMIT 1`, [params.caseId, params.userAddress]);
    return row as DbEntry;
}

export async function listHintUnlocks(caseId: string, userAddress: string): Promise<DbHintUnlock[]> {
    return await dbAll<DbHintUnlock>(`SELECT * FROM hint_unlocks WHERE case_id = ? AND user_address = ? ORDER BY hint_index ASC`, [caseId, userAddress]);
}

export async function recordHintUnlock(params: { caseId: string; userAddress: string; hintIndex: number; txHash?: string; facilitator?: string }): Promise<DbHintUnlock> {
    const id = uuid();
    const ts = nowIso();
    await dbRun(
        `INSERT OR IGNORE INTO hint_unlocks (id, case_id, user_address, hint_index, tx_hash, facilitator, paid_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, params.caseId, params.userAddress, params.hintIndex, params.txHash || null, params.facilitator || null, ts, ts]
    );
    const row = await dbGet<DbHintUnlock>(
        `SELECT * FROM hint_unlocks WHERE case_id = ? AND user_address = ? AND hint_index = ? LIMIT 1`,
        [params.caseId, params.userAddress, params.hintIndex]
    );
    return row as DbHintUnlock;
}

export async function getVerdict(caseId: string, userAddress: string): Promise<DbVerdict | null> {
    return await dbGet<DbVerdict>(`SELECT * FROM verdicts WHERE case_id = ? AND user_address = ? LIMIT 1`, [caseId, userAddress]);
}

export async function recordVerdict(params: { caseId: string; userAddress: string; suspectId: string; amount?: string; txHash?: string; facilitator?: string }): Promise<DbVerdict> {
    const existing = await getVerdict(params.caseId, params.userAddress);
    const id = existing?.id || uuid();
    const ts = nowIso();
    if (existing) {
        await dbRun(
            `UPDATE verdicts SET suspect_id = ?, amount = ?, tx_hash = COALESCE(?, tx_hash), facilitator = COALESCE(?, facilitator), submitted_at = ?, created_at = created_at WHERE id = ?`,
            [params.suspectId, params.amount || null, params.txHash || null, params.facilitator || null, ts, id]
        );
    } else {
        await dbRun(
            `INSERT INTO verdicts (id, case_id, user_address, suspect_id, amount, tx_hash, facilitator, submitted_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, params.caseId, params.userAddress, params.suspectId, params.amount || null, params.txHash || null, params.facilitator || null, ts, ts]
        );
    }
    const row = await dbGet<DbVerdict>(`SELECT * FROM verdicts WHERE id = ?`, [id]);
    return row as DbVerdict;
}

export async function listVerdictsByCase(caseId: string): Promise<DbVerdict[]> {
    return await dbAll<DbVerdict>(`SELECT * FROM verdicts WHERE case_id = ?`, [caseId]);
}

export async function resetCaseProgress(caseId: string): Promise<void> {
    await dbRun(`DELETE FROM threads WHERE case_id = ?`, [caseId]);
    await dbRun(`DELETE FROM entries WHERE case_id = ?`, [caseId]);
    await dbRun(`DELETE FROM hint_unlocks WHERE case_id = ?`, [caseId]);
    await dbRun(`DELETE FROM verdicts WHERE case_id = ?`, [caseId]);
}

export async function createDistribution(caseId: string): Promise<DbDistribution> {
    const id = uuid();
    const ts = nowIso();
    await dbRun(`INSERT INTO distributions (id, case_id, created_at) VALUES (?, ?, ?)`, [id, caseId, ts]);
    return { id, case_id: caseId, created_at: ts };
}

export async function addDistributionPayout(params: { distributionId: string; userAddress: string; amountUsd?: string; txHash?: string; }): Promise<DbDistributionPayout> {
    const id = uuid();
    const ts = nowIso();
    await dbRun(
        `INSERT INTO distribution_payouts (id, distribution_id, user_address, amount_usd, tx_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, params.distributionId, params.userAddress, params.amountUsd || null, params.txHash || null, ts]
    );
    return { id, distribution_id: params.distributionId, user_address: params.userAddress, amount_usd: params.amountUsd || null, tx_hash: params.txHash || null, created_at: ts };
}

export async function getLatestDistribution(caseId: string): Promise<{ distribution: DbDistribution | null; payouts: DbDistributionPayout[] }> {
    const dists = await dbAll<DbDistribution>(`SELECT * FROM distributions WHERE case_id = ? ORDER BY created_at DESC`, [caseId]);
    if (!dists || dists.length === 0) return { distribution: null, payouts: [] };
    for (const d of dists) {
        const p = await dbAll<DbDistributionPayout>(`SELECT * FROM distribution_payouts WHERE distribution_id = ? ORDER BY created_at ASC`, [d.id]);
        if (p.length > 0) return { distribution: d, payouts: p };
    }
    const latest = dists[0];
    const payouts = await dbAll<DbDistributionPayout>(`SELECT * FROM distribution_payouts WHERE distribution_id = ? ORDER BY created_at ASC`, [latest.id]);
    return { distribution: latest, payouts };
}

// Maintenance utility: prune rows with invalid case_id values created by earlier route bugs
export async function pruneInvalidCaseRefs(): Promise<void> {
    await dbRun(`DELETE FROM entries WHERE case_id NOT IN (SELECT id FROM cases)`);
    await dbRun(`DELETE FROM hint_unlocks WHERE case_id NOT IN (SELECT id FROM cases)`);
    await dbRun(`DELETE FROM verdicts WHERE case_id NOT IN (SELECT id FROM cases)`);
    await dbRun(`DELETE FROM threads WHERE case_id NOT IN (SELECT id FROM cases)`);
}
