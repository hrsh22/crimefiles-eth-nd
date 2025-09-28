import os
from typing import Any, Dict, List, Optional
from uagents import Agent, Context, Model
from .logic import analyze_interrogation
from .models import InterrogationPayload, CaseFile, Message, Lead as LeadModel, InterrogationResult

class InterrogationRequest(Model):
    case_file: Dict[str, Any]
    suspect_id: str
    messages: List[Dict[str, str]]
    assistant_reply: Optional[str] = None

class Lead(Model):
    title: str
    tags: List[str]
    justification: str

class InterrogationResponse(Model):
    leads: List[Lead]
    consistency: float

AGENT_NAME = os.getenv("ASA_UAGENT_NAME", "asa_orchestrator")
AGENT_SEED = os.getenv("ASA_UAGENT_SEED", "asa_orchestrator_dev_seed")

agent = Agent(name=AGENT_NAME, seed=AGENT_SEED)

@agent.on_message(model=InterrogationRequest)
async def on_interrogation(ctx: Context, sender: str, req: InterrogationRequest):
    try:
        payload = InterrogationPayload(
            caseFile=CaseFile(**req.case_file),
            suspectId=req.suspect_id,
            messages=[Message(**m) for m in req.messages],
            assistantReply=req.assistant_reply,
        )
        result: InterrogationResult = analyze_interrogation(payload)
        leads = [Lead(title=l.title, tags=l.tags, justification=l.justification) for l in result.leads]
        await ctx.send(sender, InterrogationResponse(leads=leads, consistency=result.consistency))
    except Exception as e:
        # In case of failure, return empty result instead of crashing
        await ctx.send(sender, InterrogationResponse(leads=[], consistency=0.0))

def run():
    agent.run()

if __name__ == "__main__":
    run()
