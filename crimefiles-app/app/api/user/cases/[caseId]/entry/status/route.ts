import { NextRequest, NextResponse } from "next/server";
import { getEntry, pruneInvalidCaseRefs } from "@/lib/db";

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

        try { pruneInvalidCaseRefs(); } catch { }
        const entry = getEntry(caseId, userAddress);
        const res = NextResponse.json({ hasEntry: !!entry, entry });
        res.headers.set('Cache-Control', 'no-store');
        return res;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        console.error("Failed to check entry status:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}


