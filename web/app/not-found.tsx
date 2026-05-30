import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-5xl font-bold text-up">404</p>
      <p className="text-muted-foreground">요청하신 시그널을 찾을 수 없습니다.</p>
      <Button asChild variant="outline">
        <Link href="/">목록으로 돌아가기</Link>
      </Button>
    </main>
  );
}
