import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand-colors';

/**
 * Web App Manifest
 * 用于 PWA 安装和显示配置
 *
 * PWA 图标最佳实践：
 * - 72x72: Android ldpi (deprecated but still useful)
 * - 96x96: Android mdpi
 * - 128x128: Android tvdpi
 * - 144x144: Android hdpi
 * - 152x152: iPad
 * - 192x192: Android xhdpi, Chrome PWA 标准
 * - 384x384: Android xxhdpi
 * - 512x512: Android xxxhdpi, Chrome PWA 标准
 * - 1024x1024: 用于 splash screen
 *
 * Maskable 图标：图标需要有安全边距，确保在自适应图标系统下完整显示
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Miracle Learning',
    short_name: 'MiracleLearning',
    description: '奇绩创坛 AI 学习平台 - 成为 AI 时代的领航者',
    start_url: '/',
    display: 'standalone',
    background_color: BRAND.themeColorDark,
    theme_color: BRAND.themeColorDark,
    orientation: 'portrait-primary',
    categories: ['education', 'productivity'],
    // 图标集（仅包含实际存在的文件）
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: '我的课程',
        short_name: '课程',
        url: '/courses',
        description: '查看学习进度和课程列表',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: '排行榜',
        short_name: '排行榜',
        url: '/leaderboard',
        description: '查看积分排行榜',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: '讨论区',
        short_name: '讨论',
        url: '/discussions',
        description: '参与社区讨论',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'AI 工具',
        short_name: 'AI工具',
        url: '/ai-tools',
        description: '探索 AI 工具库',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  };
}
