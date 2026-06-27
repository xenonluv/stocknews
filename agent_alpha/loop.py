"""장중 빠른 루프 — movers에 뉴스+찌라시 수집 → analyst+redteam → judgments/{date}.json (+ 고신뢰 텔레그램).
collect.py(EOD)가 이 judgments를 정량행에 결합한다. --dry-run = 텔레그램 미발송. 키 없으면 LLM 빈 판단(수집 무영향).
"""
import json
import os
import sys
import config
import movers as movers_mod
import news as news_mod
import rumors as rumors_mod
import quant as quant_mod
import regime as regime_mod
import collect as collect_mod   # float 캐시 로드/저장 헬퍼 재사용(자체 파일, 코어 미오염)
import analyst
import redteam
import notify as notify_mod


def run(dry=False, max_movers=None):
    config.ensure_dirs()
    date = config.today_yyyymmdd()
    mv = movers_mod.movers()[: (max_movers or config.MAX_MOVERS)]
    if not mv:
        print(f"[alpha-loop] {date} movers 0")
        return {}
    fcache = collect_mod._load_fcache()    # 자체 캐시(영속) — 10분 루프마다 재스크랩 방지
    reg = regime_mod.regime()
    judg = {}
    rows = []
    for m in mv:
        row = quant_mod.build(m, fcache, reg)
        nw = news_mod.news(m["code"])
        ru = rumors_mod.gather(m["code"], m["name"])
        a = analyst.analyze(row, nw, ru) or {}
        rt = redteam.review(row, ru)
        j = {**a, **rt}
        judg[m["code"]] = j
        row["_judgment"] = j
        rows.append(row)
        print(f"  {m['code']} {m['name']}: {j.get('catalyst', '(LLM없음)')} · "
              f"conf {j.get('confidence')} · 작전 {j.get('redteam_flag')}")
    collect_mod._save_fcache(fcache)   # 스크랩한 float 자체 캐시에 영속
    tmp = os.path.join(config.JUDGMENTS_DIR, f"{date}.json.tmp")
    json.dump(judg, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    os.replace(tmp, os.path.join(config.JUDGMENTS_DIR, f"{date}.json"))
    if not dry:
        print(f"[alpha-loop] 텔레그램 {notify_mod.notify(rows)}건")
    print(f"[alpha-loop] {date} judgments {len(judg)}종목 → {config.JUDGMENTS_DIR}")
    return judg


if __name__ == "__main__":
    run(dry="--dry-run" in sys.argv)
