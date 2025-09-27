import { NextRequest, NextResponse } from "next/server";
import { listHintUnlocks, pruneInvalidCaseRefs } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
    try {
        const { caseId: rawCaseId } = await params;
        const caseId = decodeURIComponent(rawCaseId || "");
        const url = new URL(req.url);
        const userAddress = String(url.searchParams.get("userAddress") || "").toLowerCase();

        if (!caseId || !userAddress) {
            return NextResponse.json({ error: "caseId and userAddress required" }, { status: 400 });
        }

        try { await pruneInvalidCaseRefs(); } catch { }
        const unlocks = await listHintUnlocks(caseId, userAddress);
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


