import { NextRequest, NextResponse } from "next/server";
import { listHintUnlocks, pruneInvalidCaseRefs } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ caseId: string }> } | { params: { caseId: string } }) {
    try {
        const url = new URL(req.url);
        let caseId = "";
        if (ctx && "params" in ctx) {
            const p = await (ctx as any).params;
            caseId = decodeURIComponent(p?.caseId || "");
        }
        if (!caseId) {
            const parts = url.pathname.split("/");
            caseId = decodeURIComponent(parts[4] || "");
        }
        const userAddress = String(url.searchParams.get("userAddress") || "").toLowerCase();

        if (!caseId || !userAddress) {
            return NextResponse.json({ error: "caseId and userAddress required" }, { status: 400 });
        }

        try { pruneInvalidCaseRefs(); } catch { }
        const unlocks = listHintUnlocks(caseId, userAddress);
        const unlockedIndices = unlocks.map(u => u.hint_index);
        const res = NextResponse.json({ unlockedIndices });
        res.headers.set('Cache-Control', 'no-store');
        return res;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        console.error("Failed to list hint unlocks:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}


