import { NextRequest, NextResponse } from "next/server";
import { getVerdict, recordVerdict } from "@/lib/db";

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

        const verdict = getVerdict(caseId, userAddress);
        const res = NextResponse.json({ verdict });
        res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.headers.set('Pragma', 'no-cache');
        res.headers.set('Expires', '0');
        return res;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        console.error("Failed to fetch verdict:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

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
        const { userAddress, suspectId, amount, txHash, facilitator } = await req.json();
        const ua = String(userAddress || "").toLowerCase();

        if (!caseId || !ua || !suspectId) {
            return NextResponse.json({ error: "caseId, userAddress and suspectId required" }, { status: 400 });
        }

        const verdict = recordVerdict({ caseId, userAddress: ua, suspectId: String(suspectId), amount: amount ? String(amount) : undefined, txHash: txHash || undefined, facilitator: facilitator || undefined });
        const res = NextResponse.json({ verdict });
        res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.headers.set('Pragma', 'no-cache');
        res.headers.set('Expires', '0');
        return res;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        console.error("Failed to record verdict:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}


