import { createCase, createSuspect, createHint, createTimeline, createTimelineTick, createTimelineLane, createTimelineEvent } from './db';
import type { CaseFile } from '@/app/case-files/cases';

/**
 * Migration function to seed the database with hardcoded case data
 * This should be run once to populate the database with initial data
 */
export async function migrateCaseData(): Promise<void> {
    console.log('🚀 Starting case data migration...');

    try {
        // Import the legacy cases (now only types) replaced by direct seed in 0002
        const cases: CaseFile[] = [];

        for (const caseFile of cases) {
            console.log(`📁 Migrating case: ${caseFile.title}`);

            // Create the case
            const dbCase = await createCase({
                title: caseFile.title,
                excerpt: caseFile.excerpt,
                story: caseFile.story
            });

            // Create hints for the case
            for (const hintText of caseFile.hints) {
                await createHint({
                    caseId: dbCase.id,
                    hintText
                });
            }

            // Create suspects for the case
            for (const suspect of caseFile.suspects) {
                await createSuspect({
                    caseId: dbCase.id,
                    name: suspect.name,
                    description: suspect.description,
                    age: suspect.age,
                    occupation: suspect.occupation,
                    image: suspect.image,
                    gender: suspect.gender,
                    traits: suspect.traits,
                    mannerisms: suspect.mannerisms,
                    aiPrompt: suspect.aiPrompt,
                    whereabouts: suspect.whereabouts
                });
            }

            // Create timeline if it exists
            if (caseFile.timeline) {
                console.log('📅 Creating timeline...');

                const timeline = await createTimeline(dbCase.id);

                // Create timeline ticks
                for (let i = 0; i < caseFile.timeline.ticks.length; i++) {
                    const tick = caseFile.timeline.ticks[i];
                    await createTimelineTick({
                        timelineId: timeline.id,
                        label: tick.label,
                        position: i
                    });
                }

                // Create timeline lanes
                for (let i = 0; i < caseFile.timeline.lanes.length; i++) {
                    const lane = caseFile.timeline.lanes[i];
                    await createTimelineLane({
                        timelineId: timeline.id,
                        title: lane.title,
                        kind: lane.kind,
                        position: i
                    });
                }

                // Create timeline events
                for (const event of caseFile.timeline.events) {
                    await createTimelineEvent({
                        timelineId: timeline.id,
                        laneId: event.laneId,
                        title: event.title,
                        startTick: event.startTick,
                        endTick: event.endTick,
                        tags: event.tags
                    });
                }
            }

            console.log(`✅ Case ${caseFile.title} migrated successfully`);
        }

        console.log('🎉 Case data migration completed!');
    } catch (error) {
        console.error('💥 Migration failed:', error);
        throw error;
    }
}

/**
 * Check if migration has already been run
 */
export function hasMigrationBeenRun(): boolean {
    try {
        // dynamic import to avoid require rule
        // Note: only used by old flow; migrations runner supersedes this
        return false;
    } catch {
        return false;
    }
}

/**
 * Run migration if not already done
 */
export async function ensureCaseDataMigrated(): Promise<void> {
    if (!hasMigrationBeenRun()) {
        console.log('📊 No case data found in database, running migration...');
        await migrateCaseData();
    } else {
        console.log('📊 Case data already exists in database, skipping migration');
    }
}
