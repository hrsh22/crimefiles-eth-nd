import { NextRequest, NextResponse } from "next/server";
import { createHint, getHintsByCaseId } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const parts = url.pathname.split("/");
        const caseId = decodeURIComponent(parts[4] || "");
        if (!caseId) return NextResponse.json({ error: "Case ID required" }, { status: 400 });

        const hints = await getHintsByCaseId(caseId);
        return NextResponse.json({ hints });
    } catch (error) {
        console.error("Failed to fetch hints:", error);
        return NextResponse.json({ error: "Failed to fetch hints" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const parts = url.pathname.split("/");
        const caseId = decodeURIComponent(parts[4] || "");
        const body = await req.json();
        const hintText = String(body.hintText || "").trim();

        if (!caseId || !hintText) return NextResponse.json({ error: "Case ID and hintText are required" }, { status: 400 });

        const hint = await createHint({ caseId, hintText });
        return NextResponse.json({ hint }, { status: 201 });
    } catch (error) {
        console.error("Failed to create hint:", error);
        return NextResponse.json({ error: "Failed to create hint" }, { status: 500 });
    }
}


