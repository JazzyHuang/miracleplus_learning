import { Sparkles } from 'lucide-react';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <p className="text-muted-foreground font-medium animate-pulse">
          加载中...
        </p>
      </div>
    </div>
  );
}

export function ContentLoading() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3 animate-fade-in">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    </div>
  );
}
