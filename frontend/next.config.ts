import type { NextConfig } from "next";

// Support dynamic basePath from environment variable for GitHub Pages
// If NEXT_PUBLIC_BASE_PATH is set, use it; otherwise default to empty string
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: basePath,
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
  headers() {
    return Promise.resolve([
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      {
        source: '/:path*.wasm',
        headers: [
          { key: 'Content-Type', value: 'application/wasm' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ]);
  }
};

export default nextConfig;

