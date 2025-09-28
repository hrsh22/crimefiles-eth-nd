# ASA Agents Service (FastAPI + uAgents)

Overview
- A microservice that accepts interrogation context and returns lead suggestions and a consistency score.
- Metta integration: loads rules from `app/rules/leads.metta` via Hyperon's MeTTa engine if installed, otherwise falls back to heuristics.

Endpoints
- POST /interrogate
  - Input: { caseFile, suspectId, messages, assistantReply? }
  - Output: { leads: Array<{ title, tags[], justification }>, consistency: number }

Quick start
1. Create a Python venv
   - python3 -m venv .venv && source .venv/bin/activate
2. Install deps (without Metta)
   - pip install --upgrade pip && pip install -r requirements.txt
3. Install Hyperon/MeTTa for real reasoning
   - pip install hyperon
4. Run server (single standard command)
   - python -m app

uAgents orchestrator
- Starts automatically with the server; no extra flags required.
- Env (optional): ASA_UAGENT_NAME, ASA_UAGENT_SEED to customize identity.

Environment
- NEXT app reads ASA_AGENTS_URL (default http://127.0.0.1:7070)
