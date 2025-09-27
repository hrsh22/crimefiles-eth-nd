import { NextRequest, NextResponse } from "next/server";
import { recordEntry } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
    try {
        const { caseId: rawCaseId } = await params;
        const caseId = decodeURIComponent(rawCaseId || "");
        const { userAddress, txHash, facilitator } = await req.json();
        const ua = String(userAddress || "").toLowerCase();

        if (!caseId || !ua) {
            return NextResponse.json({ error: "caseId and userAddress required" }, { status: 400 });
        }

        const entry = await recordEntry({ caseId, userAddress: ua, txHash: txHash || undefined, facilitator: facilitator || undefined });
        const res = NextResponse.json({ entry });
        res.headers.set('Cache-Control', 'no-store');
        return res;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        console.error("Failed to record entry:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}


