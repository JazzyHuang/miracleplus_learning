import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { getAuthUserWithProfile } from "@/lib/supabase/auth";
import { assertEnv } from "@/lib/env";
import "./globals.css";

// Validate required environment variables at startup
assertEnv();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,  // 减少 CLS
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],  // 精简：移除未使用的 600 权重，减少字体文件大小
  display: "swap",
  preload: false,  // 性能优化：Mono 字体仅在代码块中使用，延迟加载减少首屏字体量
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://miracle.learning';

/**
 * 全局元数据配置
 * Phase 7: 完善 SEO 和社交分享
 */
export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Miracle Learning | 奇绩创坛学习平台",
    template: "%s | Miracle Learning",
  },
  description: "奇绩创坛创业者学习平台，提供系统化的创业课程和Workshop活动，与优秀创业者一起成长",
  keywords: ["创业", "学习", "奇绩创坛", "创业课程", "Workshop", "创业培训"],
  authors: [{ name: "奇绩创坛" }],
  creator: "奇绩创坛",
  publisher: "奇绩创坛",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "奇绩学习",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    other: [
      { rel: "mask-icon", url: "/icon.svg", color: "#000000" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: BASE_URL,
    siteName: "Miracle Learning",
    title: "Miracle Learning | 奇绩创坛学习平台",
    description: "系统化学习创业知识，与优秀创业者一起成长",
    // OG 图片由 app/opengraph-image.tsx 自动生成 PNG 格式
  },
  twitter: {
    card: "summary_large_image",
    title: "Miracle Learning | 奇绩创坛学习平台",
    description: "系统化学习创业知识，与优秀创业者一起成长",
    // Twitter 图片由 app/opengraph-image.tsx 自动生成
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // 需要时添加验证码
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
  alternates: {
    canonical: BASE_URL,
    languages: {
      "zh-CN": BASE_URL,
    },
  },
  category: "education",
};

/**
 * Viewport 配置
 * Next.js 14+ 要求单独导出 viewport，不能嵌套在 metadata 中
 * Next.js 16: themeColor 必须在 viewport 中定义
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#1C1A18" },
  ],
};

/**
 * 异步用户加载组件
 * 在 Suspense 内获取用户数据，避免阻塞整个页面渲染
 */
async function UserLoader({ children }: { children: React.ReactNode }) {
  const { profile: user } = await getAuthUserWithProfile().catch(() => ({ profile: null }));
  return (
    <Providers initialUser={user}>
      {children}
    </Providers>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 提取 Supabase 域名用于 preconnect
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseDomain = supabaseUrl ? new URL(supabaseUrl).origin : null;

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* Preconnect to Supabase for faster API calls */}
        {supabaseDomain && (
          <>
            <link rel="preconnect" href={supabaseDomain} />
            <link rel="dns-prefetch" href={supabaseDomain} />
          </>
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <UserLoader>
          {children}
          <Toaster position="top-center" richColors />
        </UserLoader>
      </body>
    </html>
  );
}
