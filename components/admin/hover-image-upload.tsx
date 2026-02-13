'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Camera, Upload, X, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { validateImage, compressImage, formatFileSize } from '@/lib/validations/image';
import { uploadImage } from '@/lib/supabase/storage';
import { STORAGE_BUCKET } from '@/lib/db-tables';
import { logger } from '@/lib/logger';

interface HoverImageUploadProps {
  imageUrl: string;
  onUpload: (url: string) => void;
  onClear: () => void;
  folder: string;
  aspectRatio: 'square' | 'video';
  label: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function HoverImageUpload({
  imageUrl,
  onUpload,
  onClear,
  folder,
  aspectRatio,
  label,
  loading = false,
  disabled = false,
  className,
}: HoverImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aspectClass = aspectRatio === 'square' ? 'aspect-square' : 'aspect-video';

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setUploading(true);

    try {
      const validation = await validateImage(file, { maxSize: 5 * 1024 * 1024 });
      if (!validation.valid) {
        setError(validation.error || '图片验证失败');
        setUploading(false);
        return;
      }

      let processedFile = file;
      if (file.size > 1024 * 1024) {
        try {
          processedFile = await compressImage(file, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.85,
          });
          toast.success(`已压缩：${formatFileSize(file.size)} → ${formatFileSize(processedFile.size)}`);
        } catch {
          logger.warn('压缩失败，使用原文件');
        }
      }

      const url = await uploadImage(processedFile, STORAGE_BUCKET, folder);
      if (!url) {
        toast.error('上传失败，请重试');
        return;
      }

      onUpload(url);
    } catch {
      toast.error('上传失败');
    } finally {
      setUploading(false);
    }
  }, [folder, onUpload]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear();
    setError(null);
  };

  const hasImage = !!imageUrl;

  return (
    <div className={cn('relative', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled || uploading}
      />

      <div
        role="button"
        tabIndex={disabled || uploading ? -1 : 0}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
        className={cn(
          'group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200',
          aspectClass,
          !hasImage && 'border-2 border-dashed border-muted-foreground/25 hover:border-primary/50',
          hasImage && 'bg-muted',
          (disabled || uploading) && 'cursor-not-allowed opacity-60',
        )}
      >
        {hasImage ? (
          <>
            <Image
              src={imageUrl}
              alt={label}
              fill
              className="object-cover"
              unoptimized
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 flex items-center justify-center transition-all duration-200">
              <div className="opacity-0 group-hover:opacity-100 flex flex-col items-center gap-1 text-white transition-opacity duration-200">
                <Camera className="w-6 h-6" />
                <span className="text-xs font-medium">点击替换</span>
              </div>
            </div>
            {/* Clear button */}
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled || uploading}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-destructive text-white flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
              aria-label={`移除${label}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-xs">获取中...</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6" />
                <span className="text-xs">点击上传{label}</span>
              </>
            )}
          </div>
        )}

        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-20">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              上传中...
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-destructive text-xs mt-1.5">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
