"""최소 Moonshot(Kimi) 클라이언트 — 코어 web/lib/stock/ai.ts callKimiJson 규약 미러(파이썬·표준라이브러리).
시크릿은 env(MOONSHOT_*); 루트 .env에 없으면 web/.env.local에서 보강(읽기전용). 키 없으면 None → LLM 없이도 수집기 동작.
"""
import os
import json
import urllib.request
import config


def _load_env():
    if os.environ.get("MOONSHOT_API_KEY"):
        return
    for p in (os.path.join(config.REPO, "web", ".env.local"), os.path.join(config.REPO, ".env")):
        try:
            for line in open(p, encoding="utf-8"):
                line = line.strip()
                if line.startswith("MOONSHOT_") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
        except Exception:
            pass


def available():
    _load_env()
    return bool(os.environ.get("MOONSHOT_API_KEY"))


def call_json(system_prompt, user_content, timeout=40):
    _load_env()
    key = os.environ.get("MOONSHOT_API_KEY")
    if not key:
        return None
    base = os.environ.get("MOONSHOT_BASE_URL", "https://api.moonshot.ai/v1").rstrip("/")
    model = os.environ.get("MOONSHOT_MODEL", "kimi-k2.6")
    body = json.dumps({
        "model": model,
        "response_format": {"type": "json_object"},
        "thinking": {"type": "disabled"},   # 빠른 응답(코어 규약: temperature 미지정)
        "messages": [{"role": "system", "content": system_prompt},
                     {"role": "user", "content": user_content}],
    }).encode("utf-8")
    try:
        req = urllib.request.Request(base + "/chat/completions", data=body,
                                     headers={"Content-Type": "application/json",
                                              "Authorization": "Bearer " + key})
        data = json.load(urllib.request.urlopen(req, timeout=timeout))
        raw = ((data.get("choices") or [{}])[0].get("message", {}).get("content") or "").strip()
        i, j = raw.find("{"), raw.rfind("}")
        return json.loads(raw[i:j + 1] if (i >= 0 and j > i) else raw)
    except Exception as e:
        print(f"[alpha-llm] 호출 실패: {type(e).__name__}")
        return None
