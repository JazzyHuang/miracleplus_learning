import type { NextConfig } from "next";
import withBundleAnalyzer from '@next/bundle-analyzer';
import withSerwist from '@serwist/next';

const isDev = process.env.NODE_ENV === 'development';

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Security headers configuration
  async headers() {
    // 安全头列表 — 始终应用
    const securityHeaders = [
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
    ];

    // CSP 已迁移到 middleware.ts（使用 nonce 替代 unsafe-inline）
    // 开发模式下 Turbopack 使用 HMR WebSocket、动态 CSS 注入等机制，
    // 严格的 CSP 会阻碍这些机制导致首次加载样式丢失

    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // 静态资源缓存 — 生产环境长期缓存，开发环境不缓存
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: isDev
              ? 'no-store, must-revalidate'
              : 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // 字体文件长期缓存
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Image optimization configuration
  // 使用自定义加载器：绕过 Next.js 服务端 SSRF 私有 IP 检查
  // 当 Supabase / Google / WordPress 等域名解析为私有 IP 时，
  // 内置 /_next/image 会拒绝请求。自定义加载器让浏览器直接加载图片。
  images: {
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
    // remotePatterns 在 custom loader 模式下不生效，保留作为文档参考
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname: '/s2/favicons**',
      },
      {
        protocol: 'https',
        hostname: 's.wordpress.com',
        pathname: '/mshots/v1/**',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1440],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // React Compiler: 自动记忆化，消除手动 memo/useMemo/useCallback
  reactCompiler: true,

  // 分级缓存生命周期策略（stale/revalidate/expire 三段式）
  // 注意：cacheComponents 与 dynamic 路由不兼容
  // 使用 unstable_cache 替代 'use cache' 指令来实现缓存
  cacheComponents: false,
  cacheLife: {
    courses: { stale: 60, revalidate: 60, expire: 3600 },
    workshops: { stale: 30, revalidate: 30, expire: 1800 },
    aiTools: { stale: 300, revalidate: 300, expire: 86400 },
    userStats: { stale: 60, revalidate: 60, expire: 600 },
    weekly: { stale: 3600, revalidate: 3600, expire: 86400 },
    admin: { stale: 5, revalidate: 5, expire: 60 },
  },

  // Turbopack 配置
  // 注意：Turbopack 在开发模式下与 Framer Motion 12.x 存在 HMR 兼容性问题
  // 开发模式请使用: pnpm dev --webpack
  // 生产构建使用 Turbopack 获得更快速度
  turbopack: {},

  // 开发模式：禁用 webpack 文件系统缓存，改用内存缓存
  // 防止 server/client 编译产物不一致导致 hydration mismatch
  webpack: isDev
    ? (config) => {
        config.cache = { type: 'memory' as const };
        return config;
      }
    : undefined,

  // Experimental features for better performance
  experimental: {
    // View Transitions API: 原生浏览器页面过渡动画（0 KB JS 开销）
    viewTransition: true,
    // 优化第三方包导入，减少 bundle 大小
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'framer-motion',
      // 'recharts' - 移除，使用动态导入按需加载
      'react-markdown',
      'react-masonry-css',
      '@radix-ui/react-accordion',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      // '@radix-ui/react-tooltip' removed — not installed
      'sonner',
      '@hookform/resolvers',
      'class-variance-authority',
      'tailwind-merge',
    ],
    // 客户端 Router Cache — 提升导航速度
    // 开发模式下设为 0，避免代码变更后 RSC payload 缓存导致 hydration mismatch
    staleTimes: isDev
      ? { dynamic: 0, static: 0 }
      : { dynamic: 60, static: 300 },
  },

  // Disable powered by header
  poweredByHeader: false,

  // Compress responses
  compress: true,
};

// 组合所有插件：Serwist (Service Worker) + Bundle Analyzer
// 开发模式下禁用 SW，避免缓存 Server Action 导致哈希不匹配错误
export default withSerwist({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // 开发模式下禁用 SW（避免缓存 Server Action 哈希）
  // 生产环境启用 SW 以获得 PWA 功能
  disable: isDev,
})(withAnalyzer(nextConfig));
