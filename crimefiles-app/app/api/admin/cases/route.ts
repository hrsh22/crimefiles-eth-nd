import { NextRequest, NextResponse } from "next/server";
import { createCase, deleteCase } from "@/lib/db";
import { getAllCasesFromDb } from "@/lib/case-helpers";

export const runtime = "nodejs";

export async function GET() {
    try {
        const cases = await getAllCasesFromDb();
        return NextResponse.json({ cases });
    } catch (error) {
        console.error("Failed to fetch cases:", error);
        return NextResponse.json({ error: "Failed to fetch cases" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, excerpt, story } = body;

        if (!title || !excerpt || !story) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newCase = await createCase({ title, excerpt, story });
        return NextResponse.json({ case: newCase }, { status: 201 });
    } catch (error) {
        console.error("Failed to create case:", error);
        return NextResponse.json({ error: "Failed to create case" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const caseId = url.searchParams.get("id");

        if (!caseId) {
            return NextResponse.json({ error: "Case ID required" }, { status: 400 });
        }

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
