import threading
from fastapi import FastAPI
import orjson

from .logic import analyze_interrogation
from .models import InterrogationPayload, InterrogationResult

app = FastAPI(title="ASA Agents Service")

@app.post("/interrogate", response_model=InterrogationResult)
def interrogate(payload: InterrogationPayload):
    result = analyze_interrogation(payload)
    return result


@app.on_event("startup")
def start_uagent_automatically():
    try:
        from .agent_orchestrator import agent as orchestrator_agent
    except Exception:
        return

    def _run_agent():
        try:
            orchestrator_agent.run()
        except Exception:
            pass

    t = threading.Thread(target=_run_agent, daemon=True)
    t.start()
    app.state.uagent_thread = t
