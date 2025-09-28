import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export interface Thread {
    id: string;
    userAddress: string;
    caseId: string;
    suspectId: string;
    createdAt: string;
    updatedAt: string;
}

export interface ThreadWithMessages {
    thread: Thread | null;
    messages: Message[];
}

export interface SendMessageData {
    userMessage: string;
    userAddress: string;
    threadId?: string;
}

export interface SendMessageResponse {
    response: string;
    threadId: string;
    leads?: Array<{ title: string; tags: string[]; justification: string }>;
    consistency?: number;
}

// Query Keys
export const chatKeys = {
    all: ['chat'] as const,
    threads: () => [...chatKeys.all, 'threads'] as const,
    thread: (userAddress: string, caseId: string, suspectId: string) =>
        [...chatKeys.threads(), { userAddress, caseId, suspectId }] as const,
};

// Hooks for Chat
export function useThread(userAddress: string, caseId: string, suspectId: string, enabled = true) {
    return useQuery({
        queryKey: chatKeys.thread(userAddress, caseId, suspectId),
        queryFn: async (): Promise<ThreadWithMessages> => {
            const res = await fetch(
                `/api/cases/${encodeURIComponent(caseId)}/suspects/${encodeURIComponent(suspectId)}/thread?userAddress=${encodeURIComponent(userAddress)}`
            );
            if (!res.ok) {
                if (res.status === 401) throw new Error('Wallet connection required');
                throw new Error('Failed to fetch thread');
            }
            const data = await res.json();
            return { thread: data.thread, messages: data.messages || [] };
        },
        enabled: enabled && !!userAddress && !!caseId && !!suspectId,
        staleTime: 0, // Always refetch thread data
    });
}

export function useSendMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ caseId, suspectId, data }: {
            caseId: string;
            suspectId: string;
            data: SendMessageData
        }): Promise<SendMessageResponse> => {
            const res = await fetch(
                `/api/cases/${encodeURIComponent(caseId)}/suspects/${encodeURIComponent(suspectId)}/messages`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                }
            );
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to send message');
            }
            return await res.json();
        },
        onSuccess: (data, variables) => {
            // Invalidate the thread query to refetch messages
            queryClient.invalidateQueries({
                queryKey: chatKeys.thread(variables.data.userAddress, variables.caseId, variables.suspectId)
            });
        },
    });
}

// Helper hook for optimistic message updates
export function useOptimisticSendMessage() {
    const queryClient = useQueryClient();
    const sendMessage = useSendMessage();

    return {
        ...sendMessage,
        mutateAsync: async (params: {
            caseId: string;
            suspectId: string;
            data: SendMessageData;
            optimisticMessage: Message;
        }) => {
            const { optimisticMessage, ...sendParams } = params;

            // Optimistically update the cache
            const queryKey = chatKeys.thread(sendParams.data.userAddress, sendParams.caseId, sendParams.suspectId);
            const previousData = queryClient.getQueryData<ThreadWithMessages>(queryKey);

            if (previousData) {
                queryClient.setQueryData(queryKey, {
                    ...previousData,
                    messages: [...previousData.messages, optimisticMessage],
                });
            }

            try {
                const result = await sendMessage.mutateAsync(sendParams);
                return result;
            } catch (error) {
                // Revert optimistic update on error
                if (previousData) {
                    queryClient.setQueryData(queryKey, previousData);
                }
                throw error;
            }
        },
    };
}
