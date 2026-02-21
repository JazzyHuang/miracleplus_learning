'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Star, Eye, EyeOff, Edit, Trash2, MoreHorizontal, ExternalLink, Heart, MessageSquare, Bookmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToolAvatar } from '@/components/ai-tools/tool-avatar';
import { cn } from '@/lib/utils';
import { pricingOptions, pricingColors } from './constants';
import type { AITool } from '@/types/database';

interface ColumnActions {
  onEdit: (tool: AITool) => void;
  onToggleActive: (tool: AITool) => void;
  onToggleFeatured: (tool: AITool) => void;
  onDelete: (toolId: string) => void;
}

export function getAIToolColumns(actions: ColumnActions): ColumnDef<AITool, unknown>[] {
  return [
    {
      accessorKey: 'logo_url',
      header: 'Logo',
      meta: { label: 'Logo' },
      enableSorting: false,
      cell: ({ row }) => (
        <div className="w-10 h-10 shrink-0">
          <ToolAvatar name={row.original.name} logoUrl={row.original.logo_url} websiteUrl={row.original.website_url} size="md" />
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: '名称',
      meta: { label: '名称' },
      cell: ({ row }) => {
        const tool = row.original;
        return (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{tool.name}</span>
              {tool.is_featured && <Badge className="bg-warning text-white text-xs"><Star className="w-3 h-3 mr-0.5" />精选</Badge>}
              <Badge className={cn('text-xs', pricingColors[tool.pricing_type])}>
                {pricingOptions.find((p) => p.value === tool.pricing_type)?.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="truncate max-w-[150px]">{tool.slug}</span>
              {tool.category && <span>· {tool.category.name}</span>}
            </div>
          </div>
        );
      },
    },
    {
      id: 'stats',
      header: '数据',
      meta: { label: '数据' },
      enableSorting: false,
      cell: ({ row }) => {
        const tool = row.original;
        return (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5"><Star className="w-3.5 h-3.5 text-warning" />{tool.avg_rating > 0 ? tool.avg_rating.toFixed(1) : '-'}</span>
            <span className="flex items-center gap-0.5"><Heart className="w-3.5 h-3.5" />{tool.like_count}</span>
            <span className="flex items-center gap-0.5"><MessageSquare className="w-3.5 h-3.5" />{tool.comment_count}</span>
            <span className="flex items-center gap-0.5"><Bookmark className="w-3.5 h-3.5" />{tool.bookmark_count}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'is_active',
      header: '状态',
      meta: { label: '状态' },
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
          {row.original.is_active ? '上架' : '下架'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      meta: { label: '操作' },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const tool = row.original;
        return (
          <div className="flex items-center gap-1 justify-end">
            <Button variant="outline" size="sm" onClick={() => actions.onEdit(tool)}>
              <Edit className="w-3.5 h-3.5 mr-1" /> 编辑
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="更多操作">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => actions.onToggleFeatured(tool)}>
                  <Star className="w-4 h-4 mr-2" />{tool.is_featured ? '取消精选' : '设为精选'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => actions.onToggleActive(tool)}>
                  {tool.is_active ? <><EyeOff className="w-4 h-4 mr-2" />下架</> : <><Eye className="w-4 h-4 mr-2" />上架</>}
                </DropdownMenuItem>
                {tool.website_url && (
                  <DropdownMenuItem asChild>
                    <a href={tool.website_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />访问官网
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => actions.onDelete(tool.id)}>
                  <Trash2 className="w-4 h-4 mr-2" />删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
