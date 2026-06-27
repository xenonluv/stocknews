"""거래원(증권사 창구) 조회 — 코어 kis_client에 없는 단 1개 TR(FHKST01010600)을 _call로 추가.
읽기전용. 매수/매도 상위 5창구 + 키움 집중도 + 외국계 순매수. (당일 스냅샷만 — 과거 조회 불가.)
한계: KRX 상위 5창구만 공개·창구≠주체·EOD 잠정. 약신호로만 사용.
"""
import config  # noqa: F401 — 경로 부트스트랩
import kis_client as kis


def inquire_member(code, market="J"):
    """{top_buyers[], top_sellers[], kiwoom_buy_concentration, kiwoom_is_top_buyer, glob_net_qty, glob_buy_rlim} | None.
    실패·결측은 None/0.0으로 흡수(수집기를 막지 않음)."""
    try:
        res = kis._call("/uapi/domestic-stock/v1/quotations/inquire-member",
                        "FHKST01010600",
                        {"FID_COND_MRKT_DIV_CODE": market, "FID_INPUT_ISCD": code})
    except Exception:
        return None
    o = res.get("output")
    if isinstance(o, list):
        o = o[0] if o else {}
    o = o or {}

    def _rows(side):
        rows = []
        for i in range(1, 6):
            nm = (o.get(f"{side}_mbcr_name{i}") or "").strip()
            if not nm:
                continue
            rows.append({"name": nm,
                         "qty": kis._f(o.get(f"total_{side}_qty{i}")),
                         "rlim": kis._f(o.get(f"{side}_mbcr_rlim{i}")),  # 회원사 비중(%)
                         "glob": (o.get(f"{side}_mbcr_glob_yn_{i}") or "").strip() == "Y"})
        return rows

    buy, sell = _rows("shnu"), _rows("seln")
    kiwoom = next((b for b in buy if "키움" in b["name"]), None)
    return {
        "top_buyers": buy,
        "top_sellers": sell,
        "kiwoom_buy_concentration": round((kiwoom["rlim"] or 0) / 100, 4) if kiwoom else 0.0,
        "kiwoom_is_top_buyer": bool(buy and "키움" in buy[0]["name"]),
        "glob_net_qty": kis._f(o.get("glob_ntby_qty")),
        "glob_buy_rlim": round(kis._f(o.get("glob_shnu_rlim")) / 100, 4),
    }


if __name__ == "__main__":
    import sys, json
    for c in sys.argv[1:] or ["005930"]:
        print(c, json.dumps(inquire_member(c), ensure_ascii=False))
