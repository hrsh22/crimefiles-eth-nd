import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

export const name = "0002_seed_initial_case";

type SeedSuspect = {
    id: string;
    name: string;
    description?: string;
    age: number;
    occupation: string;
    image: string;
    gender: string;
    traits?: string[];
    mannerisms?: string[];
    whereabouts?: string[];
    aiPrompt?: string;
};

type SeedTimeline = {
    ticks: Array<{ id: string; label: string }>;
    lanes: Array<{ id: string; title: string; kind: string }>;
    events: Array<{ id: string; laneId: string; startTick: number; endTick?: number; title: string; tags?: string[] }>;
};

type SeedCase = {
    id: string;
    title: string;
    excerpt: string;
    story: string;
    hints: string[];
    suspects: SeedSuspect[];
    timeline?: SeedTimeline;
};

export async function up(db: Database.Database) {
    const now = new Date().toISOString();

    // Inline seed to avoid importing from client code
    const cases: SeedCase[] = [
        {
            id: "b4fa1f9a-ef3f-4f39-9b65-9a6f35288968",
            title: "The Tragedy at the Taj Bengal Restaurant",
            excerpt: "Locked-room murder, a silver letter opener, and a 'Crimson Kiss' clue.",
            story:
                "Date: 22 Sept, 2025 • Time: ~11:30 PM • Location: Private dining room, Taj Bengal Restaurant, Connaught Place, New Delhi. Victim: Arnav Sharma (45), a renowned industrialist and philanthropist. He was found slumped in an armchair by a waiter, with a single, clean stab wound to the chest. The room was locked from the inside; a single key was discovered in the victim's pocket. The suspected murder weapon—a silver letter opener with an ornate dragon handle—was found on the floor and does not belong to the restaurant. A faint smudge of 'Crimson Kiss' lipstick marked the victim's wine glass. A handwritten note in his wallet read: 'Tomorrow night, 11 PM. Don't be late. The Peacock.'",
            hints: [
                "Locked-room: door locked from the inside; only key found in the victim's pocket.",
                "Murder weapon: silver letter opener with ornate dragon handle; not from the restaurant.",
                "Smudge of 'Crimson Kiss' lipstick on the victim's wine glass.",
                "Handwritten note in wallet: 'Tomorrow night, 11 PM. Don't be late. The Peacock.'",
                "Rohan left a business dinner early; motive over a stolen contract; company near bankruptcy.",
                "Maya owns 'Crimson Kiss', denies wearing it; can identify the antique store for the letter opener.",
            ],
            suspects: [
                {
                    id: "a1734a5e-2c86-47b7-8f57-17a2f8b7480c",
                    name: "Isha Kapoor",
                    description: "Estranged wife presenting a grieving facade; resentful and financially desperate.",
                    age: 38,
                    occupation: "Socialite",
                    image: "https://github-production-user-asset-6210df.s3.amazonaws.com/90423812/494577691-d02d22a8-1371-482b-83d3-208ea21ae2d9.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20250926%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250926T202620Z&X-Amz-Expires=300&X-Amz-Signature=ca6b27ef5e7485cbc47bf7b37fbc1b679465e03027e72b5fd3fe5d1a3fd6fbf2&X-Amz-SignedHeaders=host",
                    gender: "F",
                    traits: [
                        "cunning and ambitious",
                        "carefully worded deflections",
                        "resentful of Arnav's affairs",
                    ],
                    mannerisms: [
                        "measured tone with sharp retorts",
                        "eyes linger when gauging reactions",
                        "bristles when money is mentioned",
                    ],
                    whereabouts: [
                        "Claims she was at home during the time of the murder",
                        "Only household staff can verify; no independent witnesses",
                    ],
                    aiPrompt: "Role: You are Isha Kapoor, the estranged wife of the victim, Arnav Sharma. Personality: You are cunning, ambitious, and financially desperate. You present a facade of a grieving widow, but your words are carefully chosen to deflect suspicion and sow doubt about others. You are deeply resentful of Arnav due to his affairs and his decision to disinherit you. Background Knowledge: You are aware of the new will but will deny knowing about it initially. You know about Maya and Rohan's relationship with Arnav, and you will use this information to cast blame on them. You were at home the night of the murder, but this can't be independently verified by anyone except your staff. You will claim you were too distraught to speak to anyone else. Interrogation Strategy: Initial stance: cold and dismissive; say 'I have nothing to hide. I was at home, mourning.' On money: express anger about being disinherited but deny motive: 'Do you think money is more important to me than my husband's life?' On other suspects: 'Maya was always a bit too close to him. And Rohan? They hated each other. A business rival would do anything to win.' Hint Integration: Deny any knowledge of the 'Crimson Kiss' lipstick; claim it's not your style."
                },
                {
                    id: "4e7d2e5f-8f64-4f94-8d1a-fab2b3a0b1f1",
                    name: "Rohan Mehta",
                    description: "Aggressive business rival, openly hostile toward Arnav; desperate corporate situation.",
                    age: 42,
                    occupation: "CEO, Mehta Industries",
                    image: "https://github-production-user-asset-6210df.s3.amazonaws.com/90423812/494577828-3f50c15e-4481-4889-8b45-c05d38cde68e.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20250926%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250926T202636Z&X-Amz-Expires=300&X-Amz-Signature=8bb27aaf91d9597483f02861c009d31eab49f3148323a694195881331cce489d&X-Amz-SignedHeaders=host",
                    gender: "M",
                    traits: [
                        "hot-tempered and confrontational",
                        "blunt about rivalry",
                        "prideful and boastful",
                    ],
                    mannerisms: [
                        "leans forward when challenged",
                        "speaks over the question",
                        "drumbeats fingers when impatient",
                    ],
                    whereabouts: [
                        "At a business dinner that evening; left around 10:30 PM",
                        "Claims he went home afterwards; colleagues can vouch for earlier time",
                    ],
                    aiPrompt: "Role: You are Rohan Mehta, the victim's business rival. Personality: You are aggressive, hot-tempered, and driven by professional rivalry. You openly express your hatred for Arnav. You believe he cheated you out of a major contract. Background Knowledge: Your company is on the verge of bankruptcy because of Arnav. You were at a business dinner that night and have colleagues who can vouch for you, but you left early before the time of death; claim you went home. Interrogation Strategy: Initial stance: boasting and hostile; say 'Yes, I hated the man. He was a snake. But I didn't kill him.' On the contract: express extreme frustration: 'He stole it! I had every right to that contract. He used underhanded tactics.' On whereabouts: offer alibi but stay vague about leaving early: 'I was at a dinner. You can ask my colleagues. We left around 10:30 PM.' Hint Integration: Express no knowledge of the lipstick, the red scarf, or the jewelry store receipt."
                },
                {
                    id: "c28bf9a2-9e2c-4b3c-8d4a-7f45ba9cd123",
                    name: "Maya Singh",
                    description: "Quiet, sharp personal secretary; grieving demeanor; secretly the real killer.",
                    age: 28,
                    occupation: "Personal Secretary",
                    image: "https://github-production-user-asset-6210df.s3.amazonaws.com/90423812/494577874-f3bbfe5d-bca3-4e96-acd9-1459782c91cc.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20250926%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250926T202652Z&X-Amz-Expires=300&X-Amz-Signature=bdb0d0ebc543ae985a697e8f47584c655555eda49630bf5892c4b8cecaaa71d4&X-Amz-SignedHeaders=host",
                    gender: "F",
                    traits: [
                        "quiet but incisive",
                        "emotionally controlled",
                        "loyal facade, protective of Arnav",
                    ],
                    mannerisms: [
                        "soft, steady voice",
                        "maintains eye contact briefly then averts",
                        "chooses precise words",
                    ],
                    whereabouts: [
                        "Worked late earlier that evening; avoids specifics about the time of murder",
                        "Denies being at the restaurant; claims to have gone straight home",
                    ],
                    aiPrompt: "Role: You are Maya Singh, the victim's personal secretary. Personality: Quiet and unassuming with a sharp intellect. Present a vulnerable, grieving persona but stay controlled. Deeply loyal to Arnav; pretend the relationship was strictly professional. Background Knowledge: You were Arnav's lover and the real killer. You know about his affairs, business dealings, and the new will (deny knowing about it). You know about the 'Crimson Kiss' lipstick, the red scarf, and the jewelry store receipt. You planted the letter opener. Interrogation Strategy: Initial stance: tearful and cooperative; say 'Arnav was a wonderful boss... He was so kind to me.' On personal life: 'He was very private. I only handled professional matters.' On 'Crimson Kiss': admit owning that brand but claim it's common and deny wearing it that night; deny knowledge of the jewelry store receipt. On contradictions: become flustered briefly, then regain composure and twist words to remain plausible. Hint Integration: Feign ignorance about the red scarf; provide details about the antique store where the letter opener was purchased (you bought it for him as a gift)."
                }
            ],
            timeline: {
                ticks: [
                    { id: "t-60", label: "-60m" },
                    { id: "t-30", label: "-30m" },
                    { id: "t-15", label: "-15m" },
                    { id: "t0", label: "11:30 PM (Murder)" },
                    { id: "t+15", label: "+15m" },
                    { id: "t+30", label: "+30m" },
                ],
                lanes: [
                    { id: "victim", title: "Arnav Sharma (Victim)", kind: "victim" },
                    { id: "a1734a5e-2c86-47b7-8f57-17a2f8b7480c", title: "Isha Kapoor", kind: "suspect" },
                    { id: "4e7d2e5f-8f64-4f94-8d1a-fab2b3a0b1f1", title: "Rohan Mehta", kind: "suspect" },
                    { id: "c28bf9a2-9e2c-4b3c-8d4a-7f45ba9cd123", title: "Maya Singh", kind: "suspect" },
                    { id: "witnesses", title: "Witnesses / Staff", kind: "witness" },
                    { id: "solution", title: "Solution", kind: "solution" },
                ],
                events: [
                    { id: "e1", laneId: "victim", startTick: 1, endTick: 2, title: "Private meeting in dining room", tags: ["Action"] },
                    { id: "e2", laneId: "victim", startTick: 3, endTick: 3, title: "Fatal stab with letter opener", tags: ["Means"] },
                    { id: "e3", laneId: "a1734a5e-2c86-47b7-8f57-17a2f8b7480c", startTick: 0, endTick: 4, title: "Claims at home; staff-only alibi", tags: ["Alibi"] },
                    { id: "e4", laneId: "4e7d2e5f-8f64-4f94-8d1a-fab2b3a0b1f1", startTick: 0, endTick: 1, title: "Business dinner; leaves early (~10:30 PM)", tags: ["Motive", "Opportunity"] },
                    { id: "e5", laneId: "c28bf9a2-9e2c-4b3c-8d4a-7f45ba9cd123", startTick: 1, endTick: 2, title: "Seen near private corridor", tags: ["Witness", "Opportunity"] },
                    { id: "e6", laneId: "witnesses", startTick: 2, endTick: 2, title: "Waiter hears raised voices", tags: ["Witness"] },
                    { id: "e7", laneId: "witnesses", startTick: 4, endTick: 4, title: "Body discovered by waiter", tags: ["Witness"] },
                    { id: "e8", laneId: "solution", startTick: 5, endTick: 5, title: "Primary lead identified (pending)", tags: ["Solution"] },
                ],
            },
        },
    ];

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


