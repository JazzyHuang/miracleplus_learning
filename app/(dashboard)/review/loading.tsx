export default function ReviewLoading() {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    </div>
  );
}
