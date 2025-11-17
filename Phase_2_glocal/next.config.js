const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Skip static page generation errors to allow dynamic pages
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    // ESLint errors will now fail the build
  },
  // Vercel handles deployment automatically, no need for standalone
  // output: 'standalone',
  images: {
    domains: [],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year for better caching
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Optimize image loading
    unoptimized: false,
  },
  // Enable compression
  compress: true,
  // Production optimizations
  swcMinify: true,
  // Disable source maps in production for smaller bundles
  productionBrowserSourceMaps: false,
  // Enable experimental features for performance
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
    ],
    // Optimize CSS imports
    optimizeCss: true,
  },
  // Modularize imports for better tree-shaking
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
      skipDefaultConversion: true,
    },
  },
  // Webpack configuration to exclude playwright-core from bundle
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude playwright-core from server bundle (only needed at runtime in serverless)
      config.externals = config.externals || []
      config.externals.push({
        'playwright-core': 'commonjs playwright-core',
        '@sparticuz/chromium': 'commonjs @sparticuz/chromium',
      })
    }
    return config
  },
  // Security and cache headers
  async headers() {
    return [
      {
        // Cache static assets for 1 year
        source: '/:path*(.jpg|.jpeg|.png|.gif|.webp|.avif|.svg|.ico|.woff|.woff2|.ttf|.eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache Next.js static files
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache API responses with revalidation (stale-while-revalidate)
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
      {
        // Security and performance headers for all routes
        source: '/(.*)',
        headers: [
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
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.sentry-cdn.com https://vercel.live https://va.vercel-scripts.com https://maps.googleapis.com https://www.googletagmanager.com https://www.google.com https://pagead2.googlesyndication.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://*.sentry.io https://vercel.live https://vitals.vercel-insights.com https://maps.googleapis.com https://pagead2.googlesyndication.com; frame-src 'self' https://www.google.com https://googleads.g.doubleclick.net https://www.youtube.com; worker-src 'self' blob:;",
          },
        ],
      },
    ]
  },
}

module.exports = withBundleAnalyzer(nextConfig)
