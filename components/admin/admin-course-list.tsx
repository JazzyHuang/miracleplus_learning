'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Course } from '@/types/database';

interface AdminCourseListProps {
  initialCourses: Course[];
}

export function AdminCourseList({ initialCourses }: AdminCourseListProps) {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    cover_image: '',
  });

  const handleCreateCourse = async () => {
    if (!newCourse.title.trim()) {
      toast.error('请输入课程标题');
      return;
    }

    setCreating(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('courses')
      .insert({
        title: newCourse.title,
        description: newCourse.description || null,
        cover_image: newCourse.cover_image || null,
        order_index: courses.length,
        is_published: false,
      })
      .select()
      .single();

    if (error) {
      toast.error('创建失败：' + error.message);
    } else {
      toast.success('课程创建成功');
      setCourses([...courses, data]);
      setShowCreateDialog(false);
      setNewCourse({ title: '', description: '', cover_image: '' });
      
      // Revalidate cache
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'courses' }),
      });
      
      router.push(`/admin/courses/${data.id}`);
    }
    setCreating(false);
  };

  const handleTogglePublish = async (course: Course) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('courses')
      .update({ is_published: !course.is_published })
      .eq('id', course.id);

    if (error) {
      toast.error('操作失败');
    } else {
      setCourses(
        courses.map((c) =>
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
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('确定要删除这个课程吗？此操作不可恢复。')) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) {
      toast.error('删除失败：' + error.message);
    } else {
      setCourses(courses.filter((c) => c.id !== courseId));
      toast.success('课程已删除');
      
      // Revalidate cache
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'courses' }),
      });
    }
  };

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">课程管理</h1>
          <p className="text-muted-foreground mt-1">
            共 {courses.length} 个课程
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
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
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">课程标题 *</Label>
                <Input
                  id="title"
                  value={newCourse.title}
                  onChange={(e) =>
                    setNewCourse({ ...newCourse, title: e.target.value })
                  }
                  placeholder="输入课程标题"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">课程简介</Label>
                <Textarea
                  id="description"
                  value={newCourse.description}
                  onChange={(e) =>
                    setNewCourse({ ...newCourse, description: e.target.value })
                  }
                  placeholder="输入课程简介"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cover">封面图片 URL</Label>
                <Input
                  id="cover"
                  value={newCourse.cover_image}
                  onChange={(e) =>
                    setNewCourse({ ...newCourse, cover_image: e.target.value })
                  }
                  placeholder="输入图片 URL"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                取消
              </Button>
              <Button onClick={handleCreateCourse} disabled={creating}>
                {creating ? '创建中...' : '创建课程'}
              </Button>
            </DialogFooter>
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {filteredCourses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02, duration: 0.15 }}
            >
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Cover */}
                    <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                      {course.cover_image ? (
                        <img
                          src={course.cover_image}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-muted-foreground/30" />
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
                            onClick={() => handleDeleteCourse(course.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除课程
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
