import { NextRequest, NextResponse } from "next/server";
import { getEntry } from "@/lib/db";

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

        const entry = getEntry(caseId, userAddress);
        return NextResponse.json({ hasEntry: !!entry, entry });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        console.error("Failed to check entry status:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}


