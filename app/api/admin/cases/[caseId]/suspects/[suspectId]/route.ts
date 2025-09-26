import { NextRequest, NextResponse } from "next/server";
import { updateSuspect, deleteSuspect } from "@/lib/db";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ caseId: string; suspectId: string }> }) {
    try {
        const { suspectId } = await params;
        const body = await req.json();
        const updated = updateSuspect(suspectId, body);
        if (!updated) return NextResponse.json({ error: "Suspect not found" }, { status: 404 });
        return NextResponse.json({ suspect: updated });
    } catch (error) {
        console.error("Failed to update suspect:", error);
        return NextResponse.json({ error: "Failed to update suspect" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ caseId: string; suspectId: string }> }) {
    try {
        const { suspectId } = await params;
        const ok = deleteSuspect(suspectId);
        if (!ok) return NextResponse.json({ error: "Suspect not found" }, { status: 404 });
        return NextResponse.json({ message: "Suspect deleted" });
    } catch (error) {
        console.error("Failed to delete suspect:", error);
        return NextResponse.json({ error: "Failed to delete suspect" }, { status: 500 });
    }
}


