"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { stockClientService } from "@/services/stock.client";
import type { SearchItem } from "@/types/stock";
import { cn } from "@/lib/utils";

/**
 * 종목 검색박스 — 이름/6자리 코드 입력 → 자동완성 → /stock/[code] 이동.
 * 디바운스 200ms + AbortController로 타이핑당 1요청, 키보드(↑↓/Enter/Esc) 지원.
 */
export function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pending, setPending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (code: string) => {
      setOpen(false);
      setPending(true);
      router.push(`/stock/${code}`);
    },
    [router]
  );

  // 디바운스 자동완성
  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setItems([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const res = await stockClientService.search(query, ac.signal);
        setItems(res.items);
        setOpen(res.items.length > 0);
        setActive(-1);
      } catch {
        /* 입력 중 취소/일시 오류는 무시 */
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && active >= 0 && items[active]) go(items[active].code);
      else if (/^\d{6}$/.test(q.trim())) go(q.trim()); // 코드 직접 입력
      else if (items[0]) go(items[0].code);
      return;
    }
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    }
  };

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => items.length > 0 && setOpen(true)}
          placeholder="종목명 또는 코드 입력 — 예) 삼성전자, 005930"
          role="combobox"
          aria-expanded={open}
          aria-controls="stock-search-list"
          aria-label="종목 검색"
          disabled={pending}
          className="h-12 w-full rounded-lg border border-border bg-card/80 pl-10 pr-4 text-sm shadow-lg shadow-black/20 backdrop-blur placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />
        {pending && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            이동 중…
          </span>
        )}
      </div>

      {open && (
        <ul
          id="stock-search-list"
          role="listbox"
          className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-xl shadow-black/40"
        >
          {items.map((it, i) => (
            <li key={it.code} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(it.code)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors",
                  i === active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                )}
              >
                <span className="font-medium">{it.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {it.code} · {it.market}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
