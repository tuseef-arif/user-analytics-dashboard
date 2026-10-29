import type { NextConfig } from 'next';

const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8000';

const nextConfig: NextConfig = {
  // Otherwise `next dev` keeps recreating an untracked AGENTS.md in the repo root.
  agentRules: false,
  async rewrites() {
    // In production Vercel routes /api/* to the Python function; proxying is dev-only.
    if (process.env.NODE_ENV !== 'development') return [];
    return [
      { source: '/api/:path*', destination: `${apiProxyTarget}/api/:path*` },
    ];
  },
};

export default nextConfig;
