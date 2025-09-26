import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface Case {
    id: string;
    title: string;
    excerpt: string;
    story: string;
    hints: string[];
    suspects: Suspect[];
    timeline?: Timeline;
}

export interface Suspect {
    id: string;
    name: string;
    age: number;
    occupation: string;
    image: string;
    gender: string;
    description?: string;
    traits?: string[];
    mannerisms?: string[];
    aiPrompt?: string;
    whereabouts?: string[];
}

export interface Timeline {
    ticks: TimelineTick[];
    lanes: TimelineLane[];
    events: TimelineEvent[];
}

export interface TimelineTick { id: string; label: string; }
export interface TimelineLane { id: string; title: string; kind: "victim" | "suspect" | "witness" | "solution"; }
export interface TimelineEvent { id: string; laneId: string; title: string; startTick: number; endTick?: number; tags?: string[]; }

export interface CreateCaseData {
    title: string;
    excerpt: string;
    story: string;
}

export interface CreateHintData {
    hintText: string;
}

export interface CreateSuspectData {
    name: string;
    age: number;
    occupation: string;
    image: string;
    gender: string;
    description?: string;
    traits?: string[];
    mannerisms?: string[];
    aiPrompt?: string;
    whereabouts?: string[];
}

// Query Keys
export const caseKeys = {
    all: ['cases'] as const,
    lists: () => [...caseKeys.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...caseKeys.lists(), { filters }] as const,
    details: () => [...caseKeys.all, 'detail'] as const,
    detail: (id: string) => [...caseKeys.details(), id] as const,
    hints: (caseId: string) => [...caseKeys.detail(caseId), 'hints'] as const,
    suspects: (caseId: string) => [...caseKeys.detail(caseId), 'suspects'] as const,
};

// Hooks for Cases
export function useCases() {
    return useQuery({
        queryKey: caseKeys.lists(),
        queryFn: async (): Promise<Case[]> => {
            const res = await fetch('/api/admin/cases');
            if (!res.ok) throw new Error('Failed to fetch cases');
            const data = await res.json();
            return data.cases || [];
        },
    });
}

export function useCase(caseId: string, enabled = true) {
    return useQuery({
        queryKey: caseKeys.detail(caseId),
        queryFn: async (): Promise<Case> => {
            const res = await fetch(`/api/admin/cases/${encodeURIComponent(caseId)}`);
            if (!res.ok) {
                if (res.status === 404) throw new Error('Case not found');
                throw new Error('Failed to fetch case');
            }
            const data = await res.json();
            return data.case;
        },
        enabled: enabled && !!caseId,
    });
}

// Mutations for Cases
export function useCreateCase() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateCaseData): Promise<Case> => {
            const res = await fetch('/api/admin/cases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to create case');
            }
            const result = await res.json();
            return result.case;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
        },
    });
}

export function useUpdateCase() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ caseId, data }: { caseId: string; data: Partial<CreateCaseData> }): Promise<Case> => {
            const res = await fetch(`/api/admin/cases/${encodeURIComponent(caseId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to update case');
            }
            const result = await res.json();
            return result.case;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
            queryClient.invalidateQueries({ queryKey: caseKeys.detail(variables.caseId) });
        },
    });
}

export function useDeleteCase() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (caseId: string): Promise<void> => {
            const res = await fetch(`/api/admin/cases?id=${encodeURIComponent(caseId)}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete case');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
        },
    });
}

// Hooks for Hints
export function useHints(caseId: string, enabled = true) {
    return useQuery({
        queryKey: caseKeys.hints(caseId),
        queryFn: async (): Promise<string[]> => {
            const res = await fetch(`/api/admin/cases/${encodeURIComponent(caseId)}/hints`);
            if (!res.ok) throw new Error('Failed to fetch hints');
            const data = await res.json();
            return data.hints || [];
        },
        enabled: enabled && !!caseId,
    });
}

export function useCreateHint() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ caseId, data }: { caseId: string; data: CreateHintData }): Promise<void> => {
            const res = await fetch(`/api/admin/cases/${encodeURIComponent(caseId)}/hints`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to create hint');
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: caseKeys.hints(variables.caseId) });
            queryClient.invalidateQueries({ queryKey: caseKeys.detail(variables.caseId) });
        },
    });
}

export function useUpdateHint() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ caseId, hintId, data }: { caseId: string; hintId: string; data: CreateHintData }): Promise<void> => {
            const res = await fetch(`/api/admin/cases/${encodeURIComponent(caseId)}/hints/${encodeURIComponent(hintId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to update hint');
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: caseKeys.hints(variables.caseId) });
            queryClient.invalidateQueries({ queryKey: caseKeys.detail(variables.caseId) });
        },
    });
}

export function useDeleteHint() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ caseId, hintId }: { caseId: string; hintId: string }): Promise<void> => {
            const res = await fetch(`/api/admin/cases/${encodeURIComponent(caseId)}/hints/${encodeURIComponent(hintId)}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete hint');
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: caseKeys.hints(variables.caseId) });
            queryClient.invalidateQueries({ queryKey: caseKeys.detail(variables.caseId) });
        },
    });
}

// Hooks for Suspects
export function useSuspects(caseId: string, enabled = true) {
    return useQuery({
        queryKey: caseKeys.suspects(caseId),
        queryFn: async (): Promise<Suspect[]> => {
            const res = await fetch(`/api/admin/cases/${encodeURIComponent(caseId)}/suspects`);
            if (!res.ok) throw new Error('Failed to fetch suspects');
            const data = await res.json();
            return data.suspects || [];
        },
        enabled: enabled && !!caseId,
    });
}

export function useCreateSuspect() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ caseId, data }: { caseId: string; data: CreateSuspectData }): Promise<Suspect> => {
            const res = await fetch(`/api/admin/cases/${encodeURIComponent(caseId)}/suspects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to create suspect');
            }
            const result = await res.json();
            return result.suspect;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: caseKeys.suspects(variables.caseId) });
            queryClient.invalidateQueries({ queryKey: caseKeys.detail(variables.caseId) });
        },
    });
}

export function useUpdateSuspect() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ caseId, suspectId, data }: { caseId: string; suspectId: string; data: Partial<CreateSuspectData> }): Promise<Suspect> => {
            const res = await fetch(`/api/admin/cases/${encodeURIComponent(caseId)}/suspects/${encodeURIComponent(suspectId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to update suspect');
            }
            const result = await res.json();
            return result.suspect;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: caseKeys.suspects(variables.caseId) });
            queryClient.invalidateQueries({ queryKey: caseKeys.detail(variables.caseId) });
        },
    });
}

export function useDeleteSuspect() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ caseId, suspectId }: { caseId: string; suspectId: string }): Promise<void> => {
            const res = await fetch(`/api/admin/cases/${encodeURIComponent(caseId)}/suspects/${encodeURIComponent(suspectId)}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete suspect');
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: caseKeys.suspects(variables.caseId) });
            queryClient.invalidateQueries({ queryKey: caseKeys.detail(variables.caseId) });
        },
    });
}
