'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { m } from 'framer-motion';
import { toast } from 'sonner';
import {
  Sparkles,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Star,
  MoreHorizontal,
  Heart,
  MessageSquare,
  Bookmark,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  createAITool,
  updateAITool,
  deleteAITool,
  setAIToolFeatured,
  setAIToolActive,
} from '@/app/actions/admin-ai-tools';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/dialog';
import { ImageUpload } from '@/components/workshop/image-upload';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { Switch } from '@/components/ui/switch';
import { createAIToolsService } from '@/lib/ai-tools';
import { cn } from '@/lib/utils';
import type { AITool, ToolCategory, PricingType } from '@/types/database';

const pricingOptions = [
  { value: 'free', label: '免费' },
  { value: 'freemium', label: '免费增值' },
  { value: 'paid', label: '付费' },
];

const pricingColors: Record<string, string> = {
  free: 'bg-success/10 text-success',
  freemium: 'bg-info/10 text-info',
  paid: 'bg-warning/10 text-warning',
};

const defaultFormData = {
  name: '',
  slug: '',
  category_id: '',
  description: '',
  long_description: '',
  website_url: '',
  logo_url: '',
  preview_image_url: '',
  pricing_type: 'free' as PricingType,
  pricing_details: '',
  pros: [] as string[],
  cons: [] as string[],
  tags: [] as string[],
  is_featured: false,
  is_active: true,
};

