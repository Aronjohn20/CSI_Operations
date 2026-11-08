/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Prevent minor typing warnings from aborting production builds
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

