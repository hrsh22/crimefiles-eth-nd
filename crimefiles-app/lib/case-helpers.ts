import { DbCase, DbSuspect, DbHint, DbTimeline, DbTimelineTick, DbTimelineLane, DbTimelineEvent } from './db';
import { CaseFile, Suspect, Timeline } from '@/app/case-files/cases';

/**
 * Convert database case to frontend case format
 */
export function dbCaseToCaseFile(dbCase: DbCase, dbSuspects: DbSuspect[], dbHints: DbHint[], dbTimeline?: DbTimeline | null, dbTicks?: DbTimelineTick[], dbLanes?: DbTimelineLane[], dbEvents?: DbTimelineEvent[]): CaseFile {
    // Convert suspects
    const suspects: Suspect[] = dbSuspects.map(dbSuspect => ({
        id: dbSuspect.id,
        name: dbSuspect.name,
        description: dbSuspect.description || undefined,
        age: dbSuspect.age,
        occupation: dbSuspect.occupation,
        image: dbSuspect.image,
        gender: dbSuspect.gender,
        traits: dbSuspect.traits ? JSON.parse(dbSuspect.traits) : undefined,
        mannerisms: dbSuspect.mannerisms ? JSON.parse(dbSuspect.mannerisms) : undefined,
        aiPrompt: dbSuspect.ai_prompt || undefined,
        whereabouts: dbSuspect.whereabouts ? JSON.parse(dbSuspect.whereabouts) : undefined
    }));

    // Convert hints
    const hints = dbHints.map(hint => hint.hint_text);

    // Convert timeline if available
    let timeline: Timeline | undefined;
    if (dbTimeline && dbTicks && dbLanes && dbEvents) {
        timeline = {
            ticks: dbTicks.map(dbTick => ({
                id: dbTick.id,
                label: dbTick.label
            })),
            lanes: dbLanes.map(dbLane => ({
                id: dbLane.id,
                title: dbLane.title,
                kind: dbLane.kind as "victim" | "suspect" | "witness" | "solution"
            })),
            events: dbEvents.map(dbEvent => ({
                id: dbEvent.id,
                laneId: dbEvent.lane_id,
                startTick: dbEvent.start_tick,
                endTick: dbEvent.end_tick || undefined,
                title: dbEvent.title,
                tags: dbEvent.tags ? JSON.parse(dbEvent.tags) : undefined
            }))
        };
    }

    return {
        id: dbCase.id,
        title: dbCase.title,
        excerpt: dbCase.excerpt,
        story: dbCase.story,
        hints,
        suspects,
        timeline
    };
}

/**
 * Get all cases from database in frontend format
 */
export async function getAllCasesFromDb(): Promise<CaseFile[]> {
    const { getAllCases, getSuspectsByCaseId, getHintsByCaseId, getTimelineByCaseId, getTimelineTicks, getTimelineLanes, getTimelineEvents } = await import('./db');

    const dbCases = await getAllCases();

    const results: CaseFile[] = [];
    for (const dbCase of dbCases) {
        const [suspects, hints, timeline] = await Promise.all([
            getSuspectsByCaseId(dbCase.id),
            getHintsByCaseId(dbCase.id),
            getTimelineByCaseId(dbCase.id),
        ]);
        const [ticks, lanes, events] = timeline
            ? await Promise.all([
                getTimelineTicks(timeline.id),
                getTimelineLanes(timeline.id),
                getTimelineEvents(timeline.id),
            ])
            : [[], [], []];
        results.push(dbCaseToCaseFile(dbCase, suspects, hints, timeline || undefined, ticks, lanes, events));
    }
    return results;
}

/**
 * Get a specific case from database in frontend format
 */
export async function getCaseFromDb(id: string): Promise<CaseFile | undefined> {
    const { getCaseById, getSuspectsByCaseId, getHintsByCaseId, getTimelineByCaseId, getTimelineTicks, getTimelineLanes, getTimelineEvents } = await import('./db');

    const dbCase = await getCaseById(id);
    if (!dbCase) return undefined;

    const [suspects, hints, timeline] = await Promise.all([
        getSuspectsByCaseId(dbCase.id),
        getHintsByCaseId(dbCase.id),
        getTimelineByCaseId(dbCase.id),
    ]);
    const [ticks, lanes, events] = timeline
        ? await Promise.all([
            getTimelineTicks(timeline.id),
            getTimelineLanes(timeline.id),
            getTimelineEvents(timeline.id),
        ])
        : [[], [], []];

    return dbCaseToCaseFile(dbCase, suspects, hints, timeline, ticks, lanes, events);
}
