/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone',
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    return [
      {
        source: '/api/v1/inventory/:path*',
        destination: 'http://127.0.0.1:3002/api/v1/inventory/:path*'
      },
      {
        source: '/api/v1/warehouses/:path*',
        destination: 'http://127.0.0.1:3002/api/v1/warehouses/:path*'
      },
      {
        source: '/api/v1/branches/:path*',
        destination: 'http://127.0.0.1:3002/api/v1/branches/:path*'
      },
      {
        source: '/api/v1/wms/:path*',
        destination: 'http://127.0.0.1:3002/api/v1/wms/:path*'
      },
      {
        source: '/api/v1/orders/:path*',
        destination: 'http://127.0.0.1:3003/api/v1/orders/:path*'
      },
      {
        source: '/api/v1/logistics/:path*',
        destination: 'http://127.0.0.1:3004/api/v1/logistics/:path*'
      },
      {
        source: '/api/v1/vehicles/:path*',
        destination: 'http://127.0.0.1:3004/api/v1/vehicles/:path*'
      },
      {
        source: '/api/v1/drivers/:path*',
        destination: 'http://127.0.0.1:3004/api/v1/drivers/:path*'
      },
      {
        source: '/api/v1/waves/:path*',
        destination: 'http://127.0.0.1:3002/api/v1/waves/:path*'
      },
      {
        source: '/api/v1/products/:path*',
        destination: 'http://127.0.0.1:3002/api/v1/products/:path*'
      },
      {
        source: '/api/v1/tasks/:path*',
        destination: 'http://127.0.0.1:3002/api/v1/tasks/:path*'
      },
      {
        source: '/api/v1/auth/refresh-token',
        destination: 'http://127.0.0.1:3003/api/v1/auth/refresh-token'
      },
      {
        source: '/api/v1/clients/:path*',
        destination: 'http://127.0.0.1:3003/api/v1/clients/:path*'
      },
      {
        source: '/api/v1/tracking/:path*',
        destination: 'http://127.0.0.1:3003/api/v1/tracking/:path*'
      },
      {
        source: '/api/v1/webhooks/:path*',
        destination: 'http://127.0.0.1:3003/api/v1/webhooks/:path*'
      },
      {
        source: '/api/v1/trips/:path*',
        destination: 'http://127.0.0.1:3004/api/v1/trips/:path*'
      },
      {
        source: '/api/v1/gps/:path*',
        destination: 'http://127.0.0.1:3004/api/v1/gps/:path*'
      },
      {
        source: '/api/v1/geofences/:path*',
        destination: 'http://127.0.0.1:3004/api/v1/geofences/:path*'
      },
      {
        source: '/api/v1/driver-app/:path*',
        destination: 'http://127.0.0.1:3004/api/v1/driver-app/:path*'
      },
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:3001/api/v1/:path*'
      }
    ]
  }
};

export default nextConfig;