export default function AdminAIToolsPage() {
  const [tools, setTools] = useState<AITool[]>([]);
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingTool, setEditingTool] = useState<AITool | null>(null);
  const [saving, setSaving] = useState(false);
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [formData, setFormData] = useState(defaultFormData);
  const [tagInput, setTagInput] = useState('');
  const [proInput, setProInput] = useState('');
  const [conInput, setConInput] = useState('');

  const fetchData = async () => {
    const supabase = createClient();
    const service = createAIToolsService(supabase);
    const [toolsData, catsData] = await Promise.all([
      service.getAllToolsAdmin(),
      service.getAllCategoriesAdmin(),
    ]);
    setTools(toolsData);
    setCategories(catsData);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const handleOpenDialog = (tool?: AITool) => {
    if (tool) {
      setEditingTool(tool);
      setFormData({
        name: tool.name,
        slug: tool.slug,
        category_id: tool.category_id || '',
        description: tool.description || '',
        long_description: tool.long_description || '',
        website_url: tool.website_url || '',
        logo_url: tool.logo_url || '',
        preview_image_url: tool.preview_image_url || '',
        pricing_type: tool.pricing_type,
        pricing_details: tool.pricing_details || '',
        pros: tool.pros || [],
        cons: tool.cons || [],
        tags: tool.tags || [],
        is_featured: tool.is_featured,
        is_active: tool.is_active,
      });
    } else {
      setEditingTool(null);
      setFormData(defaultFormData);
    }
    setTagInput('');
    setProInput('');
    setConInput('');
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      toast.error('请填写名称和 slug');
      return;
    }
    setSaving(true);
    if (editingTool) {
      const result = await updateAITool(editingTool.id, formData);
      if (!result.success) {
        toast.error(result.error ?? '更新失败');
      } else {
        toast.success('工具已更新');
        setShowDialog(false);
        fetchData();
      }
    } else {
      const result = await createAITool(formData);
      if (!result.success) {
        toast.error(result.error ?? '创建失败');
      } else {
        toast.success('工具创建成功');
        setShowDialog(false);
        fetchData();
      }
    }
    setSaving(false);
  };

  const handleToggleActive = async (tool: AITool) => {
    const result = await setAIToolActive(tool.id, !tool.is_active);
    if (!result.success) {
      toast.error(result.error ?? '操作失败');
    } else {
      setTools(tools.map((t) => t.id === tool.id ? { ...t, is_active: !t.is_active } : t));
      toast.success(tool.is_active ? '已下架' : '已上架');
    }
  };

  const handleToggleFeatured = async (tool: AITool) => {
    const result = await setAIToolFeatured(tool.id, !tool.is_featured);
    if (!result.success) {
      toast.error(result.error ?? '操作失败');
    } else {
      setTools(tools.map((t) => t.id === tool.id ? { ...t, is_featured: !t.is_featured } : t));
      toast.success(tool.is_featured ? '已取消精选' : '已设为精选');
    }
  };

  const handleDelete = async (toolId: string) => {
    const confirmed = await confirm({
      title: '删除工具',
      description: '确定要删除这个 AI 工具吗？相关评分、灵感碎片等数据也会被删除。此操作无法撤销。',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'destructive',
    });
    if (!confirmed) return;
    const result = await deleteAITool(toolId);
    if (!result.success) {
      toast.error(result.error ?? '删除失败');
    } else {
      setTools(tools.filter((t) => t.id !== toolId));
      toast.success('工具已删除');
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput('');
    }
  };

  const addPro = () => {
    const pro = proInput.trim();
    if (pro && formData.pros.length < 10) {
      setFormData({ ...formData, pros: [...formData.pros, pro] });
      setProInput('');
    }
  };

  const addCon = () => {
    const con = conInput.trim();
    if (con && formData.cons.length < 10) {
      setFormData({ ...formData, cons: [...formData.cons, con] });
      setConInput('');
    }
  };

  const filteredTools = tools.filter((tool) =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      {ConfirmDialogComponent}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">AI 工具管理</h1>
          <p className="text-muted-foreground mt-1">共 {tools.length} 款工具</p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-primary/80" onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          添加工具
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="搜索工具名称或 slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
      </div>

      {/* Tool List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filteredTools.length === 0 ? (
        <div className="text-center py-16">
          <Sparkles className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? '没有找到匹配的工具' : '还没有添加工具'}
          </p>
        </div>
      ) : (
        <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {filteredTools.map((tool, index) => (
            <m.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Logo */}
                    <div className="relative w-12 h-12 rounded-lg bg-muted shrink-0 overflow-hidden">
                      {tool.logo_url ? (
                        <Image src={tool.logo_url} alt={tool.name} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-bold">{tool.name[0]}</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold truncate">{tool.name}</h3>
                        <Badge variant={tool.is_active ? 'default' : 'secondary'}>
                          {tool.is_active ? '上架' : '下架'}
                        </Badge>
                        {tool.is_featured && (
                          <Badge className="bg-warning text-white"><Star className="w-3 h-3 mr-1" />精选</Badge>
                        )}
                        <Badge className={cn('text-xs', pricingColors[tool.pricing_type])}>
                          {pricingOptions.find((p) => p.value === tool.pricing_type)?.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="truncate max-w-[200px]">{tool.slug}</span>
                        {tool.category && <span>{tool.category.name}</span>}
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-warning" />
                          {tool.avg_rating > 0 ? tool.avg_rating.toFixed(1) : '-'}
                          ({tool.rating_count})
                        </div>
                        <div className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{tool.like_count}</div>
                        <div className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{tool.comment_count}</div>
                        <div className="flex items-center gap-1"><Bookmark className="w-3.5 h-3.5" />{tool.bookmark_count}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(tool)}>
                        <Edit className="w-4 h-4 mr-1" />编辑
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleToggleFeatured(tool)}>
                            <Star className="w-4 h-4 mr-2" />
                            {tool.is_featured ? '取消精选' : '设为精选'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(tool)}>
                            {tool.is_active ? <><EyeOff className="w-4 h-4 mr-2" />下架</> : <><Eye className="w-4 h-4 mr-2" />上架</>}
                          </DropdownMenuItem>
                          {tool.website_url && (
                            <DropdownMenuItem asChild>
                              <a href={tool.website_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 mr-2" />访问官网
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(tool.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />删除
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

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingTool ? '编辑工具' : '添加新工具'}</DialogTitle>
            <DialogDescription>填写 AI 工具信息</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-2">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">名称 *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="ChatGPT" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input id="slug" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="chatgpt" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>分类</Label>
                  <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>定价类型</Label>
                  <Select value={formData.pricing_type} onValueChange={(v) => setFormData({ ...formData, pricing_type: v as PricingType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {pricingOptions.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">简介</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="简短描述..." rows={2} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="long_description">详细描述</Label>
                <Textarea id="long_description" value={formData.long_description} onChange={(e) => setFormData({ ...formData, long_description: e.target.value })} placeholder="详细介绍..." rows={4} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website_url">官网链接</Label>
                <Input id="website_url" value={formData.website_url} onChange={(e) => setFormData({ ...formData, website_url: e.target.value })} placeholder="https://..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricing_details">定价说明</Label>
                <Input id="pricing_details" value={formData.pricing_details} onChange={(e) => setFormData({ ...formData, pricing_details: e.target.value })} placeholder="免费版有限制，Pro 版 $20/月" />
              </div>

              {/* 图片 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <ImageUpload onUpload={(url) => setFormData({ ...formData, logo_url: url })} existingUrl={formData.logo_url} folder="tools" autoUpload aspectRatio="square" />
                </div>
                <div className="space-y-2">
                  <Label>预览图</Label>
                  <ImageUpload onUpload={(url) => setFormData({ ...formData, preview_image_url: url })} existingUrl={formData.preview_image_url} folder="tools" autoUpload aspectRatio="video" />
                </div>
              </div>

              {/* 优势/不足 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>优势</Label>
                  <div className="flex gap-2">
                    <Input value={proInput} onChange={(e) => setProInput(e.target.value)} placeholder="添加优势" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPro())} />
                    <Button type="button" variant="outline" size="sm" onClick={addPro}>添加</Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.pros.map((pro, i) => (
                      <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => setFormData({ ...formData, pros: formData.pros.filter((_, j) => j !== i) })}>
                        {pro} ×
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>不足</Label>
                  <div className="flex gap-2">
                    <Input value={conInput} onChange={(e) => setConInput(e.target.value)} placeholder="添加不足" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCon())} />
                    <Button type="button" variant="outline" size="sm" onClick={addCon}>添加</Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.cons.map((con, i) => (
                      <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => setFormData({ ...formData, cons: formData.cons.filter((_, j) => j !== i) })}>
                        {con} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* 标签 */}
              <div className="space-y-2">
                <Label>标签</Label>
                <div className="flex gap-2">
                  <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="添加标签" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                  <Button type="button" variant="outline" size="sm" onClick={addTag}>添加</Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => setFormData({ ...formData, tags: formData.tags.filter((_, j) => j !== i) })}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 开关 */}
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Switch id="is_featured" checked={formData.is_featured} onCheckedChange={(v) => setFormData({ ...formData, is_featured: v })} />
                  <Label htmlFor="is_featured">精选</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="is_active" checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                  <Label htmlFor="is_active">上架</Label>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : editingTool ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
