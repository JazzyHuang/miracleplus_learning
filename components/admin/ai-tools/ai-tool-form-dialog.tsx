'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Globe, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import { createAITool, updateAITool } from '@/app/actions/admin-ai-tools';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { HoverImageUpload } from '@/components/admin/hover-image-upload';
import { pricingOptions } from './constants';
import type { AITool, ToolCategory, PricingType } from '@/types/database';

const defaultFormData = {
  name: '', slug: '', category_id: '', description: '', long_description: '',
  website_url: '', logo_url: '', preview_image_url: '',
  pricing_type: 'free' as PricingType, pricing_details: '',
  pros: [] as string[], cons: [] as string[], tags: [] as string[],
  is_featured: false, is_active: true,
};

interface AIToolFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: AITool | null;
  categories: ToolCategory[];
  onSuccess: () => void;
}

export function AIToolFormDialog({ open, onOpenChange, tool, categories, onSuccess }: AIToolFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);
  const [tagInput, setTagInput] = useState('');
  const [proInput, setProInput] = useState('');
  const [conInput, setConInput] = useState('');
  const [fetchingImages, setFetchingImages] = useState(false);
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync form when dialog opens
  useEffect(() => {
    if (!open) return;
    if (tool) {
      setFormData({
        name: tool.name, slug: tool.slug, category_id: tool.category_id || '',
        description: tool.description || '', long_description: tool.long_description || '',
        website_url: tool.website_url || '', logo_url: tool.logo_url || '',
        preview_image_url: tool.preview_image_url || '', pricing_type: tool.pricing_type,
        pricing_details: tool.pricing_details || '', pros: tool.pros || [],
        cons: tool.cons || [], tags: tool.tags || [],
        is_featured: tool.is_featured, is_active: tool.is_active,
      });
    } else {
      setFormData(defaultFormData);
    }
    setTagInput(''); setProInput(''); setConInput('');
  }, [open, tool]);

  // Cleanup fetch timer on unmount
  useEffect(() => {
    return () => { if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current); };
  }, []);

  const handleFetchImages = async (urlOverride?: string) => {
    const url = urlOverride || formData.website_url;
    if (!url) { toast.error('请先填写官网链接'); return; }
    setFetchingImages(true);
    try {
      const res = await fetch('/api/admin/fetch-og-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || '获取失败'); return; }
      const updates: Partial<typeof formData> = {};
      if (data.logoUrl && !formData.logo_url) updates.logo_url = data.logoUrl;
      if (data.previewUrl && !formData.preview_image_url) updates.preview_image_url = data.previewUrl;
      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
        toast.success('图片获取成功');
      } else if (data.warnings?.length) {
        toast.warning(data.warnings.join('；'));
      } else {
        toast.info('未获取到新图片（已有图片不会被覆盖）');
      }
    } catch (error) { logger.error('Fetch OG images failed:', error); toast.error('网络错误'); }
    finally { setFetchingImages(false); }
  };

  const handleWebsiteUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, website_url: url }));
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    if (url.match(/^https?:\/\/[a-zA-Z0-9]/) && !formData.logo_url && !formData.preview_image_url) {
      fetchTimerRef.current = setTimeout(() => handleFetchImages(url), 800);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) { toast.error('请填写名称和 slug'); return; }
    setSaving(true);
    const result = tool
      ? await updateAITool(tool.id, formData)
      : await createAITool(formData);
    if (!result.success) {
      toast.error(result.error ?? '操作失败');
    } else {
      toast.success(tool ? '工具已更新' : '工具创建成功');
      onOpenChange(false);
      onSuccess();
    }
    setSaving(false);
  };

  const addItem = (type: 'tags' | 'pros' | 'cons', input: string, setInput: (v: string) => void) => {
    const val = input.trim();
    if (!val || formData[type].length >= 10) return;
    if (type === 'tags' && formData.tags.includes(val)) return;
    setFormData({ ...formData, [type]: [...formData[type], val] });
    setInput('');
  };

  const removeItem = (type: 'tags' | 'pros' | 'cons', index: number) => {
    setFormData({ ...formData, [type]: formData[type].filter((_, j) => j !== index) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{tool ? '编辑工具' : '添加新工具'}</DialogTitle>
          <DialogDescription>填写 AI 工具信息</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ait-name">名称 *</Label>
                <Input id="ait-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="ChatGPT" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ait-slug">Slug *</Label>
                <Input id="ait-slug" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="chatgpt" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>分类</Label>
                <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
                  <SelectContent>{categories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>定价类型</Label>
                <Select value={formData.pricing_type} onValueChange={(v) => setFormData({ ...formData, pricing_type: v as PricingType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{pricingOptions.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ait-desc">简介</Label>
              <Textarea id="ait-desc" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="简短描述..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ait-long-desc">详细描述</Label>
              <Textarea id="ait-long-desc" value={formData.long_description} onChange={(e) => setFormData({ ...formData, long_description: e.target.value })} placeholder="详细介绍..." rows={4} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ait-url">官网链接</Label>
              <div className="flex gap-2">
                <Input id="ait-url" value={formData.website_url} onChange={(e) => handleWebsiteUrlChange(e.target.value)} placeholder="https://..." className="flex-1" />
                <Button type="button" variant="outline" size="sm" onClick={() => handleFetchImages()} disabled={fetchingImages || !formData.website_url} className="shrink-0">
                  {fetchingImages ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Globe className="w-4 h-4 mr-1" />}获取图片
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ait-pricing">定价说明</Label>
              <Input id="ait-pricing" value={formData.pricing_details} onChange={(e) => setFormData({ ...formData, pricing_details: e.target.value })} placeholder="免费版有限制，Pro 版 $20/月" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Logo</Label>
                <HoverImageUpload imageUrl={formData.logo_url} onUpload={(url) => setFormData(prev => ({ ...prev, logo_url: url }))} onClear={() => setFormData(prev => ({ ...prev, logo_url: '' }))} folder="tools" aspectRatio="square" label="Logo" loading={fetchingImages} />
              </div>
              <div className="space-y-2">
                <Label>预览图</Label>
                <HoverImageUpload imageUrl={formData.preview_image_url} onUpload={(url) => setFormData(prev => ({ ...prev, preview_image_url: url }))} onClear={() => setFormData(prev => ({ ...prev, preview_image_url: '' }))} folder="tools" aspectRatio="video" label="预览图" loading={fetchingImages} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>优势</Label>
                <div className="flex gap-2">
                  <Input value={proInput} onChange={(e) => setProInput(e.target.value)} placeholder="添加优势" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('pros', proInput, setProInput))} />
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem('pros', proInput, setProInput)}>添加</Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.pros.map((pro, i) => <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeItem('pros', i)}>{pro} ×</Badge>)}
                </div>
              </div>
              <div className="space-y-2">
                <Label>不足</Label>
                <div className="flex gap-2">
                  <Input value={conInput} onChange={(e) => setConInput(e.target.value)} placeholder="添加不足" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('cons', conInput, setConInput))} />
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem('cons', conInput, setConInput)}>添加</Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.cons.map((con, i) => <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeItem('cons', i)}>{con} ×</Badge>)}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>标签</Label>
              <div className="flex gap-2">
                <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="添加标签" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('tags', tagInput, setTagInput))} />
                <Button type="button" variant="outline" size="sm" onClick={() => addItem('tags', tagInput, setTagInput)}>添加</Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {formData.tags.map((tag, i) => <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeItem('tags', i)}>{tag} ×</Badge>)}
              </div>
            </div>
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch id="ait-featured" checked={formData.is_featured} onCheckedChange={(v) => setFormData({ ...formData, is_featured: v })} />
                <Label htmlFor="ait-featured">精选</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="ait-active" checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                <Label htmlFor="ait-active">上架</Label>
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : tool ? '更新' : '创建'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
