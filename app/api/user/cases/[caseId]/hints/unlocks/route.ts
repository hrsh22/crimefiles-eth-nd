import { NextRequest, NextResponse } from "next/server";
import { listHintUnlocks } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const parts = url.pathname.split("/");
        const caseId = decodeURIComponent(parts[5] || "");
        const userAddress = String(url.searchParams.get("userAddress") || "").toLowerCase();

        if (!caseId || !userAddress) {
            return NextResponse.json({ error: "caseId and userAddress required" }, { status: 400 });
        }

        const unlocks = listHintUnlocks(caseId, userAddress);
        const unlockedIndices = unlocks.map(u => u.hint_index);
        return NextResponse.json({ unlockedIndices });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        console.error("Failed to list hint unlocks:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}


