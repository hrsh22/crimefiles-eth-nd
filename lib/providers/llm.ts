export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

export interface LlmProvider {
    chat(options: { model?: string; messages: LlmMessage[]; temperature?: number }): Promise<{ text: string }>;
}

export async function getLlmProvider(): Promise<LlmProvider> {
    const asiKey = process.env.ASI_ONE_API_KEY;
    const asiBase = process.env.ASI_ONE_BASE_URL; // e.g., https://asi1.ai or full API base
    if (asiKey && asiBase) {
        const mod = await import("./providers_internal/asiOne");
        return mod.createAsiOneProvider({ baseUrl: asiBase, apiKey: asiKey });
    }
    throw new Error("No LLM provider configured. Set ASI_ONE_BASE_URL and ASI_ONE_API_KEY.");
}


