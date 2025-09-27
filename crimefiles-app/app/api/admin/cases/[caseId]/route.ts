import { NextRequest, NextResponse } from "next/server";
import { updateCase, deleteCase, setCaseSolution } from "@/lib/db";
import { getCaseFromDb } from "@/lib/case-helpers";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
    try {
        const { caseId } = await params;
        const caseData = await getCaseFromDb(caseId);

        if (!caseData) {
            return NextResponse.json({ error: "Case not found" }, { status: 404 });
        }

        return NextResponse.json({ case: caseData });
    } catch (error) {
        console.error("Failed to fetch case:", error);
        return NextResponse.json({ error: "Failed to fetch case" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
    try {
        const { caseId } = await params;
        const body = await req.json();
        const { title, excerpt, story, solution_suspect_id } = body;

        if (solution_suspect_id !== undefined) {
            const updated = await setCaseSolution(caseId, solution_suspect_id || null);
            if (!updated) return NextResponse.json({ error: "Case not found" }, { status: 404 });
            return NextResponse.json({ case: updated });
        }

        const updatedCase = await updateCase(caseId, { title, excerpt, story });

        if (!updatedCase) {
            return NextResponse.json({ error: "Case not found" }, { status: 404 });
        }

        return NextResponse.json({ case: updatedCase });
    } catch (error) {
        console.error("Failed to update case:", error);
        return NextResponse.json({ error: "Failed to update case" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
    try {
        const { caseId } = await params;
        const success = await deleteCase(caseId);

        if (!success) {
            return NextResponse.json({ error: "Case not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Case deleted successfully" });
    } catch (error) {
        console.error("Failed to delete case:", error);
        return NextResponse.json({ error: "Failed to delete case" }, { status: 500 });
    }
}


