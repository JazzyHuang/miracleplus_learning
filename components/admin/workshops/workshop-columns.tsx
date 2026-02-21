'use client';

import { ColumnDef } from '@tanstack/react-table';
import Image from 'next/image';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarDays, Users, ExternalLink, Edit, Eye, EyeOff, Trash2, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Workshop } from '@/types/database';

export interface WorkshopWithCount extends Workshop {
  checkin_count?: number;
}

interface ColumnActions {
  onEdit: (workshop: Workshop) => void;
  onToggleActive: (workshop: Workshop) => void;
  onDelete: (workshopId: string) => void;
}

export function getWorkshopColumns(actions: ColumnActions): ColumnDef<WorkshopWithCount, unknown>[] {
  return [
    {
      accessorKey: 'cover_image',
      header: '封面',
      meta: { label: '封面' },
      enableSorting: false,
      cell: ({ row }) => {
        const workshop = row.original;
        return (
          <div className="relative w-16 h-16 rounded-lg bg-muted shrink-0 overflow-hidden">
            {workshop.cover_image ? (
              <Image src={workshop.cover_image} alt={workshop.title} fill className="object-cover" sizes="64px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-muted-foreground/30" />
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'title',
      header: '活动标题',
      meta: { label: '活动标题' },
      cell: ({ row }) => {
        const workshop = row.original;
        return (
          <div className="min-w-0">
            <p className="font-medium truncate">{workshop.title}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                {format(new Date(workshop.event_date), 'yyyy年MM月dd日', { locale: zhCN })}
              </span>
              {workshop.feishu_url && (
                <span className="flex items-center gap-1 text-primary">
                  <ExternalLink className="w-3.5 h-3.5" />
                  已配置链接
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'checkin_count',
      header: '打卡',
      meta: { label: '打卡人数' },
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          {row.original.checkin_count || 0}
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: '状态',
      meta: { label: '状态' },
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
          {row.original.is_active ? '进行中' : '已关闭'}
        </Badge>
      ),
    },
    {
      accessorKey: 'event_date',
      header: '活动日期',
      meta: { label: '活动日期' },
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.original.event_date), 'MM/dd')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      meta: { label: '操作' },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const workshop = row.original;
        return (
          <div className="flex items-center gap-1 justify-end">
            <Button variant="outline" size="sm" onClick={() => actions.onEdit(workshop)}>
              <Edit className="w-3.5 h-3.5 mr-1" /> 编辑
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="更多操作">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => actions.onToggleActive(workshop)}>
                  {workshop.is_active ? (
                    <><EyeOff className="w-4 h-4 mr-2" />关闭活动</>
                  ) : (
                    <><Eye className="w-4 h-4 mr-2" />开启活动</>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive"
                  onClick={() => actions.onDelete(workshop.id)}>
                  <Trash2 className="w-4 h-4 mr-2" />删除活动
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
