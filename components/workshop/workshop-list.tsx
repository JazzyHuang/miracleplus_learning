import { Suspense } from 'react';
import { CalendarDays } from 'lucide-react';
import { WorkshopCard } from './workshop-card';
import { WorkshopSearch } from './workshop-search';
import type { Workshop } from '@/types/database';

interface WorkshopListProps {
  workshops: Workshop[];
  searchQuery?: string;
}

export function WorkshopList({ workshops, searchQuery = '' }: WorkshopListProps) {
  const filteredWorkshops = workshops.filter((workshop) =>
    workshop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workshop.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-foreground rounded-xl flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-background" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-foreground tracking-tight">Workshop 活动</h1>
            <p className="text-muted-foreground mt-1">参与线下活动，记录学习足迹</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Suspense fallback={<div className="h-12 bg-muted rounded-lg animate-pulse max-w-md" />}>
          <WorkshopSearch />
        </Suspense>
      </div>

      {/* Workshop Grid */}
      {filteredWorkshops.length === 0 ? (
        <div className="text-center py-16">
          <CalendarDays className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? '没有找到匹配的活动' : '暂无活动'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkshops.map((workshop, index) => (
            <div 
              key={workshop.id} 
              className="animate-in fade-in slide-in-from-bottom-4 duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <WorkshopCard workshop={workshop} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
