from typing import List, Dict, Any
from .models import InterrogationPayload, InterrogationResult, Lead
from .engine_metta import MettaEngine, MettaNotAvailable


def simple_claim_extraction(messages: List[Dict[str, str]]) -> Dict[str, Any]:
    user_texts = [m["content"] for m in messages if m.get("role") == "user"]
    full = "\n".join(user_texts).lower()
    claims = {
        "mentions_time": any(t in full for t in ["am", "pm", ":", "hour", "time"]),
        "mentions_location": any(k in full for k in ["room", "hall", "kitchen", "restaurant", "corridor"]),
        "mentions_weapon": any(w in full for w in ["knife", "opener", "gun", "weapon", "letter opener"]),
        "mentions_alibi": any(a in full for a in ["alibi", "home", "dinner", "meeting", "witness"]) ,
    }
    return {"claims": claims}


def metta_like_reasoning(case_file: Dict[str, Any], suspect_id: str, claims: Dict[str, Any]) -> Dict[str, Any]:
    leads: List[Lead] = []
    score = 0.6

    # toy heuristics that mimic rule hits
    if claims.get("mentions_time") and claims.get("mentions_location"):
        leads.append(Lead(title="Check corridor camera near time of death", tags=["Witness", "Opportunity"], justification="User referenced a time and a location; cross-verify with available evidence."))
        score += 0.1

    if claims.get("mentions_weapon"):
        leads.append(Lead(title="Verify letter opener provenance", tags=["Means"], justification="Weapon provenance link could strengthen or dismiss suspicion."))
        score += 0.1

    if claims.get("mentions_alibi"):
        leads.append(Lead(title="Validate suspect alibi with independent witness", tags=["Witness"], justification="Alibi requires third-party corroboration."))
        score += 0.05

    score = max(0.0, min(1.0, score))
    return {"leads": leads, "consistency": score}


def analyze_interrogation(payload: InterrogationPayload) -> InterrogationResult:
    # Try Metta first if available
    try:
        with open("app/rules/leads.metta", "r", encoding="utf-8") as f:
            rules = f.read()
        engine = MettaEngine(rules)
        leads, score = engine.run_reasoning(payload.dict())
        # Convert to models
        lead_models = [Lead(title=l["title"], tags=l.get("tags", []), justification=l.get("justification", "")) for l in leads]
        return InterrogationResult(leads=lead_models, consistency=score)
    except MettaNotAvailable:
        pass
    except Exception:
        # fall back to heuristics on any engine/rule error
        pass

    # Fallback heuristic
    claims = simple_claim_extraction([m.dict() for m in payload.messages])
    res = metta_like_reasoning(payload.caseFile.dict(), payload.suspectId, claims.get("claims", {}))
    return InterrogationResult(leads=res["leads"], consistency=res["consistency"]) 


