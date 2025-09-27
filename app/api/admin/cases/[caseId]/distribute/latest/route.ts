import { NextRequest, NextResponse } from "next/server";
import { getLatestDistribution } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
    try {
        const { caseId } = await params;
        const { distribution, payouts } = getLatestDistribution(caseId);
        return NextResponse.json({ distribution, payouts });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Internal error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}


