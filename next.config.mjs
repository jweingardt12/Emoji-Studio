import withBundleAnalyzer from '@next/bundle-analyzer'

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.86.71', 'localhost'],
  typescript: {
    ignoreBuildErrors: false,
  },

  // Optimize barrel file imports for faster builds and smaller bundles
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion', 'date-fns', '@hugeicons/core-free-icons'],
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
