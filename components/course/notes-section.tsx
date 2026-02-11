'use client';

import { useState, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { BookOpen, Send, Eye, EyeOff, Edit3, Trash2, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DB } from '@/lib/db-tables';
import { awardPointsAction } from '@/app/actions/points';
import { useCachedQuery, invalidateCache } from '@/hooks/use-cached-query';
import { useUser } from '@/contexts/user-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LikeButton } from '@/components/common/like-button';
import { MarkdownRenderer } from '@/components/course/markdown-renderer';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

interface Note {
  id: string;
  user_id: string;
  lesson_id: string | null;
  course_id: string | null;
  content: string;
  is_public: boolean;
  like_count: number;
  created_at: string;
  user: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
}

interface NotesSectionProps {
  courseId: string;
  lessonId?: string;
}

/**
 * 学习笔记墙
 * 
 * 显示课程/章节下的公开笔记，支持创建、编辑、删除。
 * Markdown 编辑 + 预览切换。积分: 上传公开笔记 +80 分。
 */
export function NotesSection({ courseId, lessonId }: NotesSectionProps) {
  const { user } = useUser();
  const [isCreating, setIsCreating] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [showMyNotes, setShowMyNotes] = useState(false);

  const cacheKey = `notes-${courseId}-${lessonId || 'all'}`;

  // Fetch public notes
  const { data: notes, refetch } = useCachedQuery<Note[]>(
    cacheKey,
    async () => {
      const supabase = createClient();
      let query = supabase
        .from(DB.course_notes)
        .select(`
          id, user_id, lesson_id, content, is_public, like_count, created_at,
          user:${DB.users} (id, name, avatar_url)
        `)
        .eq('is_public', true)
        .order('like_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      if (lessonId) {
        query = query.eq('lesson_id', lessonId);
      } else {
        query = query.eq('course_id', courseId);
      }

      const { data } = await query;
      return (data as unknown as Note[]) ?? [];
    },
    { ttl: 30000 }
  );

  // Fetch user's own notes
  const { data: myNotes, refetch: refetchMyNotes } = useCachedQuery<Note[]>(
    `my-notes-${courseId}-${user?.id}`,
    async () => {
      if (!user) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from(DB.course_notes)
        .select(`
          id, user_id, lesson_id, content, is_public, like_count, created_at,
          user:${DB.users} (id, name, avatar_url)
        `)
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      return (data as unknown as Note[]) ?? [];
    },
    { ttl: 30000, enabled: !!user }
  );

  const handleSubmit = useCallback(async () => {
    if (!user) return;
    if (content.trim().length < 50) {
      toast.error('笔记内容至少 50 字');
      return;
    }
    if (content.length > 5000) {
      toast.error('笔记内容不能超过 5000 字');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      if (editingNoteId) {
        // Update existing note
        const { error } = await supabase
          .from(DB.course_notes)
          .update({ content, is_public: isPublic })
          .eq('id', editingNoteId)
          .eq('user_id', user.id);
        if (error) throw error;
        toast.success('笔记已更新');
      } else {
        // Create new note
        const { error } = await supabase
          .from(DB.course_notes)
          .insert({
            user_id: user.id,
            course_id: courseId,
            lesson_id: lessonId || null,
            content,
            is_public: isPublic,
          });
        if (error) throw error;

        // Award points for public notes via Server Action
        if (isPublic) {
          await awardPointsAction('NOTE_UPLOAD', courseId, 'course', '上传学习笔记');
          toast.success('笔记发布成功！+80 积分');
        } else {
          toast.success('笔记已保存（私密）');
        }
      }

      setContent('');
      setIsPublic(false);
      setIsCreating(false);
      setEditingNoteId(null);
      setShowPreview(false);
      invalidateCache(cacheKey);
      invalidateCache(`my-notes-${courseId}-${user.id}`);
      refetch();
      refetchMyNotes();
    } catch {
      toast.error('保存失败');
    } finally {
      setIsSubmitting(false);
    }
  }, [user, content, isPublic, editingNoteId, courseId, lessonId, cacheKey, refetch, refetchMyNotes]);

  const handleDelete = useCallback(async () => {
    if (!user || !deleteNoteId) return;
    try {
      const supabase = createClient();
      await supabase.from(DB.course_notes).delete().eq('id', deleteNoteId).eq('user_id', user.id);
      toast.success('笔记已删除');
      invalidateCache(cacheKey);
      invalidateCache(`my-notes-${courseId}-${user.id}`);
      refetch();
      refetchMyNotes();
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleteNoteId(null);
    }
  }, [user, deleteNoteId, courseId, cacheKey, refetch, refetchMyNotes]);

  const startEdit = (note: Note) => {
    setContent(note.content);
    setIsPublic(note.is_public);
    setEditingNoteId(note.id);
    setIsCreating(true);
    setShowPreview(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-card-foreground flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-success" />
          学习笔记
          {notes && notes.length > 0 && (
            <span className="text-xs text-muted-foreground">({notes.length})</span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {user && (myNotes?.length ?? 0) > 0 && (
            <button
              onClick={() => setShowMyNotes(!showMyNotes)}
              className="text-xs text-muted-foreground hover:text-card-foreground transition-colors flex items-center gap-1"
            >
              我的笔记 ({myNotes?.length})
              <ChevronDown className={`w-3 h-3 transition-transform ${showMyNotes ? 'rotate-180' : ''}`} />
            </button>
          )}
          {user && !isCreating && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5"
              onClick={() => { setIsCreating(true); setEditingNoteId(null); setContent(''); }}
            >
              <Edit3 className="w-3 h-3" />
              写笔记
            </Button>
          )}
        </div>
      </div>

      {/* Create/Edit form */}
      <AnimatePresence>
        {isCreating && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-border/50 bg-card shadow-sm p-4 space-y-3"
          >
            {/* Toggle edit/preview */}
            <div className="flex items-center gap-2 border-b border-border/50 pb-2">
              <button
                onClick={() => setShowPreview(false)}
                className={`text-xs px-3 py-1 rounded-md ${!showPreview ? 'bg-primary/10 text-card-foreground' : 'text-muted-foreground'}`}
              >
                编辑
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className={`text-xs px-3 py-1 rounded-md ${showPreview ? 'bg-primary/10 text-card-foreground' : 'text-muted-foreground'}`}
              >
                预览
              </button>
            </div>

            {showPreview ? (
              <div className="min-h-[120px] px-1 prose prose-invert prose-sm max-w-none">
                <MarkdownRenderer content={content || '*暂无内容*'} />
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="用 Markdown 写下你的学习笔记..."
                className="w-full h-40 px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-card-foreground placeholder:text-muted-foreground/50 text-sm resize-none focus:outline-none focus:border-primary/30 transition-colors font-mono"
              />
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPublic(!isPublic)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-card-foreground transition-colors"
                >
                  {isPublic ? <Eye className="w-3.5 h-3.5 text-success" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {isPublic ? '公开 (可获得积分)' : '私密'}
                </button>
                <span className={`text-xs ${content.length < 50 ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                  {content.length} / 5000
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setIsCreating(false); setEditingNoteId(null); setContent(''); }}
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  variant="brand"
                  disabled={content.trim().length < 50 || isSubmitting}
                  onClick={handleSubmit}
                  className="gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  {isSubmitting ? '保存中...' : editingNoteId ? '更新' : '发布'}
                </Button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* My notes (collapsible) */}
      <AnimatePresence>
        {showMyNotes && myNotes && myNotes.length > 0 && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <p className="text-xs text-muted-foreground font-medium">我的笔记</p>
            {myNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                isOwner
                onEdit={() => startEdit(note)}
                onDelete={() => setDeleteNoteId(note.id)}
              />
            ))}
          </m.div>
        )}
      </AnimatePresence>

      {/* Public notes list */}
      {(!notes || notes.length === 0) && !isCreating ? (
        <EmptyState
          title="暂无公开笔记"
          description="写下你的学习笔记并公开分享，帮助其他同学"
        />
      ) : (
        <div className="space-y-3">
          {notes?.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isOwner={note.user_id === user?.id}
              onEdit={() => startEdit(note)}
              onDelete={() => setDeleteNoteId(note.id)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteNoteId}
        onOpenChange={(open) => { if (!open) setDeleteNoteId(null); }}
        onConfirm={handleDelete}
        title="删除笔记"
        description="确定要删除这篇笔记吗？此操作不可撤销。"
        confirmText="删除"
        variant="destructive"
      />
    </div>
  );
}

function NoteCard({
  note,
  isOwner,
  onEdit,
  onDelete,
}: {
  note: Note;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = note.content.length > 300;

  return (
    <div className="rounded-xl border border-border/50 bg-card shadow-sm p-4 space-y-3">
      {/* Author */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="w-6 h-6">
            <AvatarImage src={note.user?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs bg-muted">{note.user?.name?.[0] ?? 'U'}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{note.user?.name ?? '匿名'}</span>
          <span className="text-xs text-muted-foreground/70">
            {new Date(note.created_at).toLocaleDateString('zh-CN')}
          </span>
          {!note.is_public && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">私密</span>
          )}
        </div>
        {isOwner && (
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="p-1.5 rounded text-muted-foreground/70 hover:text-card-foreground hover:bg-muted/30 transition-colors">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded text-muted-foreground/70 hover:text-red-400 hover:bg-red-500/5 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`prose prose-invert prose-sm max-w-none ${isLong && !expanded ? 'line-clamp-6' : ''}`}>
        <MarkdownRenderer content={note.content} />
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:text-primary transition-colors"
        >
          {expanded ? '收起' : '展开全文'}
        </button>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 pt-2 border-t border-border/50">
        <LikeButton targetType="note" targetId={note.id} initialCount={note.like_count} size="sm" />
      </div>
    </div>
  );
}
