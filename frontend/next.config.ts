import type { NextConfig } from 'next';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { backendOrigin } from './src/lib/backend-url';
const require = createRequire(import.meta.url);
const config: NextConfig = {
  distDir: process.env.APP_ENV === 'staging' ? '.next-staging' : '.next',
  poweredByHeader: false,
  webpack(webpackConfig, { isServer }) {
    // Avoid Windows EBUSY errors from atomic filesystem cache renames.
    if (process.platform === 'win32') webpackConfig.cache = false;
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      snarkjs: join(dirname(require.resolve('snarkjs')), 'browser.esm.js'),
      'web-worker': join(dirname(require.resolve('web-worker')), 'browser.js'),
    };
    if (!isServer) {
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        crypto: fileURLToPath(new URL('./src/lib/maci-browser-crypto.ts', import.meta.url)),
        assert: fileURLToPath(new URL('./src/lib/maci-browser-assert.ts', import.meta.url)),
      };
    }
    return webpackConfig;
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backendOrigin()}/api/:path*` }];
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
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://telegram.org" +
              (process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : '') +
              "; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.app.rarime.com; worker-src 'self' blob:; frame-ancestors https://web.telegram.org https://*.telegram.org; base-uri 'self'; form-action 'self'; object-src 'none'",
          },
        ],
      },
      {
        source: '/review/user-flows/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; frame-ancestors 'self' https://web.telegram.org https://*.telegram.org; base-uri 'self'; form-action 'none'; object-src 'none'",
          },
        ],
      },
    ];
  },
};
export default config;
