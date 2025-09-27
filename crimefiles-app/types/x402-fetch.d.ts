declare module 'x402-fetch' {
    import type { WalletClient } from 'viem';
    export function wrapFetchWithPayment(fetchFn: typeof fetch, walletClient: WalletClient): typeof fetch;
    export function decodeXPaymentResponse(header: string | null): any;
}


