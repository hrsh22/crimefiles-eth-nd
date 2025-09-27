import { NextRequest, NextResponse } from "next/server";
import { recordHintUnlock } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
    try {
        const { caseId: rawCaseId } = await params;
        const caseId = decodeURIComponent(rawCaseId || "");
        const { userAddress, hintIndex, txHash, facilitator } = await req.json();
        const ua = String(userAddress || "").toLowerCase();
        const idx = Number(hintIndex);

        if (!caseId || !ua || Number.isNaN(idx)) {
            return NextResponse.json({ error: "caseId, userAddress and hintIndex required" }, { status: 400 });
        }

        const unlock = recordHintUnlock({ caseId, userAddress: ua, hintIndex: idx, txHash: txHash || undefined, facilitator: facilitator || undefined });
        const res = NextResponse.json({ unlock });
        res.headers.set('Cache-Control', 'no-store');
        return res;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        console.error("Failed to record hint unlock:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}


