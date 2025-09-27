# 🤝 CrimeFiles Partners

Simple documentation of why and where each partner is used.

---

## 🤖 ASI (Artificial Superintelligence)

**Why Used:**
- Provides AI responses for suspects in conversations
- Handles character consistency and contextual awareness
- Fast, reliable LLM API with good token efficiency

**Where Used:**
- `/lib/providers/providers_internal/asiOne.ts` - Core LLM provider
- `/app/api/cases/[caseId]/suspects/[suspectId]/messages/route.ts` - Chat message processing
- `/lib/prompts.ts` - System prompt generation for suspect personalities

---

## 💾 SQLite Database

**Why Used:**
- Simple, reliable local storage for chat history
- No external dependencies needed for development
- Fast read/write operations for conversation threads

**Where Used:**
- `/lib/db.ts` - Database operations and schema
- `/app/api/cases/[caseId]/suspects/[suspectId]/thread/route.ts` - Thread management
- `/app/api/cases/[caseId]/suspects/[suspectId]/messages/route.ts` - Message persistence

---

## ⛓️ RainbowKit + Wagmi (Wallet)

**Why Used:**
- Professional wallet connection UI
- Supports multiple wallet types (MetaMask, WalletConnect, etc.)
- Built-in network switching and error handling

**Where Used:**
- `/app/wallet.tsx` - Main wallet connection page
- `/app/case-files/page.tsx` - Case files index (requires wallet)
- `/app/case-files/[id]/page.tsx` - Case detail page (requires wallet)
- `/components/walletConnect.tsx` - Reusable wallet connection component

---

## 🪪 Self Protocol (Age, Sanctions, Country Gating)

**Why Used:**
- Enforces compliance gates before gameplay: age ≥ 18, global OFAC screening, and Pakistan block
- Bot/Sybil resistance signal via verified user flow
- Smooth UX: uses connected wallet address as `userId`; judges can “Skip to Game”

**Where Used:**
- `/components/VerifyModal.tsx` – Frontend QR flow using `SelfAppBuilder` + `SelfQRcodeWrapper` (from `@selfxyz/qrcode`); builds with `userId` = connected wallet, `userIdType` = `hex`, and `endpointType` = `https`/`staging_https`
- `/app/api/verify/route.ts` – Backend verification via `SelfBackendVerifier` (from `@selfxyz/core`); sets a short‑lived `cf_verified` cookie on success

**Config & Disclosures:**
- Env: `NEXT_PUBLIC_SELF_VERIFY_SERVICE`, `NEXT_PUBLIC_SELF_APP_NAME`, `NEXT_PUBLIC_SELF_SCOPE`
- Disclosures (must match FE/BE): `minimumAge: 18`, `excludedCountries: [PAKISTAN]`, `ofac: true`
- UX: Home CTA shows “Connect Wallet” until connected, then “Inspect the Files” opens verification modal. Modal includes a "Skip to Game" link for demo/judges.

---

## 🔮 Future Partners

**IPFS/Filecoin** - For decentralized file storage
**Voice AI** - For text-to-speech suspect responses
**Analytics** - For user behavior and conversation insights

---

*Last Updated: September 2025*

---

## 🟣 Polygon + x402 (Micropayments)

**Why Used:**
- Trust-minimized micropayments for game actions (entry fee, hint unlocks, verdict submission)
- Client-side signing (no user private keys on server) with seamless paywall via x402
- Simple seller middleware for pricing and network config; easy admin payouts for demo

**Where Used:**
- Seller (Express, separate service)
  - `x402-backend/seller.js` – x402 paywalls and admin payout
    - Protected endpoints via `x402-express` on Polygon Amoy:
      - `GET /entry` – entry fee
      - `POST /hints/unlock` – unlock next hint
      - `GET /verdict` – submit verdict fee
    - Admin payout for demo distribution:
      - `POST /admin/distribute` – transfers USDC from seller to winner
    - Env: `SELLER_RECEIVE_ADDRESS`, `FACILITATOR_URL`, `ENTRY_PRICE_USD`, `HINT_PRICE_USD`, `VERDICT_PRICE_USD`, `SELLER_PRIVATE_KEY`, `AMOY_USDC_ADDRESS`

- Frontend (Next.js)
  - `lib/x402.ts` – browser client using `x402-fetch` + Wagmi wallet client
    - Wraps fetch to automatically handle x402 payments using the connected wallet
    - Calls seller base URL (env: `NEXT_PUBLIC_X402_SELLER_BASE_URL`) and facilitator (env: `NEXT_PUBLIC_X402_FACILITATOR_URL`)
  - Game APIs (Next.js routes) – persist and hydrate progress:
    - Entry: `GET /api/user/cases/[caseId]/entry/status`, `POST /api/user/cases/[caseId]/entry/confirm`
    - Hints: `GET /api/user/cases/[caseId]/hints/unlocks`, `POST /api/user/cases/[caseId]/hints/unlock`
    - Verdict: `GET|POST /api/user/cases/[caseId]/verdict`
    - Distribution (admin): `POST /api/admin/cases/[caseId]/distribute`, `GET /api/admin/cases/[caseId]/distribute/latest`
  - UI wiring
    - `app/case-files/[id]/page.tsx` – entry modal paywall, unlock next hint, accuse (verdict); TanStack Query for hydration
    - `app/admin/page.tsx` – reveal & distribute, last distribution panel, back-to-app link

  - Timelocked Reveal (Blocklock)
    - Contracts added under `contracts/` to enable 7‑day case timelocks and automatic killer reveal
      - `contracts/BlocklockReceiver.sol` – receives decryption key post‑timelock to reveal outcome
      - `contracts/contracts.ts` – addresses/ABI for client wiring
    - Status: not integrated in the live demo to show complete flow in the demo, included for architecture completeness but will integrated in future before the product launch.

**Networks & Caching:**
- Chain: Polygon Amoy (testnet) via x402 facilitator (`https://x402.polygon.technology` by default)
- Client fetches set `Cache-Control: no-store` on user progress APIs to avoid stale UI; Admin clears TanStack caches after distribution

**Packages:**
- `x402-express` (seller paywalls)
- `x402-fetch` (client-side signed payments)
- `viem` (admin USDC transfer in seller for demo payouts)
