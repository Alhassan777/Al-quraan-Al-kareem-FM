/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
      return [
        {
          source: '/api/:path*', // Match all API requests starting with /api
          destination: 'http://127.0.0.1:5000/api/:path*', // Proxy to the Flask backend
        },
      ];
    },
  };
  
  export default nextConfig;
  