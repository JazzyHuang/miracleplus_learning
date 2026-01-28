import type { MetadataRoute } from 'next';

/**
 * Web App Manifest
 * 用于 PWA 安装和显示配置
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
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    screenshots: [
      {
        src: '/screenshot-wide.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide',
      },
      {
        src: '/screenshot-narrow.png',
        sizes: '750x1334',
        type: 'image/png',
        form_factor: 'narrow',
      },
    ],
  };
}
