// 네이버 공개(무인증) API fetch 계층 — Vercel route handler 전용.
// 시크릿 불필요: 모바일 공개 엔드포인트만 사용한다 (KIS는 로컬 파이프라인 전용, 여기 금지).
// 모든 호출은 no-store + 타임아웃 — 신선도 제어는 라우트의 CDN Cache-Control이 담당.

import { ymdKST } from "./parse";
import type { Candle } from "@/types/stock";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchNaver(url: string, timeoutMs = 6000): Promise<Response> {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "User-Agent": UA, Accept: "application/json, text/plain, */*" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res;
}

async function fetchJson<T = unknown>(url: string, timeoutMs = 6000): Promise<T> {
  return (await fetchNaver(url, timeoutMs)).json() as Promise<T>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** 자동완성: 종목명/코드 → 후보 목록 (국내 주식만). */
export async function fetchAutocomplete(q: string): Promise<any[]> {
  const url = `https://ac.stock.naver.com/ac?q=${encodeURIComponent(q)}&target=stock`;
  const d = await fetchJson<any>(url, 4000);
  const items = Array.isArray(d?.items) ? d.items.flat(2) : [];
  return items.filter(
    (it: any) => it?.nationCode === "KOR" && it?.category === "stock" && it?.code
  );
}

/** 현재가·등락·시장상태·거래정지 여부 등 기본 정보. */
export async function fetchBasic(code: string): Promise<any> {
  return fetchJson(`https://m.stock.naver.com/api/stock/${code}/basic`);
}

/** PER/PBR/52주/시총/컨센서스/증권사리포트 등 종합 정보. */
export async function fetchIntegration(code: string): Promise<any> {
  return fetchJson(`https://m.stock.naver.com/api/stock/${code}/integration`);
}

/** 연간 재무 (매출액/영업이익/당기순이익 + 컨센서스 연도). ETF는 financeInfo=null. */
export async function fetchFinanceAnnual(code: string): Promise<any> {
  return fetchJson(`https://m.stock.naver.com/api/stock/${code}/finance/annual`);
}

/** 종목 뉴스 피드 (최신순). */
export async function fetchNews(code: string, pageSize = 20): Promise<any[]> {
  const d = await fetchJson<any>(
    `https://m.stock.naver.com/api/news/stock/${code}?pageSize=${pageSize}&page=1`
  );
  // 응답: [{total, items:[...]}, ...] 묶음 배열
  const groups = Array.isArray(d) ? d : [];
  return groups.flatMap((g: any) => (Array.isArray(g?.items) ? g.items : []));
}

/** 외인/기관/개인 일별 순매수 (최신순). */
export async function fetchTrend(code: string): Promise<any[]> {
  const d = await fetchJson<any>(`https://m.stock.naver.com/api/stock/${code}/trend`);
  return Array.isArray(d) ? d : [];
}

/**
 * 일봉 OHLCV — api.finance.naver.com/siseJson (파이썬 리스트형 텍스트 응답).
 * scripts/team3_price_context.py:fetch_daily 의 관대 파싱을 TS로 포팅.
 * calendarDays=300 → 거래일 약 200봉 (지표 최소 35봉 + 일목 78봉 충분).
 */
export async function fetchDaily(code: string, calendarDays = 300): Promise<Candle[]> {
  const end = ymdKST();
  const start = ymdKST(new Date(Date.now() - calendarDays * 86_400_000));
  const url =
    `https://api.finance.naver.com/siseJson.naver?symbol=${code}` +
    `&requestType=1&startTime=${start}&endTime=${end}&timeframe=day`;
  const raw = await (await fetchNaver(url, 8000)).text();
  const normalized = raw
    .trim()
    .replace(/'/g, '"')
    .replace(/,\s*([\]}])/g, "$1"); // 후행 콤마 방어
  const rows = JSON.parse(normalized) as unknown[];
  const out: Candle[] = [];
  for (const row of rows.slice(1)) {
    // [날짜, 시가, 고가, 저가, 종가, 거래량, ...]
    if (!Array.isArray(row) || row.length < 6) continue;
    const [date, open, high, low, close, volume] = row;
    if (typeof close !== "number" || close <= 0) continue;
    out.push({
      date: String(date),
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
      volume: Number(volume),
    });
  }
  return out;
}
