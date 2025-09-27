"use client";

import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";
import type { WalletClient } from "viem";

export function getSellerBaseUrl(): string {
    return process.env.NEXT_PUBLIC_X402_SELLER_BASE_URL || "http://localhost:4021";
}

export function getFacilitatorUrl(): string {
    return process.env.NEXT_PUBLIC_X402_FACILITATOR_URL || "https://x402.polygon.technology";
}

export function getFetchWithPayment(walletClient: WalletClient) {
    return wrapFetchWithPayment(fetch, walletClient);
}

function extractTxHash(paymentHeader: string | null): string | undefined {
    try {
        if (!paymentHeader) return undefined;
        const decoded: any = decodeXPaymentResponse(paymentHeader);
        // Try common shapes
        if (!decoded) return undefined;
        if (typeof decoded.txHash === "string") return decoded.txHash;
        if (decoded.tx?.hash) return decoded.tx.hash as string;
        if (Array.isArray(decoded.payments) && decoded.payments[0]?.txHash) return decoded.payments[0].txHash as string;
        if (Array.isArray(decoded.payments) && decoded.payments[0]?.tx?.hash) return decoded.payments[0].tx.hash as string;
        return undefined;
    } catch {
        return undefined;
    }
}

export async function payEntry(walletClient: WalletClient, caseId: string) {
    const fetchWithPayment = getFetchWithPayment(walletClient);
    const url = `${getSellerBaseUrl()}/entry?caseId=${encodeURIComponent(caseId)}`;
    const res = await fetchWithPayment(url, { method: "GET" });
    const header = res.headers.get("x-payment-response");
    const txHash = extractTxHash(header);
    return { ok: res.ok, txHash };
}

export async function payHintUnlock(walletClient: WalletClient, caseId: string, hintIndex: number) {
    const fetchWithPayment = getFetchWithPayment(walletClient);
    const url = `${getSellerBaseUrl()}/hints/unlock`;
    const res = await fetchWithPayment(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caseId, hintIndex }) });
    const header = res.headers.get("x-payment-response");
    const txHash = extractTxHash(header);
    return { ok: res.ok, txHash };
}

export async function payVerdict(walletClient: WalletClient, caseId: string, suspectId: string) {
    const fetchWithPayment = getFetchWithPayment(walletClient);
    const url = `${getSellerBaseUrl()}/verdict?caseId=${encodeURIComponent(caseId)}&suspectId=${encodeURIComponent(suspectId)}`;
    const res = await fetchWithPayment(url, { method: "GET" });
    const header = res.headers.get("x-payment-response");
    const txHash = extractTxHash(header);
    return { ok: res.ok, txHash };
}


