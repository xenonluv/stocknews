import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

const DEFAULT_DISCLAIMER =
  "본 정보는 투자 참고용이며, 투자 판단과 그 책임은 전적으로 본인에게 있습니다.";

export function DisclaimerNote({
  text = DEFAULT_DISCLAIMER,
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground",
        className
      )}
    >
      <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
      <span>{text}</span>
    </p>
  );
}
