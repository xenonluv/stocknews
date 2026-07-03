"""web/data/radar.json → 오늘 movers (READ ONLY). 코어 출력만 읽음."""
import json
import config


def movers():
    """[{code, name, sector, mover_type}] — explosions/youtong/suspects 합집합(코드 디둡)."""
    try:
        d = json.load(open(config.RADAR_JSON, encoding="utf-8"))
    except Exception:
        return []
    out = []
    seen = set()
    for sec, typ in (("explosions", "explosion"), ("youtong", "youtong"), ("suspects", "reaccum")):
        for s in d.get(sec) or []:
            c = s.get("code")
            if not c or c in seen:
                continue
            seen.add(c)
            # 💥 흔들기 레코드는 reaccum이 아님 — 유형 오라벨 방지(fitness reaccum +10 오적용·통계 오염 차단)
            mt = "shakeout" if (sec == "suspects" and s.get("pattern") == "shakeout") else typ
            out.append({"code": c, "name": s.get("name") or c,
                        "sector": s.get("sector", ""), "mover_type": mt})
    return out
