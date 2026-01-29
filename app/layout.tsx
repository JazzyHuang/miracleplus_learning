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
    images: [
      {
        url: "/og-default.svg",
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
    images: ["/og-default.svg"],
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
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
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
