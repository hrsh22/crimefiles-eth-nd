import { NextRequest, NextResponse } from "next/server";
import { getOpenThreadWithMessages } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const parts = url.pathname.split("/");
    const caseId = decodeURIComponent(parts[3] || "");
    const suspectId = decodeURIComponent(parts[5] || "");
    const userAddress = String(url.searchParams.get("userAddress")).toLowerCase();

    try {
        if (!userAddress) {
            console.error("❌ No wallet address provided - wallet connection required");
            return NextResponse.json({ error: "Wallet connection required" }, { status: 401 });
        }

        const { thread, messages } = await getOpenThreadWithMessages({ userAddress, caseId, suspectId });

        if (!thread) {
            console.log(`❌ No open thread found for user:${userAddress} case:${caseId} suspect:${suspectId}`);
            return NextResponse.json({ thread: null, messages: [] });
        }

        console.log(`✅ Thread Retrieved: ${messages.length} messages`);
        return NextResponse.json({ thread, messages });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Internal error";
        console.error(`💥 Thread Retrieval Failed: ${message}`);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}


