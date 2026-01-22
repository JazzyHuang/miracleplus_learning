'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  GripVertical,
  ChevronRight,
  FileText,
  Edit,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { CourseWithChapters, Chapter, Lesson } from '@/types/database';

interface CourseEditPageProps {
  params: Promise<{ courseId: string }>;
}

export default function CourseEditPage({ params }: CourseEditPageProps) {
  const { courseId } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<CourseWithChapters | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit states
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCoverImage, setEditCoverImage] = useState('');
  const [editIsPublished, setEditIsPublished] = useState(false);

  // Dialog states
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [showAddLesson, setShowAddLesson] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonFeishuUrl, setNewLessonFeishuUrl] = useState('');

  const fetchCourse = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        chapters (
          *,
          lessons (*)
        )
      `)
      .eq('id', courseId)
      .single();

    if (!error && data) {
      const sortedData = {
        ...data,
        chapters: data.chapters
          ?.sort((a: any, b: any) => a.order_index - b.order_index)
          .map((chapter: any) => ({
            ...chapter,
            lessons: chapter.lessons?.sort((a: any, b: any) => a.order_index - b.order_index),
          })),
      };
      setCourse(sortedData as CourseWithChapters);
      setEditTitle(sortedData.title);
      setEditDescription(sortedData.description || '');
      setEditCoverImage(sortedData.cover_image || '');
      setEditIsPublished(sortedData.is_published);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const handleSaveCourse = async () => {
    if (!editTitle.trim()) {
      toast.error('请输入课程标题');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('courses')
      .update({
        title: editTitle,
        description: editDescription || null,
        cover_image: editCoverImage || null,
        is_published: editIsPublished,
      })
      .eq('id', courseId);

    if (error) {
      toast.error('保存失败：' + error.message);
    } else {
      toast.success('保存成功');
      fetchCourse();
    }
    setSaving(false);
  };

  const handleAddChapter = async () => {
    if (!newChapterTitle.trim()) {
      toast.error('请输入章节标题');
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('chapters')
      .insert({
        course_id: courseId,
        title: newChapterTitle,
        order_index: course?.chapters?.length || 0,
      })
      .select()
      .single();

    if (error) {
      toast.error('添加失败：' + error.message);
    } else {
      toast.success('章节添加成功');
      setNewChapterTitle('');
      setShowAddChapter(false);
      fetchCourse();
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm('确定要删除这个章节吗？章节下的所有课时也会被删除。')) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('chapters')
      .delete()
      .eq('id', chapterId);

    if (error) {
      toast.error('删除失败：' + error.message);
    } else {
      toast.success('章节已删除');
      fetchCourse();
    }
  };

  const handleAddLesson = async (chapterId: string) => {
    if (!newLessonTitle.trim()) {
      toast.error('请输入课时标题');
      return;
    }

    const chapter = course?.chapters?.find((c) => c.id === chapterId);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('lessons')
      .insert({
        chapter_id: chapterId,
        title: newLessonTitle,
        content: '',
        feishu_url: newLessonFeishuUrl || null,
        order_index: chapter?.lessons?.length || 0,
      })
      .select()
      .single();

    if (error) {
      toast.error('添加失败：' + error.message);
    } else {
      toast.success('课时添加成功');
      setNewLessonTitle('');
      setNewLessonFeishuUrl('');
      setShowAddLesson(null);
      router.push(`/admin/courses/${courseId}/chapters/${chapterId}?lesson=${data.id}`);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('确定要删除这个课时吗？')) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (error) {
      toast.error('删除失败：' + error.message);
    } else {
      toast.success('课时已删除');
      fetchCourse();
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-muted-foreground">课程不存在</p>
        <Button onClick={() => router.push('/admin/courses')} className="mt-4">
          返回课程列表
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/courses')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <Badge variant={course.is_published ? 'default' : 'secondary'}>
              {course.is_published ? '已发布' : '草稿'}
            </Badge>
          </div>
        </div>
        <Button
          onClick={handleSaveCourse}
          disabled={saving}
          className="bg-gradient-to-r from-primary to-primary/80"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? '保存中...' : '保存'}
        </Button>
      </div>

      {/* Course Info */}
      <Card className="border-0 shadow-lg mb-8">
        <CardHeader>
          <CardTitle>课程信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">课程标题</Label>
            <Input
              id="title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">课程简介</Label>
            <Textarea
              id="description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover">封面图片 URL</Label>
            <Input
              id="cover"
              value={editCoverImage}
              onChange={(e) => setEditCoverImage(e.target.value)}
              placeholder="输入图片 URL"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>发布状态</Label>
              <p className="text-sm text-muted-foreground">
                发布后用户可以看到此课程
              </p>
            </div>
            <Switch
              checked={editIsPublished}
              onCheckedChange={setEditIsPublished}
            />
          </div>
        </CardContent>
      </Card>

      {/* Chapters */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">课程章节</h2>
        <Button onClick={() => setShowAddChapter(true)}>
          <Plus className="w-4 h-4 mr-2" />
          添加章节
        </Button>
      </div>

      {course.chapters?.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">还没有章节</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowAddChapter(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              添加第一个章节
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={course.chapters?.map(c => c.id)} className="space-y-4">
          {course.chapters?.map((chapter, chapterIndex) => (
            <AccordionItem
              key={chapter.id}
              value={chapter.id}
              className="border-0 shadow-md rounded-xl overflow-hidden bg-card"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center gap-3 flex-1">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">
                    第 {chapterIndex + 1} 章：{chapter.title}
                  </span>
                  <Badge variant="secondary" className="ml-2">
                    {chapter.lessons?.length || 0} 节
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2 mt-2">
                  {chapter.lessons?.map((lesson, lessonIndex) => (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group"
                    >
                      <span className="text-sm text-muted-foreground w-8">
                        {chapterIndex + 1}.{lessonIndex + 1}
                      </span>
                      <span className="flex-1 flex items-center gap-2">
                        {lesson.title}
                        {lesson.feishu_url && (
                          <ExternalLink className="w-3.5 h-3.5 text-primary" />
                        )}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/admin/courses/${courseId}/chapters/${chapter.id}?lesson=${lesson.id}`
                          )
                        }
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteLesson(lesson.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddLesson(chapter.id)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      添加课时
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteChapter(chapter.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      删除章节
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Add Chapter Dialog */}
      <Dialog open={showAddChapter} onOpenChange={setShowAddChapter}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新章节</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="chapterTitle">章节标题</Label>
            <Input
              id="chapterTitle"
              value={newChapterTitle}
              onChange={(e) => setNewChapterTitle(e.target.value)}
              placeholder="输入章节标题"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddChapter(false)}>
              取消
            </Button>
            <Button onClick={handleAddChapter}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lesson Dialog */}
      <Dialog
        open={!!showAddLesson}
        onOpenChange={() => {
          setShowAddLesson(null);
          setNewLessonTitle('');
          setNewLessonFeishuUrl('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新课时</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lessonTitle">课时标题</Label>
              <Input
                id="lessonTitle"
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                placeholder="输入课时标题"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lessonFeishuUrl">飞书链接</Label>
              <Input
                id="lessonFeishuUrl"
                value={newLessonFeishuUrl}
                onChange={(e) => setNewLessonFeishuUrl(e.target.value)}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">
                用户点击此课时将直接跳转到此链接
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddLesson(null);
              setNewLessonTitle('');
              setNewLessonFeishuUrl('');
            }}>
              取消
            </Button>
            <Button onClick={() => showAddLesson && handleAddLesson(showAddLesson)}>
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
