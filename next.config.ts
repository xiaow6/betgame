import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable x-powered-by header (don't expose framework)
  poweredByHeader: false,

  // Security headers applied at build level (middleware handles runtime)
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
      ],
    },
    {
      // Strict CSP for API routes
      source: '/api/(.*)',
      headers: [
        { key: 'Content-Type', value: 'application/json' },
        { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
      ],
    },
  ],
};

export default nextConfig;
