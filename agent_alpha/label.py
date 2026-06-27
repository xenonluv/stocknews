"""익일 라벨 — forward/{date}.json(date<오늘)의 미라벨 행에 익일 종가/등락/hit 채움.
그 후 forward_samples.jsonl(평탄 플랫)을 전체 재생성. radar_backtest 식: hit=익일종가>신호종가, 정지봉 close==0 스킵.
"""
import json
import os
import glob
import config
import kis_client as kis


def _next_bar(code, signal_date):
    """signal_date 다음 '완성된' 거래일 일봉(J 공식) | None. 정지봉(close==0) 제외.
    ⚠ 오늘(today) 봉은 장중 미완성 가격이라 제외 — 신호일<봉날짜<오늘 인 첫 봉만(미완성 라벨 오염 방지).
    윈도 20거래일(과거 미라벨 행도 정확한 익일봉을 찾도록)."""
    today = config.today_yyyymmdd()
    try:
        d = kis.daily_prices(code, days=20, market="J")
    except Exception:
        return None
    after = [x for x in d if x.get("date") and signal_date < x["date"] < today and (x.get("close") or 0) > 0]
    return after[0] if after else None


def run():
    config.ensure_dirs()
    today = config.today_yyyymmdd()
    changed = 0
    for fp in sorted(glob.glob(os.path.join(config.FORWARD_DIR, "*.json"))):
        try:
            day = json.load(open(fp, encoding="utf-8"))
        except Exception:
            continue
        if day.get("date", "") >= today:
            continue  # 오늘분은 익일봉 아직 없음
        rows = day.get("rows", {})
        dirty = False
        for code, r in rows.items():
            if r.get("labeled"):
                continue
            sig = r.get("close")
            if not sig:
                r["labeled"] = True
                r["label_basis"] = "no_signal_close"
                dirty = True
                continue
            nb = _next_bar(code, r["date"])
            if not nb:
                continue  # 익일봉 아직(주말/공휴일) — 다음 실행에 재시도
            r.update({"labeled": True, "next_date": nb["date"], "next_close": nb["close"],
                      "next_open": nb.get("open"),
                      "next_high_pct": round((nb["high"] / sig - 1) * 100, 2) if nb.get("high") else None,
                      "hit": nb["close"] > sig,
                      "next_return_pct": round((nb["close"] / sig - 1) * 100, 2),
                      "label_basis": "kis_daily_J"})
            dirty = True
            changed += 1
        if dirty:
            tmp = fp + ".tmp"
            json.dump(day, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
            os.replace(tmp, fp)

    # forward_samples.jsonl 전체 재생성(평탄)
    allrows = []
    for fp in sorted(glob.glob(os.path.join(config.FORWARD_DIR, "*.json"))):
        try:
            day = json.load(open(fp, encoding="utf-8"))
        except Exception:
            continue
        allrows.extend(day.get("rows", {}).values())
    tmp = config.FORWARD_JSONL + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        for r in allrows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    os.replace(tmp, config.FORWARD_JSONL)
    print(f"[alpha-label] 라벨 {changed}행 갱신 · 총 {len(allrows)}행 평탄화 → {config.FORWARD_JSONL}")
    return changed


if __name__ == "__main__":
    run()
