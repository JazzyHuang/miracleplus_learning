import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarDays, Users, ArrowRight, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Workshop } from '@/types/database';

interface WorkshopCardProps {
  workshop: Workshop;
  checkinCount?: number;
}

export function WorkshopCard({ workshop, checkinCount = 0 }: WorkshopCardProps) {
  const eventDate = new Date(workshop.event_date);
  const isUpcoming = eventDate > new Date();
  const isPast = eventDate < new Date();
  const hasFeishuUrl = !!workshop.feishu_url;

  const cardContent = (
    <Card className="group overflow-hidden border border-border hover:border-foreground/20 shadow-soft hover:shadow-medium transition-all duration-200 rounded-xl hover:-translate-y-0.5">
        {/* Cover Image */}
        <div className="relative h-48 overflow-hidden bg-muted rounded-t-xl">
          {workshop.cover_image ? (
            <Image
              src={workshop.cover_image}
              alt={workshop.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <CalendarDays className="w-14 h-14 text-muted-foreground/30" />
            </div>
          )}
          {/* Status Badge */}
          <div className="absolute top-4 right-4">
            {isUpcoming && (
              <Badge className="bg-foreground text-background">
                即将开始
              </Badge>
            )}
            {isPast && workshop.is_active && (
              <Badge variant="secondary" className="bg-background/90 text-foreground border border-border">
                可打卡
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-5">
          <h3 className="font-semibold text-lg mb-2 line-clamp-1 group-hover:text-foreground transition-colors">
            {workshop.title}
          </h3>
          
          {workshop.description && (
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
              {workshop.description}
            </p>
          )}

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1">
                <CalendarDays className="w-4 h-4" />
                <span>{format(eventDate, 'MM月dd日', { locale: zhCN })}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{checkinCount} 人打卡</span>
              </div>
            </div>
            {hasFeishuUrl ? (
              <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-all duration-200" />
            ) : (
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-200" />
            )}
          </div>
        </CardContent>
      </Card>
  );

  // If feishu_url exists, open in new tab; otherwise navigate to detail page
  if (hasFeishuUrl) {
    return (
      <a 
        href={workshop.feishu_url!} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block"
      >
        {cardContent}
      </a>
    );
  }

  return (
    <Link href={`/workshop/${workshop.id}`}>
      {cardContent}
    </Link>
  );
}
