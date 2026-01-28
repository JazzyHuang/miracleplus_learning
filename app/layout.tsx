import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "奇绩学习",
    startupImage: [
      {
        url: "/splash/splash-2048x2732.png",
        media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/splash-1668x2388.png",
        media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/splash-1536x2048.png",
        media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/splash-1125x2436.png",
        media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/splash-1242x2688.png",
        media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)",
      },
    ],
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-120.png", sizes: "120x120", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/icons/safari-pinned-tab.svg", color: "#5E6AD2" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: BASE_URL,
    siteName: "Miracle Learning",
    title: "Miracle Learning | 奇绩创坛学习平台",
    description: "系统化学习创业知识，与优秀创业者一起成长",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Miracle Learning - 奇绩创坛学习平台",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Miracle Learning | 奇绩创坛学习平台",
    description: "系统化学习创业知识，与优秀创业者一起成长",
    images: ["/og-default.png"],
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
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
