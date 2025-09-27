export type Suspect = {
    id: string;
    name: string;
    description?: string;
    age: number;
    occupation: string;
    image: string;
    gender: string;
    traits?: string[];
    mannerisms?: string[];
    aiPrompt?: string;
    whereabouts?: string[]; // new: structured whereabouts
};

export type TimelineTick = { id: string; label: string };
export type TimelineLane = { id: string; title: string; kind: "victim" | "suspect" | "witness" | "solution" };
export type TimelineEventTag = "Means" | "Motive" | "Opportunity" | "Alibi" | "Witness" | "Action" | "Clue" | "Solution";
export type TimelineEvent = {
    id: string;
    laneId: string;
    startTick: number; // index in ticks array
    endTick?: number;  // inclusive index; if omitted, spans 1 cell
    title: string;
    tags?: TimelineEventTag[];
};
export type Timeline = {
    ticks: TimelineTick[];
    lanes: TimelineLane[];
    events: TimelineEvent[];
};

export type CaseFile = {
    id: string;
    title: string;
    excerpt: string;
    story: string;
    hints: string[];
    suspects: Suspect[];
    timeline?: Timeline;
};

// This file is now used only for type definitions.
// All data loading is done through backend APIs using TanStack Query.
