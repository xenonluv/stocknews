// 이벤트 테마 매칭 — scripts/theme_map.py 포팅.
// D-10 이벤트 카테고리 ↔ 종목 뉴스 제목 매칭으로 이벤트 민감도(0~15) 산출.
// 이벤트 원천은 radar.json(events[]) — D-day는 요청 시점 기준으로 재계산한다.

import type { RadarEvent } from "@/types/radar";
import type { EventSection } from "@/types/stock";
import { ddayKST } from "./parse";

const THEMES: Record<string, RegExp> = {
  금리: /은행|보험|증권|금융지주|카드|캐피탈|리츠|건설|금리|부동산/u,
  반도체:
    /반도체|HBM|파운드리|D램|디램|낸드|메모리|엔비디아|NVIDIA|TSMC|소부장|웨이퍼|패키징|팹리스|칩스|칩셋|반도체\s?장비|AI\s?서버|데이터센터/u,
  환율: /환율|달러|원화|수출|관세|무역/u,
  유가: /유가|원유|정유|조선|해운|시추|피팅|OPEC|셰일|LNG|탱커/u,
  전쟁: /방산|방위|탄약|미사일|레이더|무기|전쟁|휴전|우크라|중동|이란|지정학/u,
  실적: /실적|영업이익|어닝|컨센서스|흑자|턴어라운드|가이던스/u,
  수급: /공매도|만기|선물|옵션|배당|자사주|블록딜|수급/u,
};

function matchSensitivity(texts: string[]): Record<string, number> {
  const hits: Record<string, number> = {};
  for (const [cat, pat] of Object.entries(THEMES)) {
    const n = texts.filter((t) => t && pat.test(t)).length;
    if (n > 0) hits[cat] = n;
  }
  return hits;
}

/**
 * 이벤트별 기여 = min(hit,3) × (importance/10) × 근접가중((11-dday)/11) × 3, 총합 캡 15.
 * (theme_map.match_events 동일 산식 — 업종명 가점은 공개 API에 업종이 없어 생략)
 */
export function matchEvents(events: RadarEvent[], newsTitles: string[]): EventSection {
  const now = new Date();
  const upcoming = events
    .map((ev) => ({ ...ev, dday: ddayKST(ev.date, now) }))
    .filter((ev) => ev.dday >= 0 && ev.dday <= 10);

  const sens = matchSensitivity(newsTitles);
  const matched: EventSection["matched"] = [];
  let total = 0;
  for (const ev of upcoming) {
    const cats = (ev.category ?? []).filter((c) => c in sens);
    if (cats.length === 0) continue;
    const hit = Math.max(...cats.map((c) => sens[c]));
    const proximity = Math.max(0, (11 - ev.dday) / 11);
    const contrib = Math.min(hit, 3) * ((ev.importance ?? 5) / 10) * proximity * 3;
    matched.push({
      id: ev.id,
      title: ev.title,
      date: ev.date,
      dday: ev.dday,
      categories: cats,
      importance: ev.importance,
      score: Math.round(contrib * 10) / 10,
    });
    total += contrib;
  }
  matched.sort((a, b) => b.score - a.score);
  return {
    matched,
    totalScore: Math.round(Math.min(15, total) * 10) / 10,
    upcomingCount: upcoming.length,
  };
}
