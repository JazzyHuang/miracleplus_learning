import { History } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AuditLogsLoading() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="w-6 h-6" />
            操作日志
          </h1>
          <p className="text-sm text-muted-foreground mt-1">管理员操作审计记录</p>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>

      {/* Filter bar skeleton */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-3">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-14 rounded-lg" />
          ))}
        </div>
        <div className="flex items-center gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-14 rounded-lg" />
          ))}
          <Skeleton className="h-8 w-[200px] rounded-md" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
        <div className="space-y-3 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
