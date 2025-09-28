# CrimeFiles (ETHGlobal New Delhi)

Detective gameplay where you interrogate suspects, pay to unlock hints, and deduce the culprit.

## Monorepo Structure

- `crimefiles-app/` — Next.js app (frontend + API routes)
- `asa-agents/` — Python service (FastAPI + uAgents + Metta) generates Leads/Consistency with Artificial Superintelligence Alliance
- `x402-backend/` — Seller service for x402 micropayments (Polygon)

## Quick Start

### Prereqs
- Node 18+
- Python 3.10+
- Wallet (MetaMask/WalletConnect)

### 1) Start ASA Agents (reasoning service)
```bash
cd asa-agents
python3 -m venv .venv && source .venv/bin/activate
pip install --upgrade pip && pip install -r requirements.txt
# optional: pip install hyperon
python -m app
# http://127.0.0.1:7070
```

### 2) Start Next.js app
```bash
cd crimefiles-app
npm install
export ASI_ONE_BASE_URL=https://asi1.ai
export ASI_ONE_API_KEY=YOUR_KEY
export ASA_AGENTS_URL=http://127.0.0.1:7070
npm run dev
```

### 3) Start x402 Seller backend
```bash
cd x402-backend
npm install
npm start
# Configure SELLER_RECEIVE_ADDRESS, FACILITATOR_URL, prices, etc.
```

## Key Features
- Interrogate suspects (ASI LLM) with real chat history
- Unlock hints and submit verdicts (x402 micropayments on Polygon)
- ASA Agents generate Leads and a Consistency score; leads persist into Timeline
- Admin panel to manage cases, suspects, hints, and distributions

## Folders

### crimefiles-app/
- `app/` — Next.js app router pages and API routes
  - `case-files/` — list and detail pages
  - `api/` — threads, messages, admin, user progress
- `components/` — UI components (e.g., `VerifyModal`)
- `lib/` — db, providers, x402 client
- `migrations/` — SQLite schema and seeds
- `types/` — TypeScript types
- Run:
  ```bash
  cd crimefiles-app
  npm install
  npm run dev
  # build: npm run build
  ```

### asa-agents/
- `app/main.py` — FastAPI app (auto‑starts uAgents orchestrator)
- `app/agent_orchestrator.py` — uAgents agent
- `app/engine_metta.py` — Metta engine wrapper
- `app/rules/leads.metta` — rules for leads/consistency
- Run:
  ```bash
  cd asa-agents
  python3 -m venv .venv && source .venv/bin/activate
  pip install --upgrade pip && pip install -r requirements.txt
  # optional: pip install hyperon
  python -m app
  ```

### x402-backend/
- `index.js` — example seller server
- Run:
  ```bash
  cd x402-backend
  npm install
  npm start
  ```

## Environment Variables (selected)
- Next.js:
  - `ASI_ONE_BASE_URL`, `ASI_ONE_API_KEY` — ASI LLM
  - `ASA_AGENTS_URL` — ASA service URL (default `http://127.0.0.1:7070`)
  - `NEXT_PUBLIC_X402_SELLER_BASE_URL`, `NEXT_PUBLIC_X402_FACILITATOR_URL` — x402
  - `NEXT_PUBLIC_SELF_*` — Self Protocol config
- ASA Agents:
  - `ASA_UAGENT_NAME`, `ASA_UAGENT_SEED` (optional)

## Build & Verify
```bash
# Next app
cd crimefiles-app && npm run build

# ASA agents
cd ../asa-agents && source .venv/bin/activate && python -m app
```

## Notes
- Leads persist to the Timeline under the “Leads” lane.
- Wallet connection and Self verification gate access; “Skip to Game” link is available for demo.
