import type { NextConfig } from 'next';

const config: NextConfig = {
  distDir: process.env.APP_ENV === 'staging' ? '.next-staging' : '.next',
  poweredByHeader: false,
  webpack(webpackConfig) {
    if (process.platform === 'win32') webpackConfig.cache = false;
    return webpackConfig;
  },
};

export default config;
