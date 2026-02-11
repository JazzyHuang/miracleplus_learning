import { Skeleton } from '@/components/ui/skeleton';

export default function CertificateVerifyLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <Skeleton className="w-14 h-14 rounded-full mx-auto" />
          <Skeleton className="h-6 w-36 mx-auto" />
          <Skeleton className="h-4 w-16 mx-auto" />
        </div>

        {/* Result card */}
        <div className="rounded-2xl border border-border/50 p-8 space-y-4">
          <Skeleton className="w-16 h-16 rounded-full mx-auto" />
          <div className="text-center space-y-2">
            <Skeleton className="h-5 w-24 mx-auto" />
            <Skeleton className="h-4 w-40 mx-auto" />
          </div>
          <div className="space-y-3 pt-4 border-t border-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
