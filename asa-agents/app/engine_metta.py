from typing import Any, Dict, List, Tuple

class MettaNotAvailable(Exception):
    pass

def _import_metta():
    try:
        from hyperon import MeTTa  # type: ignore
        return MeTTa
    except Exception as exc:  # pragma: no cover
        raise MettaNotAvailable(str(exc))


def _escape(s: str) -> str:
    return s.replace('"', '\\"')


def _bool(b: bool) -> str:
    return "true" if b else "false"


class MettaEngine:
    def __init__(self, rules_text: str) -> None:
        MeTTa = _import_metta()
        self.metta = MeTTa()
        # Load rules program first
        self.metta.run(rules_text)

    def build_facts(self, payload: Dict[str, Any]) -> str:
        case_file = payload["caseFile"]
        suspect_id = payload["suspectId"]
        messages = payload.get("messages", [])
        claims = payload.get("claims") or {}

        facts: List[str] = []

        # Case hints
        for h in case_file.get("hints", [])[:20]:
            facts.append(f'(hint "{_escape(str(h))}")')

        # Suspects as entities
        for s in case_file.get("suspects", [])[:10]:
            sid = s.get("id") or s.get("name", "suspect")
            facts.append(f'(suspect "{_escape(str(sid))}")')
            if s.get("gender"):
                facts.append(f'(gender "{_escape(str(sid))}" "{_escape(str(s.get("gender")))}")')
            if s.get("occupation"):
                facts.append(f'(occupation "{_escape(str(sid))}" "{_escape(str(s.get("occupation")))}")')

        # Conversation-derived claims (rules fallback) and explicit claims (preferred)
        if isinstance(claims, dict):
            if claims.get("mentions_time"): facts.append(f'(mentions-time "{_escape(suspect_id)}")')
            if claims.get("mentions_location"): facts.append(f'(mentions-location "{_escape(suspect_id)}")')
            if claims.get("mentions_weapon"): facts.append(f'(mentions-weapon "{_escape(suspect_id)}")')
            if claims.get("mentions_alibi"): facts.append(f'(mentions-alibi "{_escape(suspect_id)}")')

        # Heuristic extraction as backup
        for m in messages[-12:]:
            role = str(m.get("role"))
            content = str(m.get("content", ""))
            if any(k in content.lower() for k in ["opener", "knife", "weapon"]):
                facts.append(f'(mentions-weapon "{_escape(suspect_id)}")')
            if any(k in content.lower() for k in ["pm", "am", ":", "time", "tonight", "yesterday"]):
                facts.append(f'(mentions-time "{_escape(suspect_id)}")')
            if any(k in content.lower() for k in ["corridor", "room", "restaurant", "kitchen", "hall"]):
                facts.append(f'(mentions-location "{_escape(suspect_id)}")')
            if any(k in content.lower() for k in ["alibi", "witness", "home", "dinner", "meeting"]):
                facts.append(f'(mentions-alibi "{_escape(suspect_id)}")')

        program = "\n".join(facts)
        return program

    def run_reasoning(self, payload: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], float]:
        # Build facts and run them alongside rules
        facts_program = self.build_facts(payload)
        if facts_program:
            self.metta.run(facts_program)

        # Query for suggested leads
        leads_resp = self.metta.run('(!lead ?title ?tag1 ?tag2)')
        leads: List[Dict[str, Any]] = []
        for item in leads_resp:
            # Each item is a list/sexpr; convert to strings
            try:
                title = str(item[0]) if item else "Investigate inconsistency"
                tag1 = str(item[1]) if len(item) > 1 else "Solution"
                tag2 = str(item[2]) if len(item) > 2 else ""
                tags = [t for t in [tag1, tag2, "Solution"] if t]
                leads.append({
                    "title": title,
                    "tags": tags,
                    "justification": "Derived from rule matches over conversation and evidence",
                })
            except Exception:
                continue

        # Query for consistency score (0..1)
        score_resp = self.metta.run('(!consistency ?s)')
        score = 0.6
        if score_resp and score_resp[0]:
            try:
                score = float(str(score_resp[0][0]))
            except Exception:
                pass

        score = max(0.0, min(1.0, score))
        return leads, score
