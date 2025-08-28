/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || '',
  // Allow cross-origin requests for development
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ]
  },
  webpack: (config, { dev, isServer }) => {
    // Handle WebAssembly files for @imgly/background-removal
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    }
    
    return config
  },
}

export default nextConfig