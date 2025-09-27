import type { LlmMessage } from "../llm";

type CreateArgs = { baseUrl: string; apiKey: string };

export function createAsiOneProvider({ baseUrl, apiKey }: CreateArgs) {
    const endpoint = baseUrl.replace(/\/$/, "") + "/v1/chat/completions";
    return {
        async chat(options: { model?: string; messages: LlmMessage[]; temperature?: number }): Promise<{ text: string }> {
            const model = options.model || "asi1-mini";
            const body: { model: string; messages: LlmMessage[]; temperature: number } = {
                model,
                messages: options.messages,
                temperature: options.temperature ?? 0.7,
            };

            const startTime = Date.now();

            // Log the complete request being sent to ASI:One
            console.log(`\n🔄 ASI:One REQUEST (${options.messages.length} messages):`);
            console.log('~'.repeat(60));
            options.messages.forEach((msg, index) => {
                const role = msg.role.toUpperCase().padEnd(10);
                const content = msg.content;
                console.log(`\n[${index + 1}] ${role}:`);
                console.log(content);
                if (index < options.messages.length - 1) console.log('~'.repeat(30));
            });
            console.log('~'.repeat(60));

            try {
                const res = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        "authorization": `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify(body),
                });

                if (!res.ok) {
                    const text = await res.text();
                    console.error(`❌ ASI:One API Error ${res.status}: ${text}`);
                    throw new Error(`ASI:One HTTP ${res.status}: ${text}`);
                }

                const json = await res.json() as {
                    choices?: Array<{ message?: { content?: string } }>
                    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
                };

                const responseText = json?.choices?.[0]?.message?.content ?? "";
                const duration = Date.now() - startTime;

                console.log(`\n✅ ASI:One RESPONSE (${responseText.length} chars, ${duration}ms):`);
                console.log('~'.repeat(60));
                console.log(responseText);
                console.log('~'.repeat(60));

                // Log token usage if available
                if (json.usage) {
                    console.log(`📊 Tokens: ${json.usage.total_tokens} (${json.usage.prompt_tokens}/${json.usage.completion_tokens})`);
                }

                return { text: String(responseText) };
            } catch (error) {
                const duration = Date.now() - startTime;
                console.error(`💥 LLM Request Failed in ${duration}ms: ${error instanceof Error ? error.message : String(error)}`);
                throw error;
            }
        }
    };
}


