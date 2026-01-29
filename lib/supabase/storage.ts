import { createClient } from './client';
import { validateImageBasic } from '@/lib/validations/image';

/** 允许的图片扩展名 */
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

/** 允许的 MIME 类型 */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/** 文件魔数签名 */
const MAGIC_NUMBERS: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header
};

/**
 * 验证文件内容的魔数签名
 * @param file 文件对象
 * @returns 验证结果和检测到的类型
 */
async function validateFileMagicNumber(
  file: File
): Promise<{ valid: boolean; detectedType?: string; error?: string }> {
  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // 检查每种已知类型
    for (const [mimeType, signature] of Object.entries(MAGIC_NUMBERS)) {
      const matches = signature.every((byte, index) => bytes[index] === byte);
      if (matches) {
        // 对于 webp，还需要检查 WEBP 标识（偏移 8-11）
        if (mimeType === 'image/webp') {
          const webpSignature = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
          const isWebp = webpSignature.every((byte, index) => bytes[8 + index] === byte);
          if (!isWebp) continue;
        }
        return { valid: true, detectedType: mimeType };
      }
    }
    
    return { 
      valid: false, 
      error: '文件内容与声明的类型不匹配，可能是伪造的图片文件' 
    };
  } catch {
    return { valid: false, error: '无法读取文件内容' };
  }
}

/**
 * 生成安全的文件名
 * 使用 crypto.randomUUID 替代 Math.random 以提高安全性
 */
function generateSecureFileName(originalExt: string): string {
  const timestamp = Date.now();
  // 在支持的环境使用 crypto.randomUUID，否则回退到随机字符串
  const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, '').substring(0, 12)
    : Math.random().toString(36).substring(2, 14);
  return `${timestamp}-${randomPart}.${originalExt}`;
}

/**
 * 上传图片到 Supabase Storage
 * @param file 图片文件
 * @param bucket Storage bucket 名称
 * @returns 上传成功返回公开 URL，失败返回 null
 */
export async function uploadImage(
  file: File,
  bucket: string = 'images'
): Promise<string | null> {
  try {
    // 1. 基础验证（大小和声明的 MIME 类型）
    const basicValidation = validateImageBasic(file, {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ALLOWED_MIME_TYPES,
    });
    
    if (!basicValidation.valid) {
      console.error('图片验证失败:', basicValidation.error);
      return null;
    }
    
    // 2. 验证文件扩展名
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
      console.error('不允许的文件扩展名:', fileExt);
      return null;
    }
    
    // 3. 验证文件魔数（防止伪造文件类型）
    const magicValidation = await validateFileMagicNumber(file);
    if (!magicValidation.valid) {
      console.error('文件魔数验证失败:', magicValidation.error);
      return null;
    }
    
    // 4. 验证扩展名与实际类型匹配
    const extToMime: Record<string, string[]> = {
      'jpg': ['image/jpeg'],
      'jpeg': ['image/jpeg'],
      'png': ['image/png'],
      'gif': ['image/gif'],
      'webp': ['image/webp'],
    };
    
    if (magicValidation.detectedType && 
        !extToMime[fileExt]?.includes(magicValidation.detectedType)) {
      console.error('文件扩展名与实际类型不匹配:', {
        extension: fileExt,
        detectedType: magicValidation.detectedType,
      });
      return null;
    }
    
    const supabase = createClient();
    
    // 5. 生成安全的唯一文件名
    const fileName = generateSecureFileName(fileExt);
    const filePath = `workshop/${fileName}`;

    // 6. 上传文件
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: magicValidation.detectedType, // 使用检测到的类型
      });

    if (uploadError) {
      console.error('上传失败:', uploadError);
      return null;
    }

    // 7. 获取公开 URL
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('上传图片时发生错误:', error);
    return null;
  }
}

/**
 * 删除图片从 Supabase Storage
 * @param url 图片 URL
 * @param bucket Storage bucket 名称
 */
export async function deleteImage(
  url: string,
  bucket: string = 'images'
): Promise<boolean> {
  try {
    // 验证 URL 格式
    if (!url || typeof url !== 'string') {
      console.error('无效的 URL');
      return false;
    }
    
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      console.error('URL 格式无效:', url);
      return false;
    }
    
    // 验证 URL 是否来自 Supabase Storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error('SUPABASE_URL 未配置');
      return false;
    }
    
    const expectedPathPrefix = `/storage/v1/object/public/${bucket}/`;
    
    // 检查 URL 的 host 是否匹配 Supabase URL
    const supabaseHost = new URL(supabaseUrl).host;
    if (urlObj.host !== supabaseHost) {
      console.error('URL 不属于配置的 Supabase 实例:', {
        urlHost: urlObj.host,
        expectedHost: supabaseHost,
      });
      return false;
    }
    
    // 检查路径是否以预期前缀开头
    if (!urlObj.pathname.startsWith(expectedPathPrefix)) {
      console.error('URL 路径不属于允许的存储桶:', {
        pathname: urlObj.pathname,
        expectedPrefix: expectedPathPrefix,
      });
      return false;
    }
    
    // 安全提取文件路径
    const filePath = urlObj.pathname.slice(expectedPathPrefix.length);
    
    // 验证文件路径不包含路径遍历字符
    if (filePath.includes('..') || filePath.includes('//')) {
      console.error('文件路径包含非法字符:', filePath);
      return false;
    }
    
    const supabase = createClient();

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('删除失败:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('删除图片时发生错误:', error);
    return false;
  }
}
