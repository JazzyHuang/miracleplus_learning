import type { MetadataRoute } from 'next';

/**
 * Web App Manifest
 * 用于 PWA 安装和显示配置
 * 
 * 注意：PWA 图标需要运行 `npm run generate-icons` 生成
 * 或手动将 SVG 图标转换为 PNG 格式
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Miracle Learning',
    short_name: 'MiracleLearning',
    description: '奇绩创坛 AI 学习平台 - 成为 AI 时代的领航者',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    orientation: 'portrait-primary',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
