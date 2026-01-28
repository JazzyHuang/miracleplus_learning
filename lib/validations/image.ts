/**
 * 图片上传验证工具
 * 提供文件大小、类型、尺寸验证和压缩功能
 * 
 * 注意：此模块中部分函数仅在客户端可用（使用浏览器 API）
 * 服务端图片处理应使用 sharp 等库
 */

/** 检查是否在浏览器环境 */
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

/** 图片验证配置 */
export interface ImageValidationConfig {
  /** 最大文件大小（字节），默认 5MB */
  maxSize?: number;
  /** 允许的 MIME 类型 */
  allowedTypes?: string[];
  /** 最大宽度/高度（像素） */
  maxDimension?: number;
  /** 最小宽度/高度（像素） */
  minDimension?: number;
}

/** 图片验证结果 */
export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  width?: number;
  height?: number;
  size?: number;
  type?: string;
}

/** 默认配置 */
const DEFAULT_CONFIG: Required<ImageValidationConfig> = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxDimension: 4000,
  minDimension: 10,
};

/**
 * 确保函数在浏览器环境中运行
 * @throws 如果在服务端调用
 */
function assertBrowser(functionName: string): void {
  if (!isBrowser) {
    throw new Error(
      `${functionName} 仅在浏览器环境中可用。` +
      '服务端图片处理请使用 sharp 等库。'
    );
  }
}

/**
 * 验证图片文件（仅基础验证，不检查尺寸）
 * 可在服务端和客户端使用
 */
export function validateImageBasic(
  file: { size: number; type: string },
  config: Pick<ImageValidationConfig, 'maxSize' | 'allowedTypes'> = {}
): ImageValidationResult {
  const { maxSize = DEFAULT_CONFIG.maxSize, allowedTypes = DEFAULT_CONFIG.allowedTypes } = config;

  // 1. 检查文件大小
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1);
    return {
      valid: false,
      error: `文件大小不能超过 ${maxSizeMB}MB`,
      size: file.size,
      type: file.type,
    };
  }

  // 2. 检查文件类型
  if (!allowedTypes.includes(file.type)) {
    const typeNames = allowedTypes
      .map((t) => t.replace('image/', '').toUpperCase())
      .join('、');
    return {
      valid: false,
      error: `仅支持 ${typeNames} 格式`,
      size: file.size,
      type: file.type,
    };
  }

  return {
    valid: true,
    size: file.size,
    type: file.type,
  };
}

/**
 * 验证图片文件（完整验证，包括尺寸检查）
 * 仅在浏览器环境可用
 * @throws 如果在服务端调用
 */
export async function validateImage(
  file: File,
  config: ImageValidationConfig = {}
): Promise<ImageValidationResult> {
  assertBrowser('validateImage');

  const {
    maxSize,
    allowedTypes,
    maxDimension,
    minDimension,
  } = { ...DEFAULT_CONFIG, ...config };

  // 1. 基础验证（大小和类型）
  const basicResult = validateImageBasic(file, { maxSize, allowedTypes });
  if (!basicResult.valid) {
    return basicResult;
  }

  // 2. 检查图片尺寸
  try {
    const dimensions = await getImageDimensions(file);
    
    if (dimensions.width > maxDimension || dimensions.height > maxDimension) {
      return {
        valid: false,
        error: `图片尺寸不能超过 ${maxDimension}x${maxDimension} 像素`,
        ...dimensions,
        size: file.size,
        type: file.type,
      };
    }

    if (dimensions.width < minDimension || dimensions.height < minDimension) {
      return {
        valid: false,
        error: `图片尺寸不能小于 ${minDimension}x${minDimension} 像素`,
        ...dimensions,
        size: file.size,
        type: file.type,
      };
    }

    return {
      valid: true,
      ...dimensions,
      size: file.size,
      type: file.type,
    };
  } catch {
    return {
      valid: false,
      error: '无法读取图片尺寸，文件可能已损坏',
      size: file.size,
      type: file.type,
    };
  }
}

/**
 * 获取图片尺寸
 * 仅在浏览器环境可用
 * @throws 如果在服务端调用
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  assertBrowser('getImageDimensions');

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/** 图片压缩选项 */
export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputType?: string;
}

/**
 * 压缩图片（客户端）
 * 使用 Canvas API 压缩图片
 * 仅在浏览器环境可用
 * @throws 如果在服务端调用
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  assertBrowser('compressImage');

  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    outputType = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // 计算缩放后的尺寸
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // 创建 Canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // 绘制图片
      ctx.drawImage(img, 0, 0, width, height);

      // 转换为 Blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          // 创建新的 File 对象
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, '.jpg'),
            { type: outputType }
          );

          resolve(compressedFile);
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * 服务端图片处理提示
 * 服务端应使用 sharp 等库处理图片
 * 
 * @example
 * // 服务端使用 sharp
 * import sharp from 'sharp';
 * 
 * async function compressImageServer(buffer: Buffer): Promise<Buffer> {
 *   return sharp(buffer)
 *     .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
 *     .jpeg({ quality: 80 })
 *     .toBuffer();
 * }
 */
export const SERVER_IMAGE_PROCESSING_NOTE = `
服务端图片处理应使用 sharp 库：
npm install sharp

示例代码：
import sharp from 'sharp';

async function compressImageServer(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
}
`;

/**
 * 生成安全的文件名
 * 移除特殊字符，添加时间戳
 */
export function generateSafeFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const safeName = originalName
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
    .substring(0, 50);

  return `${safeName}_${timestamp}_${random}.${extension}`;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
