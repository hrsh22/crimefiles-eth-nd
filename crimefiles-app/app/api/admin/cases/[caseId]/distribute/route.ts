import { NextRequest, NextResponse } from "next/server";
import { getCaseById, listVerdictsByCase, resetCaseProgress, createDistribution, addDistributionPayout } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
    try {
        const { caseId } = await params;
        const dbCase = getCaseById(caseId);
        if (!dbCase) return NextResponse.json({ error: "Case not found" }, { status: 404 });
        const solution = dbCase.solution_suspect_id;
        if (!solution) return NextResponse.json({ error: "Solution not set" }, { status: 400 });

        const verdicts = listVerdictsByCase(caseId);

        // Winners and losers
        const winners = verdicts.filter(v => v.suspect_id === solution);

        // Compute pool (sum of seller-configured verdict price times count). For demo, use count only.
        // const poolCount = verdicts.length;
        const perWinnerShare = winners.length > 0 ? (1 / winners.length) : 0; // share by count; seller will use configured amount per winner request

        // Call x402 seller to execute payouts per winner (client-to-seller call server-side)
        const sellerBase = process.env.NEXT_PUBLIC_X402_SELLER_BASE_URL || "http://localhost:4021";
        const facilitator = process.env.NEXT_PUBLIC_X402_FACILITATOR_URL || "https://x402.polygon.technology";

        console.log('Creating distribution');
        const distribution = createDistribution(caseId);
        const results: Array<{ address: string; ok: boolean; txHash?: string }> = [];
        if (winners.length > 0) {
            for (const w of winners) {
                // POST to seller admin payout route
                const rsp = await fetch(`${sellerBase}/admin/distribute`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ caseId, userAddress: w.user_address, share: perWinnerShare, facilitator })
                });
                let txHash: string | undefined;
                try {
                    const json = await rsp.json();
                    txHash = json?.txHash;
                } catch { }
                addDistributionPayout({ distributionId: distribution.id, userAddress: w.user_address, amountUsd: undefined, txHash });
                results.push({ address: w.user_address, ok: rsp.ok, txHash });
            }
        }

        // After distribution, reset progress for the case
        console.log('Resetting case progress');
        resetCaseProgress(caseId);

        return NextResponse.json({ distributed: results.length, results });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Internal error';
        console.error('Distribution failed:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}


