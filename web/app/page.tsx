import { listSignals } from "@/lib/signals/repository";
import { LiveSignals } from "@/components/signal/LiveSignals";

// 정적 생성: 데이터는 signals.json(빌드 시 import)에서 오므로 배포마다 갱신된다.
// 방문자는 CDN 정적 페이지를 받으므로 동시접속이 늘어도 서버 함수 호출이 없다.
// 열린 탭의 실시간 갱신은 LiveSignals(클라이언트 폴링)가 담당한다.

const LIMIT = 50;

export default function Home() {
  const { items, total } = listSignals({ page: 1, limit: LIMIT });

  return (
    <main className="container py-12">
      <header className="mb-8 space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">시그널 분석</h1>
        <p className="text-sm text-muted-foreground">
          스크리너(거래량·상승 이력 + 재료) + AI 분석 결과 ·
          <span className="text-warning"> 투자 참고용, 매수 추천 아님</span>
          <span className="tabular-nums"> · 총 {total}건</span>
        </p>
      </header>

      <LiveSignals initialSignals={items} />
    </main>
  );
}
