import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 用户头部 */}
      <Skeleton className="h-48 rounded-xl" />
      
      {/* 等级进度 */}
      <Skeleton className="h-24 rounded-xl" />
      
      {/* 标签页内容 */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
