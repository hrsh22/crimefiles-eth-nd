import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

export const name = "0002_seed_initial_case";

export async function up(db: Database.Database) {
    const { getCases } = await import("../app/case-files/cases");
    const cases = getCases();
    const now = new Date().toISOString();

    for (const c of cases) {
        const caseId = c.id; // preserve existing case ID used by the app
        db.prepare(`INSERT INTO cases (id, title, excerpt, story, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
            .run(caseId, c.title, c.excerpt, c.story, now, now);

        for (const hint of c.hints) {
            db.prepare(`INSERT INTO hints (id, case_id, hint_text, created_at) VALUES (?, ?, ?, ?)`)
                .run(uuidv4(), caseId, hint, now);
        }

        for (const s of c.suspects) {
            db.prepare(`INSERT INTO suspects (id, case_id, name, description, age, occupation, image, gender, traits, mannerisms, ai_prompt, whereabouts, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(
                    s.id, // preserve suspect ID for routing/chat compatibility
                    caseId,
                    s.name,
                    s.description || null,
                    s.age,
                    s.occupation,
                    s.image,
                    s.gender,
                    s.traits ? JSON.stringify(s.traits) : null,
                    s.mannerisms ? JSON.stringify(s.mannerisms) : null,
                    s.aiPrompt || null,
                    s.whereabouts ? JSON.stringify(s.whereabouts) : null,
                    now,
                    now
                );
        }

        if (c.timeline) {
            const timelineId = uuidv4();
            db.prepare(`INSERT INTO timelines (id, case_id, created_at, updated_at) VALUES (?, ?, ?, ?)`)
                .run(timelineId, caseId, now, now);

            c.timeline.ticks.forEach((t, index) => {
                const tickId = `${timelineId}:${t.id}`;
                db.prepare(`INSERT INTO timeline_ticks (id, timeline_id, label, position, created_at) VALUES (?, ?, ?, ?, ?)`)
                    .run(tickId, timelineId, t.label, index, now);
            });

            const laneIdMap = new Map<string, string>();
            c.timeline.lanes.forEach((l, index) => {
                const laneId = `${timelineId}:${l.id}`;
                laneIdMap.set(l.id, laneId);
                db.prepare(`INSERT INTO timeline_lanes (id, timeline_id, title, kind, position, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
                    .run(laneId, timelineId, l.title, l.kind, index, now);
            });

            c.timeline.events.forEach((e) => {
                const mappedLaneId = laneIdMap.get(e.laneId) || `${timelineId}:${e.laneId}`;
                db.prepare(`INSERT INTO timeline_events (id, timeline_id, lane_id, title, start_tick, end_tick, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                    .run(
                        uuidv4(),
                        timelineId,
                        mappedLaneId,
                        e.title,
                        e.startTick,
                        e.endTick ?? null,
                        e.tags ? JSON.stringify(e.tags) : null,
                        now,
                        now
                    );
            });
        }
    }
}

export function down(db: Database.Database) {
    db.exec(`DELETE FROM timeline_events; DELETE FROM timeline_lanes; DELETE FROM timeline_ticks; DELETE FROM timelines; DELETE FROM hints; DELETE FROM suspects; DELETE FROM cases;`);
}


