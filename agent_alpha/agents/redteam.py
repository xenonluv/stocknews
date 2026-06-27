"""적대적 검증(LLM) — 찌라시가 개미 유인 작전/허위 덫인가. → {redteam_flag, reason}.
찌라시 없거나 키 없으면 무플래그(False)."""
import config  # noqa: F401
import llm

SYS = (
    "당신은 주가조작·찌라시 펌프를 잡는 레드팀입니다. [찌라시]와 [정량]을 보고 '개미 유인 작전(덫)일 가능성'을 "
    "냉정히 평가하세요. '떡상/세력/지금사/풀매수' 류 + 펀더멘털 없는 급등 + 단기 과열은 위험 신호. "
    "반드시 JSON만: {\"redteam_flag\":true/false(작전 의심), \"reason\":\"한줄 근거\"}"
)


def review(row, rumors):
    rr = (rumors.get("board", []) + rumors.get("telegram", []))[:10]
    if not rr or not llm.available():
        return {"redteam_flag": False, "reason": ""}
    ctx = (f"[정량] {row.get('name')} {row.get('change_pct')}% · 2일회전율 {row.get('turnover_2d_pct')}% · "
           f"mover={row.get('mover_type')}\n[찌라시]\n" + "\n".join(f"- {t}" for t in rr))
    out = llm.call_json(SYS, ctx)
    if not isinstance(out, dict):
        return {"redteam_flag": False, "reason": ""}
    return {"redteam_flag": bool(out.get("redteam_flag")), "reason": str(out.get("reason") or "")[:160]}
