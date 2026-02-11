import Link from 'next/link';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DiscussionNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-sm text-center">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 shadow-theme-sm">
          <MessageSquare className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-medium text-foreground mb-2">讨论不存在</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          该讨论可能已被删除或链接无效。
        </p>
        <Link href="/discussions">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" aria-hidden="true" />
            返回讨论区
          </Button>
        </Link>
      </div>
    </div>
  );
}
