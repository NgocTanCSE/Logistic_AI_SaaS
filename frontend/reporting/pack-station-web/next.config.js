/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: true,
  // output: 'standalone', // Quan trọng: Cho phép chạy siêu nhẹ trong Docker
}

module.exports = nextConfig
