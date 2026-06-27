# agent_alpha — 전진수집기 + 실시간 재료·찌라시 알파 (격리 사이드카)

설계 전문: 레포 루트 `알파에이전트2.md`.

## 정체
코어 레이더(`scripts/`·`web/`)와 **완전 격리**된 실험 모듈. 매일 movers의 정량 신호
(유통회전율·14:30 5분 스파크·종가강도·투자자별·거래원 키움집중·시장레짐)를 적재하고 익일 결과로
라벨해 **검증불가 신호를 전진검증**한다. + LLM(analyst/redteam)으로 재료 진위·조작위험·찌라시 작전을 판단.
결과는 자체 텔레그램("🧠 [알파]")과 웹 `/alpha`로 노출.

## 격리·삭제안전
- 신규 코드는 `agent_alpha/`에만. 코어 `scripts/` **수정 0**. `grep -rn agent_alpha scripts` = 빈 결과.
- **KIS 접근 = Option A**: `scripts/kis_client.py`·`scripts/float_ratio.py`를 **읽기전용 import**(토큰캐시·레이트 공유).
  코어는 agent_alpha를 모르므로 삭제해도 안 깨짐(grep 테스트는 코어→agent_alpha 방향이라 불변).
  float 캐시는 `cache=` 인자로 코어 `data/float_ratio.json` 디스크쓰기를 회피(자체 `data/float_cache.json` 사용).
- 쓰기는 `agent_alpha/data/`에만. 예외: `publish_alpha.py`가 `web/data/alpha.json`을 생성(웹 표시용, 유일).
- 웹 `/alpha`는 `web/`에 **신규 파일만** 추가(기존 web 무수정).

## 삭제법
```
rm -rf agent_alpha
bash agent_alpha/install_cron.sh --uninstall   # 또는 crontab에서 # AGENT_ALPHA_BEGIN..END 블록 제거
# (웹 표시 썼다면) web/app/alpha web/components/alpha web/lib/alpha web/app/api/alpha web/types/alpha.ts web/data/alpha.json 삭제
```
→ 코어 무손상.

## 정직한 한계
전진데이터는 수 주~수개월 쌓여야 결론(그 전 전부 "관찰"). 스파크는 미증명 가설. 공개신호 엣지 얇음.
수익 자동생성 ❌ — 가치는 측정 인프라 + 가짜(찌라시) 사살 + 라이브 맥락.
