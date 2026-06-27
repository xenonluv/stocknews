"""자체 텔레그램 — 🧠 [알파]. 코어 telegram_notify.send/load_env 재사용(읽기전용) + 자체 디둡 상태.
입증 전에는 고신뢰(confidence≥0.6) 판단만 1회 발송(종목·일자 디둡). 기존 🚨/⚡ 알림과 메시지·상태파일 분리."""
import json
import os
import config
import telegram_notify as tg

CONF_GATE = 0.6


def _load():
    try:
        return json.load(open(config.NOTIFIED, encoding="utf-8"))
    except Exception:
        return {}


def _save(s):
    try:
        config.ensure_dirs()
        tmp = config.NOTIFIED + ".tmp"
        json.dump(s, open(tmp, "w", encoding="utf-8"), ensure_ascii=False)
        os.replace(tmp, config.NOTIFIED)
    except Exception:
        pass


def notify(rows):
    """rows: collect/loop의 행(_judgment 포함 가능). 고신뢰 알파만 발송. 보낸 수 반환."""
    tg.load_env()
    if not (os.environ.get("TELEGRAM_BOT_TOKEN") and os.environ.get("TELEGRAM_CHAT_ID")):
        return 0
    date = config.today_yyyymmdd()
    st = _load()
    sent = set(st.get(date, []))
    n = 0
    for r in rows:
        j = r.get("_judgment") or r
        cat = j.get("catalyst")
        conf = j.get("confidence") or 0
        code = r.get("code")
        if not cat or conf < CONF_GATE or code in sent:
            continue
        flag = "⚠작전의심 " if j.get("redteam_flag") else ""
        msg = "\n".join([
            f"🧠 [알파] {r.get('name')} ({code})",
            f"{flag}왜↑: {cat}",
            f"회전2d {r.get('turnover_2d_pct')}% · 14:30스파크 {r.get('spark_1430_count')} · "
            f"익일확률 {round((j.get('prob_up') or 0) * 100)}%(conf {round(conf * 100)}%)",
            f"{tg.BASE}/stock/{code}",
        ])
        if tg.send(msg):
            sent.add(code)
            n += 1
    if n:
        _save({date: sorted(sent)})
    return n
