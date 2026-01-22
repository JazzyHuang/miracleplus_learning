'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { ImageUpload, CheckinGallery } from '@/components/workshop';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Workshop, WorkshopCheckin } from '@/types/database';

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

  // Check if user has already checked in
  useEffect(() => {
    if (user && checkins.length > 0) {
      const existingCheckin = checkins.find((c) => c.user_id === user.id);
      setUserCheckin(existingCheckin || null);
    }
  }, [user, checkins]);

  const handleUpload = async (file: File) => {
    if (!user || !workshop) return;

    setUploading(true);
    const supabase = createClient();

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

      // Update state
      setCheckins([checkinData, ...checkins]);
      setUserCheckin(checkinData);
      toast.success('打卡成功！');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || '上传失败，请重试');
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
    <motion.div
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="checkin">上传打卡</TabsTrigger>
          <TabsTrigger value="gallery">打卡记录 ({checkins.length})</TabsTrigger>
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
      </Tabs>
    </motion.div>
  );
}
