'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  FileText,
  ClipboardCheck,
  GripVertical,
  Sparkles,
  Loader2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import type { Lesson, Question, QuestionOption, QuestionType, ChapterWithLessons, AIGenerateQuestionsResponse } from '@/types/database';
import { sortChapterLessons } from '@/lib/utils/sort';

interface LessonEditorPageProps {
  params: Promise<{ courseId: string; chapterId: string }>;
}

export default function LessonEditorPage({ params }: LessonEditorPageProps) {
  const { courseId, chapterId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonIdParam = searchParams.get('lesson');

  const [chapter, setChapter] = useState<ChapterWithLessons | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit states
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editFeishuUrl, setEditFeishuUrl] = useState('');

  // Question dialog
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionForm, setQuestionForm] = useState<{
    type: QuestionType;
    question_text: string;
    options: QuestionOption[];
    correct_answer: string | string[];
    explanation: string;
  }>({
    type: 'single',
    question_text: '',
    options: [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ],
    correct_answer: '',
    explanation: '',
  });

  // AI Question Generation
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiGenerating, setAIGenerating] = useState(false);
  const [aiQuestionTypes, setAIQuestionTypes] = useState<QuestionType[]>(['single']);
  const [aiQuestionCount, setAIQuestionCount] = useState(5);

  const fetchData = async () => {
    const supabase = createClient();

    // Fetch chapter with lessons
    const { data: chapterData } = await supabase
      .from('chapters')
      .select(`*, lessons (*)`)
      .eq('id', chapterId)
      .single();

    if (chapterData) {
      // 使用排序工具函数对课时进行排序
      const sortedChapter = sortChapterLessons(chapterData as ChapterWithLessons);
      setChapter(sortedChapter);

      // Select lesson
      const lessonId = lessonIdParam || sortedChapter.lessons?.[0]?.id;
      if (lessonId) {
        const lesson = sortedChapter.lessons?.find((l) => l.id === lessonId);
        if (lesson) {
          setSelectedLesson(lesson);
          setEditTitle(lesson.title);
          setEditContent(lesson.content || '');
          setEditFeishuUrl(lesson.feishu_url || '');

          // Fetch questions
          const { data: questionsData } = await supabase
            .from('questions')
            .select('*')
            .eq('lesson_id', lessonId)
            .order('order_index', { ascending: true });

          setQuestions(questionsData || []);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [chapterId, lessonIdParam]);

  const handleSelectLesson = async (lessonId: string) => {
    const lesson = chapter?.lessons?.find((l) => l.id === lessonId);
    if (lesson) {
      setSelectedLesson(lesson);
      setEditTitle(lesson.title);
      setEditContent(lesson.content || '');
      setEditFeishuUrl(lesson.feishu_url || '');

      // Fetch questions
      const supabase = createClient();
      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('order_index', { ascending: true });

      setQuestions(questionsData || []);

      // Update URL
      router.replace(`/admin/courses/${courseId}/chapters/${chapterId}?lesson=${lessonId}`);
    }
  };

  const handleSaveLesson = async () => {
    if (!selectedLesson || !editTitle.trim()) {
      toast.error('请输入课时标题');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('lessons')
      .update({
        title: editTitle,
        content: editContent,
        feishu_url: editFeishuUrl || null,
      })
      .eq('id', selectedLesson.id);

    if (error) {
      toast.error('保存失败：' + error.message);
    } else {
      toast.success('保存成功');
      fetchData();
    }
    setSaving(false);
  };

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setQuestionForm({
      type: 'single',
      question_text: '',
      options: [
        { id: 'a', text: '' },
        { id: 'b', text: '' },
        { id: 'c', text: '' },
        { id: 'd', text: '' },
      ],
      correct_answer: '',
      explanation: '',
    });
    setShowQuestionDialog(true);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setQuestionForm({
      type: question.type,
      question_text: question.question_text,
      options: question.options,
      correct_answer: question.correct_answer,
      explanation: question.explanation || '',
    });
    setShowQuestionDialog(true);
  };

  const handleSaveQuestion = async () => {
    if (!selectedLesson) return;
    if (!questionForm.question_text.trim()) {
      toast.error('请输入题目内容');
      return;
    }

    const validOptions = questionForm.options.filter((o) => o.text.trim());
    if (validOptions.length < 2) {
      toast.error('至少需要两个选项');
      return;
    }

    if (!questionForm.correct_answer || (Array.isArray(questionForm.correct_answer) && questionForm.correct_answer.length === 0)) {
      toast.error('请选择正确答案');
      return;
    }

    const supabase = createClient();
    const questionData = {
      lesson_id: selectedLesson.id,
      type: questionForm.type,
      question_text: questionForm.question_text,
      options: validOptions,
      correct_answer: questionForm.correct_answer,
      explanation: questionForm.explanation || null,
      order_index: editingQuestion?.order_index ?? questions.length,
    };

    if (editingQuestion) {
      const { error } = await supabase
        .from('questions')
        .update(questionData)
        .eq('id', editingQuestion.id);

      if (error) {
        toast.error('更新失败：' + error.message);
      } else {
        toast.success('题目已更新');
        setShowQuestionDialog(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from('questions').insert(questionData);

      if (error) {
        toast.error('添加失败：' + error.message);
      } else {
        toast.success('题目已添加');
        setShowQuestionDialog(false);
        fetchData();
      }
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('确定要删除这道题吗？')) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      toast.error('删除失败');
    } else {
      toast.success('题目已删除');
      setQuestions(questions.filter((q) => q.id !== questionId));
    }
  };

  const handleAIGenerate = async () => {
    if (!selectedLesson) {
      toast.error('请先选择一个课时');
      return;
    }

    if (aiQuestionTypes.length === 0) {
      toast.error('请至少选择一种题目类型');
      return;
    }

    if (aiQuestionCount < 1 || aiQuestionCount > 20) {
      toast.error('题目数量必须在1-20之间');
      return;
    }

    setAIGenerating(true);

    try {
      const response = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId: selectedLesson.id,
          questionTypes: aiQuestionTypes,
          count: aiQuestionCount,
        }),
      });

      const data: AIGenerateQuestionsResponse = await response.json();

      if (data.success && data.generatedCount) {
        toast.success(`成功生成 ${data.generatedCount} 道题目`);
        setShowAIDialog(false);
        // Refresh questions list
        const supabase = createClient();
        const { data: questionsData } = await supabase
          .from('questions')
          .select('*')
          .eq('lesson_id', selectedLesson.id)
          .order('order_index', { ascending: true });
        setQuestions(questionsData || []);
      } else {
        toast.error(data.error || 'AI出题失败，请重试');
      }
    } catch (error) {
      console.error('AI generate error:', error);
      toast.error('AI出题失败，请检查网络连接');
    } finally {
      setAIGenerating(false);
    }
  };

  const toggleAIQuestionType = (type: QuestionType) => {
    setAIQuestionTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid lg:grid-cols-4 gap-6">
          <Skeleton className="h-64 lg:col-span-1" />
          <Skeleton className="h-[600px] lg:col-span-3" />
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">章节不存在</p>
        <Button onClick={() => router.push(`/admin/courses/${courseId}`)} className="mt-4">
          返回课程
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/admin/courses/${courseId}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-xl font-bold">{chapter.title}</h1>
            <p className="text-sm text-muted-foreground">
              {chapter.lessons?.length || 0} 个课时
            </p>
          </div>
        </div>
        {selectedLesson && (
          <Button
            onClick={handleSaveLesson}
            disabled={saving}
            className="bg-linear-to-r from-primary to-primary/80"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? '保存中...' : '保存'}
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Lesson List */}
        <Card className="border-0 shadow-md lg:col-span-1 h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">课时列表</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-1">
              {chapter.lessons?.map((lesson, index) => (
                <button
                  key={lesson.id}
                  onClick={() => handleSelectLesson(lesson.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    selectedLesson?.id === lesson.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className="text-xs opacity-60">{index + 1}.</span>
                  <span className="flex-1 truncate">{lesson.title}</span>
                  {lesson.feishu_url && (
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Editor */}
        {selectedLesson ? (
          <div className="lg:col-span-3">
            <Tabs defaultValue="content">
              <TabsList className="mb-4">
                <TabsTrigger value="content">
                  <FileText className="w-4 h-4 mr-2" />
                  课程内容
                </TabsTrigger>
                <TabsTrigger value="questions">
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  测试题目 ({questions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content">
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                      <Label>课时标题</Label>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        飞书链接
                      </Label>
                      <Input
                        value={editFeishuUrl}
                        onChange={(e) => setEditFeishuUrl(e.target.value)}
                        placeholder="https://..."
                      />
                      <p className="text-xs text-muted-foreground">
                        配置后，用户点击此课时将直接跳转到飞书文档
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>课程内容 (Markdown)</Label>
                      <p className="text-xs text-muted-foreground">
                        如已配置飞书链接，此内容仅作备用
                      </p>
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={16}
                        className="font-mono text-sm"
                        placeholder="支持 Markdown 格式，包括标题、列表、代码块、链接等..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="questions">
                <Card className="border-0 shadow-md">
                  <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg">测试题目</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowAIDialog(true)}
                        className="bg-linear-to-r from-violet-500/10 to-purple-500/10 border-violet-200 hover:border-violet-300 hover:bg-violet-50"
                      >
                        <Sparkles className="w-4 h-4 mr-2 text-violet-500" />
                        AI出题
                      </Button>
                      <Button onClick={handleAddQuestion}>
                        <Plus className="w-4 h-4 mr-2" />
                        添加题目
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {questions.length === 0 ? (
                      <div className="text-center py-12">
                        <ClipboardCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">还没有测试题目</p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={handleAddQuestion}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          添加第一道题
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {questions.map((question, index) => (
                          <Card key={question.id} className="bg-muted/50">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium text-primary shrink-0">
                                  {index + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="secondary">
                                      {question.type === 'single'
                                        ? '单选题'
                                        : question.type === 'multiple'
                                        ? '多选题'
                                        : '判断题'}
                                    </Badge>
                                  </div>
                                  <p className="font-medium mb-2">
                                    {question.question_text}
                                  </p>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    {question.options.map((option) => (
                                      <div
                                        key={option.id}
                                        className={`px-2 py-1 rounded ${
                                          (Array.isArray(question.correct_answer)
                                            ? question.correct_answer.includes(option.id)
                                            : question.correct_answer === option.id)
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-background'
                                        }`}
                                      >
                                        {option.id.toUpperCase()}. {option.text}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditQuestion(question)}
                                  >
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteQuestion(question.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <Card className="lg:col-span-3 border-0 shadow-md">
            <CardContent className="py-16 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">请选择一个课时进行编辑</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Question Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? '编辑题目' : '添加题目'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>题目类型</Label>
              <Select
                value={questionForm.type}
                onValueChange={(value: QuestionType) => {
                  setQuestionForm({
                    ...questionForm,
                    type: value,
                    correct_answer: value === 'multiple' ? [] : '',
                    options:
                      value === 'boolean'
                        ? [
                            { id: 'true', text: '正确' },
                            { id: 'false', text: '错误' },
                          ]
                        : [
                            { id: 'a', text: '' },
                            { id: 'b', text: '' },
                            { id: 'c', text: '' },
                            { id: 'd', text: '' },
                          ],
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">单选题</SelectItem>
                  <SelectItem value="multiple">多选题</SelectItem>
                  <SelectItem value="boolean">判断题</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>题目内容</Label>
              <Textarea
                value={questionForm.question_text}
                onChange={(e) =>
                  setQuestionForm({
                    ...questionForm,
                    question_text: e.target.value,
                  })
                }
                rows={3}
                placeholder="输入题目内容"
              />
            </div>

            <div className="space-y-2">
              <Label>选项</Label>
              {questionForm.options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <span className="w-8 text-center font-medium">
                    {option.id.toUpperCase()}.
                  </span>
                  {questionForm.type === 'boolean' ? (
                    <span className="flex-1 py-2">{option.text}</span>
                  ) : (
                    <Input
                      value={option.text}
                      onChange={(e) => {
                        const newOptions = [...questionForm.options];
                        newOptions[index] = { ...option, text: e.target.value };
                        setQuestionForm({ ...questionForm, options: newOptions });
                      }}
                      placeholder={`选项 ${option.id.toUpperCase()}`}
                    />
                  )}
                  {questionForm.type === 'multiple' ? (
                    <Checkbox
                      checked={(questionForm.correct_answer as string[]).includes(option.id)}
                      onCheckedChange={(checked) => {
                        const current = questionForm.correct_answer as string[];
                        setQuestionForm({
                          ...questionForm,
                          correct_answer: checked
                            ? [...current, option.id]
                            : current.filter((a) => a !== option.id),
                        });
                      }}
                    />
                  ) : (
                    <input
                      type="radio"
                      name="correct"
                      checked={questionForm.correct_answer === option.id}
                      onChange={() =>
                        setQuestionForm({
                          ...questionForm,
                          correct_answer: option.id,
                        })
                      }
                      className="w-4 h-4"
                    />
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                选中右侧的单选/复选框来标记正确答案
              </p>
            </div>

            <div className="space-y-2">
              <Label>解析 (可选)</Label>
              <Textarea
                value={questionForm.explanation}
                onChange={(e) =>
                  setQuestionForm({
                    ...questionForm,
                    explanation: e.target.value,
                  })
                }
                rows={2}
                placeholder="输入答案解析"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowQuestionDialog(false)}
            >
              取消
            </Button>
            <Button onClick={handleSaveQuestion}>
              {editingQuestion ? '更新' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Question Generation Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" />
              AI智能出题
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label>选择题目类型</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ai-single"
                    checked={aiQuestionTypes.includes('single')}
                    onCheckedChange={() => toggleAIQuestionType('single')}
                  />
                  <label
                    htmlFor="ai-single"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    单选题
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ai-multiple"
                    checked={aiQuestionTypes.includes('multiple')}
                    onCheckedChange={() => toggleAIQuestionType('multiple')}
                  />
                  <label
                    htmlFor="ai-multiple"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    多选题
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ai-boolean"
                    checked={aiQuestionTypes.includes('boolean')}
                    onCheckedChange={() => toggleAIQuestionType('boolean')}
                  />
                  <label
                    htmlFor="ai-boolean"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    判断题
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>题目数量</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={aiQuestionCount}
                  onChange={(e) => setAIQuestionCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">道题目 (1-20)</span>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">
                AI将根据当前课时的内容自动生成测试题目。生成的题目会自动添加到题目列表中。
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAIDialog(false)}
              disabled={aiGenerating}
            >
              取消
            </Button>
            <Button
              onClick={handleAIGenerate}
              disabled={aiGenerating || aiQuestionTypes.length === 0}
              className="bg-linear-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
            >
              {aiGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  开始生成
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
