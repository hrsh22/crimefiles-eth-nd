import 'dotenv/config';
import express from "express";
import cors from "cors";
import { paymentMiddleware } from "x402-express";
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
        },
        // Keep demo route if needed
        "GET /weather": {
            price: "$0.001",
            network: "polygon-amoy",
            config: { description: "Get current weather data for any location" }
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
