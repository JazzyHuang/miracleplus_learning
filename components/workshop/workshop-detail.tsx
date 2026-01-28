'use client';

import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import {
  CalendarDays,
  ArrowLeft,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Lightbulb,
  Plus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { ImageUpload, CheckinGallery, SubmissionForm, SubmissionCard } from '@/components/workshop';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createPointsService } from '@/lib/points/service';
import { createBadgesService } from '@/lib/points/badges';
import { POINT_RULES } from '@/lib/points/config';
import type { Workshop, WorkshopCheckin, User } from '@/types/database';

interface Submission {
  id: string;
  user_id: string;
  workshop_id: string;
  title: string;
  content_type: 'image' | 'document' | 'link' | 'text';
  content_url: string | null;
  content_text: string | null;
  description: string | null;
  tags: string[] | null;
  version: number;
  status: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  user: User;
}

interface WorkshopDetailProps {
  workshop: Workshop | null;
  initialCheckins: WorkshopCheckin[];
}

export function WorkshopDetail({ workshop, initialCheckins }: WorkshopDetailProps) {
  // Use user from context - already fetched in layout, no duplicate request
  const { user } = useUser();
  const [checkins, setCheckins] = useState<WorkshopCheckin[]>(initialCheckins);
  const [userCheckin, setUserCheckin] = useState<WorkshopCheckin | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);

  // Check if user has already checked in
  useEffect(() => {
    if (user && checkins.length > 0) {
      const existingCheckin = checkins.find((c) => c.user_id === user.id);
      setUserCheckin(existingCheckin || null);
    }
  }, [user, checkins]);

  // 获取作品提交列表
  const fetchSubmissions = async () => {
    if (!workshop) return;
    
    setLoadingSubmissions(true);
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('workshop_submissions')
      .select(`
        *,
        user:users (id, name, email, avatar_url)
      `)
      .eq('workshop_id', workshop.id)
      .in('status', ['approved', 'featured'])
      .order('like_count', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSubmissions(data as Submission[]);
    }
    setLoadingSubmissions(false);
  };

  useEffect(() => {
    if (workshop) {
      fetchSubmissions();
    }
  }, [workshop?.id]);

  /**
   * 处理图片上传和打卡
   * P1 修复：添加乐观更新错误回滚机制
   */
  const handleUpload = async (file: File) => {
    if (!user || !workshop) return;

    setUploading(true);
    const supabase = createClient();

    // 保存之前的状态用于回滚
    const previousCheckins = checkins;
    const previousUserCheckin = userCheckin;

    // 用于记录已上传的文件路径（如果需要清理）
    let uploadedFilePath: string | null = null;

    try {
      // Upload image to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${workshop.id}-${Date.now()}.${fileExt}`;
      const filePath = `checkins/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      uploadedFilePath = filePath;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      // Create checkin record
      const { data: checkinData, error: checkinError } = await supabase
        .from('workshop_checkins')
        .insert({
          user_id: user.id,
          workshop_id: workshop.id,
          image_url: publicUrl,
        })
        .select('*, user:users(*)')
        .single();

      if (checkinError) {
        throw checkinError;
      }

      // Update state（成功后才更新）
      setCheckins([checkinData, ...checkins]);
      setUserCheckin(checkinData);
      
      // 发放打卡积分
      const pointsService = createPointsService(supabase);
      const pointsResult = await pointsService.addPoints(
        user.id,
        'WORKSHOP_CHECKIN',
        workshop.id,
        'workshop',
        `Workshop 打卡: ${workshop.title}`
      );
      
      if (pointsResult.success && pointsResult.pointsAdded > 0) {
        toast.success(
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span>打卡成功！获得 {pointsResult.pointsAdded} 积分</span>
          </div>
        );
        
        // 检查并解锁勋章
        const badgesService = createBadgesService(supabase);
        const unlockedBadges = await badgesService.checkAndUnlockBadges(user.id);
        if (unlockedBadges.length > 0) {
          setTimeout(() => {
            unlockedBadges.forEach((badge) => {
              toast.success(
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏅</span>
                  <span>解锁勋章：{badge.name}</span>
                </div>
              );
            });
          }, 1000);
        }
      } else {
        toast.success('打卡成功！');
      }
    } catch (error: unknown) {
      console.error('Upload error:', error);
      
      // 回滚状态
      setCheckins(previousCheckins);
      setUserCheckin(previousUserCheckin);

      // 如果图片已上传但数据库操作失败，尝试删除已上传的图片
      if (uploadedFilePath) {
        try {
          await supabase.storage.from('images').remove([uploadedFilePath]);
        } catch (cleanupError) {
          console.error('Failed to cleanup uploaded file:', cleanupError);
        }
      }

      const errorMessage = error instanceof Error ? error.message : '上传失败，请重试';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  if (!workshop) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-muted-foreground">活动不存在</p>
        <Link href="/workshop">
          <Button className="mt-4">返回活动列表</Button>
        </Link>
      </div>
    );
  }

  const eventDate = new Date(workshop.event_date);
  const isToday = format(eventDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto"
    >
      {/* Back Button */}
      <Link href="/workshop">
        <Button variant="ghost" className="mb-6 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回活动列表
        </Button>
      </Link>

      {/* Workshop Header */}
      <Card className="border border-border shadow-soft overflow-hidden mb-8">
        {/* Cover Image */}
        {workshop.cover_image && (
          <div className="relative h-64 overflow-hidden">
            <Image
              src={workshop.cover_image}
              alt={workshop.title}
              fill
              sizes="(max-width: 768px) 100vw, 800px"
              className="object-cover"
              priority
            />
          </div>
        )}
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl font-semibold mb-2">{workshop.title}</CardTitle>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CalendarDays className="w-4 h-4" />
                  <span>{format(eventDate, 'yyyy年MM月dd日 EEEE', { locale: zhCN })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{checkins.length} 人已打卡</span>
                </div>
              </div>
            </div>
            {isToday && (
              <Badge className="bg-foreground text-background">今日活动</Badge>
            )}
          </div>
        </CardHeader>
        {workshop.description && (
          <CardContent>
            <p className="text-muted-foreground">{workshop.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="checkin" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="checkin">上传打卡</TabsTrigger>
          <TabsTrigger value="gallery">打卡记录 ({checkins.length})</TabsTrigger>
          <TabsTrigger value="submissions" className="flex items-center gap-1">
            <Lightbulb className="w-4 h-4" />
            灵感实验室 ({submissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checkin">
          <Card className="border border-border shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {userCheckin ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-foreground" />
                    已完成打卡
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    上传打卡照片
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userCheckin ? (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden h-96">
                    <Image
                      src={userCheckin.image_url}
                      alt="Your checkin"
                      fill
                      sizes="(max-width: 768px) 100vw, 600px"
                      className="object-cover"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    打卡时间：{format(new Date(userCheckin.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                  </p>
                </div>
              ) : (
                <ImageUpload
                  onUpload={handleUpload}
                  isUploading={uploading}
                  disabled={!workshop.is_active}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gallery">
          <Card className="border border-border shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">所有打卡记录</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckinGallery checkins={checkins} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions">
          <Card className="border border-border shadow-soft">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                灵感实验室
              </CardTitle>
              {user && (
                <Button onClick={() => setShowSubmissionForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  提交作品
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!user && (
                <div className="text-center py-8 text-muted-foreground">
                  登录后可以提交作品
                </div>
              )}
              
              {user && submissions.length === 0 && !loadingSubmissions && (
                <div className="text-center py-12">
                  <Lightbulb className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">还没有作品</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    成为第一个分享学习成果的人吧！
                  </p>
                  <Button 
                    className="mt-4" 
                    variant="outline"
                    onClick={() => setShowSubmissionForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    提交第一个作品
                  </Button>
                </div>
              )}

              {loadingSubmissions && (
                <div className="text-center py-8 text-muted-foreground">
                  加载中...
                </div>
              )}

              {submissions.length > 0 && (
                <div className="space-y-4">
                  {/* TOP3 作品 */}
                  {submissions.slice(0, 3).map((submission, index) => (
                    <SubmissionCard
                      key={submission.id}
                      submission={submission}
                      isTop3={index < 3 && submission.like_count > 0}
                      rank={index + 1}
                      currentUserId={user?.id}
                      onRefresh={fetchSubmissions}
                    />
                  ))}
                  
                  {/* 其他作品 */}
                  {submissions.slice(3).map((submission) => (
                    <SubmissionCard
                      key={submission.id}
                      submission={submission}
                      currentUserId={user?.id}
                      onRefresh={fetchSubmissions}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 作品提交表单 */}
      {workshop && (
        <SubmissionForm
          workshopId={workshop.id}
          open={showSubmissionForm}
          onClose={() => setShowSubmissionForm(false)}
          onSuccess={fetchSubmissions}
        />
      )}
    </m.div>
  );
}
