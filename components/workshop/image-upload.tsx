'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { m, AnimatePresence } from 'framer-motion';
import { Upload, X, Loader2, CheckCircle2, AlertCircle, ImageIcon, RefreshCw } from 'lucide-react';
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
import { logger } from '@/lib/logger';

interface ImageUploadProps {
  onUpload: (url: string) => void;
  isUploading?: boolean;
  disabled?: boolean;
  /** 是否自动压缩图片 */
  autoCompress?: boolean;
  /** 已存在的图片URL */
  existingUrl?: string;
  /** 确认按钮文字（仅在 autoUpload=false 时显示） */
  submitText?: string;
  /** 存储文件夹路径（如 'workshop', 'covers', 'avatars'） */
  folder?: string;
  /** 是否选择图片后自动上传（无需点击确认按钮） */
  autoUpload?: boolean;
  /** 宽高比：'video' 为 16:9，'square' 为 1:1，默认不限制 */
  aspectRatio?: 'video' | 'square';
  /** 紧凑模式（用于头像等小尺寸场景） */
  compact?: boolean;
  /** 最大文件大小（字节），默认 5MB */
  maxSize?: number;
  /** 自定义 className */
  className?: string;
}

export function ImageUpload({
  onUpload,
  isUploading = false,
  disabled = false,
  autoCompress = true,
  existingUrl,
  submitText = '确认上传',
  folder = 'workshop',
  autoUpload = false,
  aspectRatio,
  compact = false,
  maxSize,
  className,
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(existingUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ size: string; dimensions: string } | null>(null);
  // Track whether preview is from an existing URL (not a new file selection)
  const [isExistingPreview, setIsExistingPreview] = useState(!!existingUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync existingUrl changes from parent
  useEffect(() => {
    if (existingUrl) {
      setPreview(existingUrl);
      setIsExistingPreview(true);
      setSelectedFile(null);
      setFileInfo(null);
    }
  }, [existingUrl]);

  const maxSizeBytes = maxSize ?? 5 * 1024 * 1024;
  const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(0);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const performUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImage(file, 'images', folder);
      
      if (!url) {
        toast.error('图片上传失败，请重试');
        return;
      }

      onUpload(url);
      
      // After auto-upload, keep the preview and mark as existing
      setPreview(url);
      setIsExistingPreview(true);
      setSelectedFile(null);
      setFileInfo(null);
    } catch (error) {
      toast.error('图片上传失败');
      logger.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  }, [folder, onUpload]);

  const handleFile = useCallback(async (file: File) => {
    setValidationError(null);
    setProcessing(true);

    try {
      // 验证图片
      const validation = await validateImage(file, {
        maxSize: maxSizeBytes,
      });
      
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
          
          const compressedDimensions = await getImageDimensions(processedFile);
          finalWidth = compressedDimensions.width;
          finalHeight = compressedDimensions.height;
          
          toast.success(`图片已压缩：${formatFileSize(file.size)} → ${formatFileSize(processedFile.size)}`);
        } catch {
          logger.warn('图片压缩失败，使用原文件');
        }
      }

      setSelectedFile(processedFile);
      setIsExistingPreview(false);
      setFileInfo({
        size: formatFileSize(processedFile.size),
        dimensions: `${finalWidth}x${finalHeight}`,
      });

      // 性能优化：使用 URL.createObjectURL 替代 FileReader.readAsDataURL
      // 避免 base64 编码导致的内存浪费（5MB 图片 → 6.7MB 字符串）
      const previewUrl = URL.createObjectURL(processedFile);
      setPreview(previewUrl);

      // 自动上传模式
      if (autoUpload) {
        // Use setTimeout to let preview state update first
        setTimeout(() => performUpload(processedFile), 0);
      }
    } catch {
      setValidationError('图片处理失败，请重试');
    } finally {
      setProcessing(false);
    }
  }, [autoCompress, autoUpload, maxSizeBytes, performUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    await performUpload(selectedFile);
  };

  const clearPreview = () => {
    // 释放 blob URL 避免内存泄漏
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setSelectedFile(null);
    setFileInfo(null);
    setIsExistingPreview(false);
    // If clearing an existing image, notify parent with empty string
    if (isExistingPreview) {
      onUpload('');
    }
  };

  const handleReplace = () => {
    // Trigger file input click to select a new image
    fileInputRef.current?.click();
  };

  // Compact avatar mode
  if (compact) {
    return (
      <div className={cn('flex flex-col items-center gap-3', className)}>
        <div
          className={cn(
            'relative group',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className={cn(
            'relative w-24 h-24 rounded-full overflow-hidden bg-muted border-2 transition-all duration-300',
            dragActive
              ? 'border-primary scale-105'
              : 'border-transparent hover:border-primary/50',
          )}>
            {preview ? (
              <Image
                src={preview}
                alt="Preview"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <label
            htmlFor="compact-avatar-upload"
            className={cn(
              'absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-lg',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              (uploading || processing) && 'pointer-events-none'
            )}
          >
            {(uploading || processing) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
          </label>
          <input
            ref={fileInputRef}
            id="compact-avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInputChange}
            disabled={disabled || uploading || processing}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {dragActive ? '松开以上传' : '点击或拖拽上传头像'}
        </p>
        {validationError && (
          <div className="flex items-center gap-2 text-destructive text-xs">
            <AlertCircle className="w-3 h-3" />
            {validationError}
          </div>
        )}
        {uploading && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            上传中...
          </div>
        )}
      </div>
    );
  }

  // Determine preview image height class based on aspect ratio
  const previewHeightClass = aspectRatio === 'square'
    ? 'aspect-square'
    : aspectRatio === 'video'
      ? 'aspect-video'
      : 'h-64';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Hidden file input for replace action */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled || uploading || processing}
      />

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
                支持 JPG, PNG, GIF, WebP 格式，最大 {maxSizeMB}MB
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
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Image
              src={preview}
              alt="Preview"
              fill
              className={cn('object-cover', previewHeightClass)}
              unoptimized
            />
            {/* Overlay with actions */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full shadow-lg bg-background/50 text-foreground hover:bg-background/70 border-0"
                onClick={handleReplace}
                disabled={isUploading || uploading}
                aria-label="替换图片"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="rounded-full shadow-lg"
                onClick={clearPreview}
                disabled={isUploading || uploading}
                aria-label="移除图片"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            {fileInfo && (
              <div className="absolute bottom-3 left-3 bg-background/60 text-foreground text-xs px-2 py-1 rounded">
                {fileInfo.dimensions} · {fileInfo.size}
              </div>
            )}
            {/* Uploading overlay */}
            {(uploading || (autoUpload && processing)) && (
              <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                <div className="flex items-center gap-2 text-foreground text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  上传中...
                </div>
              </div>
            )}
            {/* Drag overlay on existing preview */}
            {dragActive && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center border-2 border-dashed border-primary rounded-2xl">
                <p className="text-primary font-medium bg-white/90 px-4 py-2 rounded-lg shadow">
                  松开以替换图片
                </p>
              </div>
            )}
          </m.div>
        )}
      </AnimatePresence>

      {/* Submit button: only show when NOT autoUpload, file is selected, and preview is from a new file (not existing) */}
      {!autoUpload && preview && selectedFile && !isExistingPreview && (
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
                {submitText}
              </>
            )}
          </Button>
        </m.div>
      )}
    </div>
  );
}
