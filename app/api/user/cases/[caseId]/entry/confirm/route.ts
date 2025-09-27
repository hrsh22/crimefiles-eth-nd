import { NextRequest, NextResponse } from "next/server";
import { recordEntry } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ caseId: string }> } | { params: { caseId: string } }) {
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
        const { userAddress, txHash, facilitator } = await req.json();
        const ua = String(userAddress || "").toLowerCase();

        if (!caseId || !ua) {
            return NextResponse.json({ error: "caseId and userAddress required" }, { status: 400 });
        }

        const entry = recordEntry({ caseId, userAddress: ua, txHash: txHash || undefined, facilitator: facilitator || undefined });
        const res = NextResponse.json({ entry });
        res.headers.set('Cache-Control', 'no-store');
        return res;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        console.error("Failed to record entry:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}


