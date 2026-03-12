import withBundleAnalyzer from '@next/bundle-analyzer'

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },

  // Optimize barrel file imports for faster builds and smaller bundles
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },

  // Enable image optimization with remote patterns for Slack CDN
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.slack-edge.com' },
      { protocol: 'https', hostname: '**.slack.com' },
      { protocol: 'https', hostname: 'emoji.slack-edge.com' },
      { protocol: 'https', hostname: 'a.slack-edge.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [64, 128, 256, 384],
    imageSizes: [32, 64, 128],
    minimumCacheTTL: 60,
  },

  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || '',

  // Security headers for all routes
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
        ],
      },
    ]
  },

  // Turbopack configuration for Next.js 16
  turbopack: {
    root: process.cwd(),
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.wasm'],
  },

  // Enable React Compiler for automatic memoization
  reactCompiler: true,

  // Webpack config for fallback (when using --webpack flag)
  webpack: (config, { dev, isServer }) => {
    // Handle WebAssembly files for @imgly/background-removal
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    }

    return config
  },
}

export default bundleAnalyzer(nextConfig)
