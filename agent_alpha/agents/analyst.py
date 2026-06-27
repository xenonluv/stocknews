"""1차 판단(LLM) — 정량행 + 뉴스 + 찌라시 근거로 catalyst·진위·지속성·조작위험·prob_up·confidence.
찌라시는 미확인 루머(사실 단정 금지). 키 없으면 None(수집기 무영향)."""
import os
import config  # noqa: F401
import llm

SYS = (
    "당신은 한국 주식 단기 모멘텀 분석가입니다. 주어진 [정량][뉴스][찌라시]만 근거로 이 종목이 '왜' 움직이는지와 "
    "익일 방향을 판단하세요. 찌라시(토론방·텔레그램)는 미확인 루머이니 사실로 단정 금지(작전 경계). "
    "유통회전율 역대급+직전 폭발이어도 '고회전=상승'은 아님(반증됨) — 수급·재료·차트를 종합하라. "
    "반드시 아래 JSON만 출력:\n"
    '{"catalyst":"한줄 왜 움직이나","real_likelihood":0~1(실재료>테마편승>찌라시펌프),'
    '"sustainability":0~1,"manipulation_risk":0~1,"prob_up":0~1(익일 상승확률),'
    '"confidence":0~1,"evidence":["근거(원문 발췌 또는 정량 수치)"]}'
)


def _ctx(row, news_list, rumors):
    L = [
        f"[정량] {row.get('name')}({row.get('code')}) {row.get('change_pct')}% "
        f"{'음봉' if row.get('is_eumbong') else '양봉'} (mover={row.get('mover_type')})",
        f"2일유통회전율 {row.get('turnover_2d_pct')}% · 종가강도(받힘) {row.get('close_strength')} · "
        f"14:30스파크 {row.get('spark_1430_count')}",
        f"외인 {row.get('frgn_net')} 기관 {row.get('orgn_net')} 개인 {row.get('prsn_net')} · "
        f"키움집중 {row.get('kiwoom_buy_concentration')} · 외국계순매수 {row.get('glob_net_qty')}",
        f"시장 코스피 {row.get('kospi_chg')}% 코스닥 {row.get('kosdaq_chg')}%",
    ]
    if news_list:
        L.append("[뉴스]\n" + "\n".join(f"- {t}" for t in news_list[:8]))
    rr = (rumors.get("board", []) + rumors.get("telegram", []))[:10]
    if rr:
        L.append("[찌라시(미확인)]\n" + "\n".join(f"- {t}" for t in rr))
    return "\n".join(L)


def _p01(v):
    try:
        f = float(v)
        return round(f, 3) if 0.0 <= f <= 1.0 else None
    except Exception:
        return None


def analyze(row, news_list, rumors):
    if not llm.available():
        return None
    out = llm.call_json(SYS, _ctx(row, news_list, rumors))
    if not isinstance(out, dict):
        return None
    return {
        "catalyst": str(out.get("catalyst") or "")[:200],
        "real_likelihood": _p01(out.get("real_likelihood")),
        "sustainability": _p01(out.get("sustainability")),
        "manipulation_risk": _p01(out.get("manipulation_risk")),
        "prob_up": _p01(out.get("prob_up")),
        "confidence": _p01(out.get("confidence")),
        "evidence": [str(x)[:160] for x in (out.get("evidence") or [])][:6],
        "llm_model": os.environ.get("MOONSHOT_MODEL", "kimi-k2.6"),
    }
