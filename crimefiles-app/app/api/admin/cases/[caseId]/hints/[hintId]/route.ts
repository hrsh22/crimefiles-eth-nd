import { NextRequest, NextResponse } from "next/server";
import { updateHint, deleteHint } from "@/lib/db";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ caseId: string; hintId: string }> }) {
    try {
        const { hintId } = await params;
        const body = await req.json();
        const hintText = String(body.hintText || "").trim();
        if (!hintText) return NextResponse.json({ error: "hintText is required" }, { status: 400 });

        const updated = updateHint(hintId, hintText);
        if (!updated) return NextResponse.json({ error: "Hint not found" }, { status: 404 });
        return NextResponse.json({ hint: updated });
    } catch (error) {
        console.error("Failed to update hint:", error);
        return NextResponse.json({ error: "Failed to update hint" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ caseId: string; hintId: string }> }) {
    try {
        const { hintId } = await params;
        const ok = deleteHint(hintId);
        if (!ok) return NextResponse.json({ error: "Hint not found" }, { status: 404 });
        return NextResponse.json({ message: "Hint deleted" });
    } catch (error) {
        console.error("Failed to delete hint:", error);
        return NextResponse.json({ error: "Failed to delete hint" }, { status: 500 });
    }
}


