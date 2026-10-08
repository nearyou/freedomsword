import type { NextConfig } from 'next';
const config: NextConfig = {
  distDir: process.env.APP_ENV === 'staging' ? '.next-staging' : '.next',
  poweredByHeader: false,
  webpack(webpackConfig) {
    // Avoid Windows EBUSY errors from atomic filesystem cache renames.
    if (process.platform === 'win32') webpackConfig.cache = false;
    return webpackConfig;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' https://telegram.org" +
              (process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : '') +
              "; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors https://web.telegram.org https://*.telegram.org; base-uri 'self'; form-action 'self'; object-src 'none'",
          },
        ],
      },
    ];
  },
};
export default config;
