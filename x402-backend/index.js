import 'dotenv/config';
import express from "express";
import cors from "cors";
import { paymentMiddleware } from "x402-express";
import { createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy } from 'viem/chains';
// import { facilitator } from "@coinbase/x402"; // For mainnet

// Global process guards
process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED_REJECTION]', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT_EXCEPTION]', err);
});

const app = express();
app.use(cors());
app.use(express.json());

// Simple request logger
app.use((req, res, next) => {
    const started = Date.now();
    console.log(`[REQ] ${req.method} ${req.path} q=`, req.query, 'body=', req.body);
    res.on('finish', () => {
        console.log(`[RES] ${req.method} ${req.path} -> ${res.statusCode} in ${Date.now() - started}ms`);
    });
    next();
});

app.use(paymentMiddleware(
    process.env.SELLER_RECEIVE_ADDRESS || "0x5991fd6Ecc5634C4de497b47Eb0Aa0065fffb214",
    {
        "GET /entry": {
            price: process.env.ENTRY_PRICE_USD || "$0.01",
            network: "polygon-amoy",
            config: { description: "CrimeFiles entry fee" }
        },
        "POST /hints/unlock": {
            price: process.env.HINT_PRICE_USD || "$0.02",
            network: "polygon-amoy",
            config: { description: "Unlock a hint" }
        },
        "GET /verdict": {
            price: process.env.VERDICT_PRICE_USD || "$0.02",
            network: "polygon-amoy",
            config: { description: "Submit a verdict" }
        }
    },
    {
        url: process.env.FACILITATOR_URL || "https://x402.polygon.technology",
    }
));

// Implement protected routes
app.get("/entry", (req, res) => {
    // No body necessary; x402 middleware charges before reaching here
    console.log(`[ENTRY] caseId=${req.query.caseId}`);
    res.send({ ok: true, caseId: req.query.caseId || null });
});

app.post("/hints/unlock", (req, res) => {
    const { caseId, hintIndex } = req.body || {};
    console.log(`[HINT] caseId=${caseId} hintIndex=${hintIndex}`);
    res.send({ ok: true, caseId: caseId || null, hintIndex: hintIndex || null });
});

app.get("/verdict", (req, res) => {
    const { caseId, suspectId } = req.query || {};
    console.log(`[VERDICT] caseId=${caseId} suspectId=${suspectId}`);
    res.send({ ok: true, caseId: caseId || null, suspectId: suspectId || null });
});

// Demo route
app.get("/weather", (req, res) => {
    res.send({
        report: {
            weather: "sunny",
            temperature: 70,
        },
    });
});

// Health endpoint
app.get('/health', (req, res) => res.send({ ok: true }));

// Admin payout: transfer USDC from seller to winner
app.post('/admin/distribute', async (req, res) => {
    try {
        const { userAddress, share } = req.body || {};
        if (!userAddress || typeof share !== 'number') return res.status(400).json({ ok: false, error: 'userAddress and share required' });

        const pk = process.env.SELLER_PRIVATE_KEY;
        if (!pk) return res.status(500).json({ ok: false, error: 'SELLER_PRIVATE_KEY missing' });

        const account = privateKeyToAccount((pk.startsWith('0x') ? pk : `0x${pk}`));
        const client = createWalletClient({ account, chain: polygonAmoy, transport: http() });

        // Demo USDC on Amoy (address subject to change). Expect env var for safety.
        const usdc = process.env.AMOY_USDC_ADDRESS || '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582';
        const decimals = 6;
        const verdictPrice = parseFloat(process.env.VERDICT_PRICE_USD?.replace('$', '') || '0.02');
        const amount = Math.max(verdictPrice * share, 0);
        const value = parseUnits(amount.toFixed(decimals), decimals);

        // ERC20 transfer
        const txHash = await client.writeContract({
            address: usdc,
            abi: [
                { "type": "function", "name": "transfer", "stateMutability": "nonpayable", "inputs": [{ "name": "to", "type": "address" }, { "name": "value", "type": "uint256" }], "outputs": [{ "name": "", "type": "bool" }] }
            ],
            functionName: 'transfer',
            args: [userAddress, value]
        });

        return res.json({ ok: true, txHash });
    } catch (e) {
        console.error('[ADMIN_DISTRIBUTE_ERROR]', e);
        return res.status(500).json({ ok: false, error: e instanceof Error ? e.message : 'Internal error' });
    }
});

// Error handler (last)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, req, res, next) => {
    try {
        console.error('[ERROR_HANDLER]', err?.stack || err);
    } catch { }
    if (res.headersSent) return;
    res.status(500).json({ ok: false, error: 'Internal server error' });
});

app.listen(4021, () => {
    console.log(`Server listening at http://localhost:4021`);
}); 
