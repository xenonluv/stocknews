export default function Loading() {
  return (
    <main className="container py-12">
      <div className="mb-8 space-y-2">
        <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-56 animate-pulse rounded-lg border border-border bg-card"
          />
        ))}
      </div>
    </main>
  );
}
