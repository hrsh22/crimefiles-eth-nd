import { NextRequest, NextResponse } from "next/server";
import { recordEntry } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const parts = url.pathname.split("/");
        const caseId = decodeURIComponent(parts[5] || "");
        const { userAddress, txHash, facilitator } = await req.json();
        const ua = String(userAddress || "").toLowerCase();

        if (!caseId || !ua) {
            return NextResponse.json({ error: "caseId and userAddress required" }, { status: 400 });
        }

        const entry = recordEntry({ caseId, userAddress: ua, txHash: txHash || undefined, facilitator: facilitator || undefined });
        return NextResponse.json({ entry });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        console.error("Failed to record entry:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}


