import { NextRequest, NextResponse } from "next/server";
import { getOrCreateOpenThread, insertMessage, listMessages } from "@/lib/db";
import type { AgentRequest } from "@/types/api";
import { getLlmProvider } from "@/lib/providers/llm";
import { buildSuspectSystemPrompt } from "@/lib/prompts";
import { getCaseFromDb } from "@/lib/case-helpers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const startTime = Date.now();
    const url = new URL(req.url);
    const parts = url.pathname.split("/");
    const caseId = decodeURIComponent(parts[3] || "");
    const suspectId = decodeURIComponent(parts[5] || "");
    const body = (await req.json()) as AgentRequest & { userAddress?: string; threadId?: string };
    const userAddress = String(body.userAddress).toLowerCase();
    const userMessage = String(body.userMessage || "").trim();

    try {
        if (!userMessage) {
            console.warn("⚠️ Empty message received");
            return NextResponse.json({ error: "Empty message" }, { status: 400 });
        }

        if (!userAddress) {
            console.error("❌ No wallet address provided - wallet connection required");
            return NextResponse.json({ error: "Wallet connection required" }, { status: 401 });
        }

        // Get or create thread and store user message
        const thread = await getOrCreateOpenThread({ userAddress, caseId, suspectId });
        await insertMessage({ threadId: thread.id, role: "user", content: userMessage });

        // Build context and system prompt
        const prior = await listMessages(thread.id);
        const caseFile = await getCaseFromDb(caseId);
        const suspect = caseFile?.suspects.find(s => s.id === suspectId);

        // Build system prompt (ASI:One needs actual conversation messages)
        const system = caseFile && suspect ? buildSuspectSystemPrompt({
            caseFile,
            suspect
        }) : undefined;

        // Build messages for LLM: system + conversation history + current user message
        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
        if (system) {
            messages.push({ role: "system", content: system });
            console.log(`📝 FULL SYSTEM PROMPT (${system.length} chars):`);
            console.log('='.repeat(80));
            console.log(system);
            console.log('='.repeat(80));
        }

        // Add conversation history (excluding current user message to avoid duplication)
        const historyWithoutCurrentUser = prior.length > 1 ? prior.slice(0, -1) : [];
        const recentHistory = historyWithoutCurrentUser.slice(-9);
        for (const m of recentHistory) {
            if (m.role === "user" || m.role === "assistant") {
                messages.push({ role: m.role, content: m.content });
            }
        }
        messages.push({ role: "user", content: userMessage });

        // Log all messages being sent to LLM
        console.log(`\n📋 FULL MESSAGES SENT TO LLM (${messages.length} messages):`);
        console.log('-'.repeat(80));
        messages.forEach((msg, index) => {
            const role = msg.role.toUpperCase();
            const content = msg.content;
            console.log(`\n[${index + 1}] ${role}:`);
            console.log(content);
            if (index < messages.length - 1) console.log('-'.repeat(40));
        });
        console.log('='.repeat(80));

        // Get LLM response
        const llm = await getLlmProvider();
        const { text } = await llm.chat({ messages, temperature: 0.6 });

        const duration = Date.now() - startTime;
        console.log(`✅ LLM Response: ${text.length} chars in ${duration}ms`);

        // Store assistant response and return
        await insertMessage({ threadId: thread.id, role: "assistant", content: text });
        return NextResponse.json({ response: text, threadId: thread.id });
    } catch (e) {
        const duration = Date.now() - startTime;
        const message = e instanceof Error ? e.message : "Internal error";
        console.error(`💥 Chat Request Failed in ${duration}ms: ${message}`);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}


