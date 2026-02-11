'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Plus, Edit, Eye, EyeOff, Trash2, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ColumnDef } from '@tanstack/react-table';
import { createClient } from '@/lib/supabase/client';
import { DB } from '@/lib/db-tables';
import { DataTable } from '@/components/admin/data-table';
import { BatchActionsBar, commonBatchActions } from '@/components/admin/batch-actions-bar';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { Course } from '@/types/database';

/**
 * 课程列表表格列定义
 */
const courseColumns: ColumnDef<Course>[] = [
  {
    id: 'cover',
    header: '封面',
    cell: ({ row }) => (
      <div className="w-16 h-12 rounded bg-muted overflow-hidden relative">
        {row.original.cover_image ? (
          <Image
            src={row.original.cover_image}
            alt={row.original.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs text-muted-foreground">无封面</span>
          </div>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'title',
    header: '课程标题',
    cell: ({ row }) => (
      <div className="font-medium">{row.original.title}</div>
    ),
  },
  {
    accessorKey: 'description',
    header: '简介',
    cell: ({ row }) => (
      <div className="max-w-xs truncate text-sm text-muted-foreground">
        {row.original.description || '-'}
      </div>
    ),
  },
  {
    accessorKey: 'is_published',
    header: '状态',
    cell: ({ row }) => (
      <Badge variant={row.original.is_published ? 'default' : 'secondary'}>
        {row.original.is_published ? '已发布' : '草稿'}
      </Badge>
    ),
  },
  {
    accessorKey: 'order_index',
    header: '排序',
    cell: ({ row }) => <span className="text-sm">{row.original.order_index}</span>,
  },
  {
    accessorKey: 'created_at',
    header: '创建时间',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {format(new Date(row.original.created_at), 'yyyy-MM-dd', { locale: zhCN })}
      </span>
    ),
  },
  {
    id: 'actions',
    header: '操作',
    cell: ({ row }) => {
      const course = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.location.href = `/admin/courses/${course.id}`}>
              <Edit className="w-4 h-4 mr-2" />
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                const supabase = createClient();
                const { error } = await supabase
                  .from(DB.courses)
                  .update({ is_published: !course.is_published })
                  .eq('id', course.id);
                if (!error) {
                  toast.success(course.is_published ? '已取消发布' : '已发布');
                  window.location.reload();
                }
              }}
            >
              {course.is_published ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  取消发布
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  发布
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

interface AdminCourseTableProps {
  initialCourses: Course[];
}

/**
 * 课程列表表格组件
 * 使用 DataTable 实现排序、筛选、分页、批量操作
 */
export function AdminCourseTable({ initialCourses }: AdminCourseTableProps) {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  // 批量删除操作
  const handleBatchDelete = async () => {
    const confirmed = await confirm({
      title: '批量删除课程',
      description: `确定要删除选中的 ${selectedCourseIds.length} 个课程吗？此操作无法撤销。`,
      confirmText: '删除',
      cancelText: '取消',
      variant: 'destructive',
    });

    if (!confirmed) return;

    const supabase = createClient();
    const { error } = await supabase
      .from(DB.courses)
      .delete()
      .in('id', selectedCourseIds);

    if (error) {
      toast.error('删除失败，请稍后重试');
    } else {
      toast.success(`成功删除 ${selectedCourseIds.length} 个课程`);
      setCourses(courses.filter((c) => !selectedCourseIds.includes(c.id)));
      setSelectedCourseIds([]);

      // Revalidate cache
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'courses' }),
      });
    }
  };

  // 批量发布操作
  const handleBatchPublish = async () => {
    const supabase = createClient();
    const { error } = await supabase
      .from(DB.courses)
      .update({ is_published: true })
      .in('id', selectedCourseIds);

    if (error) {
      toast.error('操作失败，请稍后重试');
    } else {
      toast.success(`成功发布 ${selectedCourseIds.length} 个课程`);
      setCourses(courses.map((c) =>
        selectedCourseIds.includes(c.id) ? { ...c, is_published: true } : c
      ));
      setSelectedCourseIds([]);
    }
  };

  const batchActions = [
    commonBatchActions.publish(handleBatchPublish),
    commonBatchActions.delete(handleBatchDelete),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">课程管理</h1>
          <p className="text-muted-foreground mt-1">共 {courses.length} 个课程</p>
        </div>
        <Button
          className="bg-gradient-to-r from-primary to-primary/80"
          onClick={() => router.push('/admin/courses/new')}
        >
          <Plus className="w-4 h-4 mr-2" />
          创建课程
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={courseColumns}
        data={courses}
        searchColumn="title"
        searchPlaceholder="搜索课程标题或简介..."
        pageSize={20}
        enableRowSelection={true}
        onSelectionChange={(selectedCourses) => {
          setSelectedCourseIds(selectedCourses.map((c: Course) => c.id));
        }}
      />

      {/* 批量操作栏 */}
      {selectedCourseIds.length > 0 && (
        <BatchActionsBar
          selectedCount={selectedCourseIds.length}
          actions={batchActions}
          onClear={() => setSelectedCourseIds([])}
        />
      )}

      {ConfirmDialogComponent}
    </div>
  );
}
