/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  // Allow local network host for Turbopack HMR in development
  allowedDevOrigins: ['192.168.0.121'],
}

export default nextConfig
