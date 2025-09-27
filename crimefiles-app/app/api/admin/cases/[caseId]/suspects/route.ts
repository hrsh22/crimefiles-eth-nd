import { NextRequest, NextResponse } from "next/server";
import { createSuspect, getSuspectsByCaseId } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const parts = url.pathname.split("/");
        const caseId = decodeURIComponent(parts[4] || "");
        if (!caseId) return NextResponse.json({ error: "Case ID required" }, { status: 400 });

        const suspects = await getSuspectsByCaseId(caseId);
        return NextResponse.json({ suspects });
    } catch (error) {
        console.error("Failed to fetch suspects:", error);
        return NextResponse.json({ error: "Failed to fetch suspects" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const parts = url.pathname.split("/");
        const caseId = decodeURIComponent(parts[4] || "");
        const body = await req.json();

        const required = ["name", "age", "occupation", "image", "gender"];
        for (const key of required) if (!body[key]) return NextResponse.json({ error: `${key} is required` }, { status: 400 });

        const suspect = await createSuspect({
            caseId,
            name: String(body.name),
            description: body.description ? String(body.description) : undefined,
            age: Number(body.age),
            occupation: String(body.occupation),
            image: String(body.image),
            gender: String(body.gender),
            traits: Array.isArray(body.traits) ? body.traits : undefined,
            mannerisms: Array.isArray(body.mannerisms) ? body.mannerisms : undefined,
            aiPrompt: body.aiPrompt ? String(body.aiPrompt) : undefined,
            whereabouts: Array.isArray(body.whereabouts) ? body.whereabouts : undefined,
        });

        return NextResponse.json({ suspect }, { status: 201 });
    } catch (error) {
        console.error("Failed to create suspect:", error);
        return NextResponse.json({ error: "Failed to create suspect" }, { status: 500 });
    }
}


