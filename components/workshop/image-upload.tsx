'use client';

import { useState, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  validateImage, 
  compressImage, 
  formatFileSize,
  getImageDimensions,
} from '@/lib/validations/image';
import { uploadImage } from '@/lib/supabase/storage';

interface ImageUploadProps {
  onUpload: (url: string) => void;
  isUploading?: boolean;
  disabled?: boolean;
  /** 是否自动压缩图片 */
  autoCompress?: boolean;
  /** 已存在的图片URL */
  existingUrl?: string;
}

export function ImageUpload({
  onUpload,
  isUploading = false,
  disabled = false,
  autoCompress = true,
  existingUrl,
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(existingUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ size: string; dimensions: string } | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFile = async (file: File) => {
    setValidationError(null);
    setProcessing(true);

    try {
      // 验证图片
      const validation = await validateImage(file);
      
      if (!validation.valid) {
        setValidationError(validation.error || '图片验证失败');
        setProcessing(false);
        return;
      }

      let processedFile = file;
      let finalWidth = validation.width;
      let finalHeight = validation.height;

      // 如果启用自动压缩且文件大于 1MB，进行压缩
      if (autoCompress && file.size > 1024 * 1024) {
        try {
          processedFile = await compressImage(file, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.85,
          });
          
          // 获取压缩后的实际尺寸（压缩可能会调整图片大小）
          const compressedDimensions = await getImageDimensions(processedFile);
          finalWidth = compressedDimensions.width;
          finalHeight = compressedDimensions.height;
          
          toast.success(`图片已压缩：${formatFileSize(file.size)} → ${formatFileSize(processedFile.size)}`);
        } catch {
          // 压缩失败，使用原文件
          console.warn('图片压缩失败，使用原文件');
        }
      }

      setSelectedFile(processedFile);
      setFileInfo({
        size: formatFileSize(processedFile.size),
        dimensions: `${finalWidth}x${finalHeight}`,
      });

      // 创建预览
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(processedFile);
    } catch (error) {
      setValidationError('图片处理失败，请重试');
    } finally {
      setProcessing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      // 上传文件到 Supabase Storage
      const url = await uploadImage(selectedFile);
      
      if (!url) {
        toast.error('图片上传失败，请重试');
        return;
      }

      // 调用回调函数，传递 URL
      onUpload(url);
      
      // 清理状态
      setPreview(null);
      setSelectedFile(null);
      setFileInfo(null);
    } catch (error) {
      toast.error('图片上传失败');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setSelectedFile(null);
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {!preview ? (
          <m.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              'relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300',
              dragActive
                ? 'border-primary bg-primary/5 scale-[1.02]'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              disabled={disabled}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <m.div
                animate={{ y: dragActive ? -5 : 0 }}
                className={cn(
                  'w-16 h-16 rounded-2xl flex items-center justify-center transition-colors',
                  dragActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                <Upload className="w-8 h-8" />
              </m.div>
              <div>
                <p className="font-medium text-foreground">
                  {dragActive ? '松开以上传图片' : '拖拽图片到这里'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  或点击选择图片上传
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                支持 JPG, PNG, GIF, WebP 格式，最大 5MB
              </p>
              {validationError && (
                <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
                  {validationError}
                </div>
              )}
              {processing && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm mt-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  处理中...
                </div>
              )}
            </div>
          </m.div>
        ) : (
          <m.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-2xl overflow-hidden bg-muted"
          >
            <img
              src={preview}
              alt="Preview"
              className="w-full h-64 object-cover"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-3 right-3 rounded-full shadow-lg"
              onClick={clearPreview}
              disabled={isUploading}
              aria-label="移除图片"
            >
              <X className="w-4 h-4" />
            </Button>
            {fileInfo && (
              <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
                {fileInfo.dimensions} · {fileInfo.size}
              </div>
            )}
          </m.div>
        )}
      </AnimatePresence>

      {preview && (
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            onClick={handleSubmit}
            disabled={uploading || isUploading || disabled}
            className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            {(uploading || isUploading) ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                确认打卡
              </>
            )}
          </Button>
        </m.div>
      )}
    </div>
  );
}
