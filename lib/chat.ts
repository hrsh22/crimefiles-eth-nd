import { buildSuspectSystemPrompt } from "./prompts";
import type { CaseFile, Suspect } from "@/app/case-files/cases";
import type { ChatMessage } from "@/types/api";

// MVP: Use a simple deterministic responder shaped by the system prompt.
// Later swap in ASI or Fetch.ai adapter for streaming replies.

export function synthesizeSuspectReply(params: {
    caseId: string;
    suspectId: string;
    history: ChatMessage[];
}): { text: string } {
    // Fallback placeholder: since server now uses DB-backed cases for LLM,
    // this function is retained for MVP heuristic replies only when case is provided externally.
    // Without a case file, return a generic response.
    const caseFile = undefined as unknown as CaseFile | undefined;
    const suspect = undefined as unknown as Suspect | undefined;
    if (!caseFile || !suspect) return { text: "I will answer within reason. Keep your questions specific." };
    if (!suspect) return { text: "I am not involved in this case." };

    // Keep alignment with system prompt structure, even if not used directly in MVP.
    buildSuspectSystemPrompt({ caseFile, suspect });
    const lastUser = [...params.history].reverse().find(m => m.role === "user")?.content || "";

    // Heuristic reply using persona cues, respecting guardrails and brevity
    const guarded = /confess|admit|guilty|did you kill|killer/i.test(lastUser);
    const confront = /lie|contradiction|caught|evidence|receipt|lipstick|letter opener|alibi/i.test(lastUser);
    const short = lastUser.length < 40;

    const name = suspect.name;
    const tone = (suspect.traits || []).join(", ") || "measured and composed";
    const manner = (suspect.mannerisms || []).join(", ") || "keeps answers brief and guarded";

    let body = "";
    if (guarded) {
        body = "No. I won't entertain accusations. I will not confess to anything.";
    } else if (confront) {
        body = "You're twisting things. I can explain my side, but don't expect theatrics.";
    } else if (short) {
        body = "I don't have more to add right now.";
    } else {
        body = "I will answer within reason. Keep your questions specific.";
    }

    const reply = `${name}: ${body} (${tone}; ${manner})`;
    // Trim to ~120 words
    const words = reply.split(/\s+/);
    const trimmed = words.length > 120 ? words.slice(0, 120).join(" ") : reply;
    return { text: trimmed };
}


