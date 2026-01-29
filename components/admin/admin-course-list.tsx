'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { m } from 'framer-motion';
import { toast } from 'sonner';
import Image from 'next/image';
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  MoreHorizontal,
  GraduationCap,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { courseSchema, type CourseFormData } from '@/lib/validations';
import type { Course } from '@/types/database';

interface AdminCourseListProps {
  initialCourses: Course[];
}

/**
 * 管理员课程列表
 * 
 * Phase 5 改进：
 * 1. 使用 ConfirmDialog 替代原生 confirm()
 * 2. 使用 Next.js Image 组件
 * 3. 添加操作加载状态
 */
export function AdminCourseList({ initialCourses }: AdminCourseListProps) {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Phase 5: 使用确认对话框
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  // 使用 react-hook-form + zod 验证
  const form = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: '',
      description: '',
      cover_image: '',
      is_published: false,
    },
  });

  const handleCreateCourse = async (data: CourseFormData) => {
    const supabase = createClient();

    const { data: newCourse, error } = await supabase
      .from('courses')
      .insert({
        title: data.title,
        description: data.description || null,
        cover_image: data.cover_image || null,
        order_index: courses.length,
        is_published: false,
      })
      .select()
      .single();

    if (error) {
      toast.error('创建失败：' + error.message);
      return;
    }

    toast.success('课程创建成功');
    setCourses([...courses, newCourse]);
    setShowCreateDialog(false);
    form.reset();
    
    // Revalidate cache
    try {
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'courses' }),
      });
    } catch (e) {
      console.warn('缓存刷新失败', e);
    }
    
    router.push(`/admin/courses/${newCourse.id}`);
  };

  // Phase 5: 添加操作加载状态
  const handleTogglePublish = useCallback(async (course: Course) => {
    setActionLoading(course.id);
    
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('courses')
        .update({ is_published: !course.is_published })
        .eq('id', course.id);

      if (error) {
        toast.error('操作失败');
      } else {
        setCourses((prev) =>
          prev.map((c) =>
            c.id === course.id ? { ...c, is_published: !c.is_published } : c
          )
        );
        toast.success(course.is_published ? '已取消发布' : '已发布');
        
        // Revalidate cache
        await fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: 'courses' }),
        });
      }
    } finally {
      setActionLoading(null);
    }
  }, []);

  // Phase 5: 使用确认对话框替代原生 confirm()
  const handleDeleteCourse = useCallback(async (course: Course) => {
    const confirmed = await confirm({
      title: '删除课程',
      description: `确定要删除课程"${course.title}"吗？此操作无法撤销，所有章节和内容都将被删除。`,
      confirmText: '删除',
      cancelText: '取消',
      variant: 'destructive',
    });
    
    if (!confirmed) return;

    setActionLoading(course.id);
    
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', course.id);

      if (error) {
        toast.error('删除失败：' + error.message);
      } else {
        setCourses((prev) => prev.filter((c) => c.id !== course.id));
        toast.success('课程已删除');
        
        // Revalidate cache
        await fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: 'courses' }),
        });
      }
    } finally {
      setActionLoading(null);
    }
  }, [confirm]);

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* 确认对话框 */}
      {ConfirmDialogComponent}
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">课程管理</h1>
          <p className="text-muted-foreground mt-1">
            共 {courses.length} 个课程
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) form.reset();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary/80">
              <Plus className="w-4 h-4 mr-2" />
              创建课程
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建新课程</DialogTitle>
              <DialogDescription>
                填写课程基本信息，创建后可继续添加章节和内容
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateCourse)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>课程标题 *</FormLabel>
                      <FormControl>
                        <Input placeholder="输入课程标题" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>课程简介</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="输入课程简介" 
                          rows={3} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cover_image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>封面图片 URL</FormLabel>
                      <FormControl>
                        <Input placeholder="输入图片 URL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    取消
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        创建中...
                      </>
                    ) : (
                      '创建课程'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="搜索课程..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
      </div>

      {/* Course List */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-16">
          <GraduationCap className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? '没有找到匹配的课程' : '还没有创建课程'}
          </p>
          {!searchQuery && (
            <Button
              className="mt-4"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              创建第一个课程
            </Button>
          )}
        </div>
      ) : (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {filteredCourses.map((course, index) => (
            <m.div
              key={course.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02, duration: 0.15 }}
            >
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Cover - Phase 5: 使用 Next.js Image */}
                    <div className="w-20 h-20 rounded-lg bg-muted shrink-0 overflow-hidden relative">
                      {course.cover_image ? (
                        <Image
                          src={course.cover_image}
                          alt={course.title}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-muted-foreground/30" aria-hidden="true" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg truncate">
                          {course.title}
                        </h3>
                        <Badge
                          variant={course.is_published ? 'default' : 'secondary'}
                        >
                          {course.is_published ? '已发布' : '草稿'}
                        </Badge>
                      </div>
                      {course.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {course.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/admin/courses/${course.id}`)
                        }
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        编辑
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleTogglePublish(course)}
                          >
                            {course.is_published ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-2" />
                                取消发布
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-2" />
                                发布课程
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteCourse(course)}
                            disabled={actionLoading === course.id}
                          >
                            <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                            删除课程
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </m.div>
          ))}
        </m.div>
      )}
    </div>
  );
}
