import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization configuration
  images: {
    // Allow images from Supabase Storage and other common sources
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
      // Allow common image hosting services
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
    ],
    // Optimize image formats
    formats: ['image/avif', 'image/webp'],
    // Reduce image quality slightly for faster loading (default is 75)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Experimental features for better performance
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: ['lucide-react', 'date-fns', 'framer-motion'],
    // Re-enable client-side router cache for faster navigation
    // Next.js 15 disabled this by default (staleTime: 0)
    // This allows pages to be served from cache during navigation
    staleTimes: {
      dynamic: 30,  // Dynamic pages cached for 30 seconds
      static: 180,  // Static pages cached for 3 minutes
    },
  },

  // Disable powered by header
  poweredByHeader: false,

  // Compress responses
  compress: true,
};

export default nextConfig;
