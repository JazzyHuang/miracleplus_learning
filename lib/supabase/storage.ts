import { createClient } from './client';

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
    const supabase = createClient();
    
    // 生成唯一文件名
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `workshop/${fileName}`;

    // 上传文件
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('上传失败:', uploadError);
      return null;
    }

    // 获取公开 URL
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
    const supabase = createClient();
    
    // 从 URL 提取文件路径
    const urlParts = url.split('/');
    const filePath = urlParts.slice(urlParts.indexOf('workshop')).join('/');

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
