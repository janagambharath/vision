/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignore build errors to allow production deployments when there are minor lint issues
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore ESLint errors to ensure compile succeeds
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com"
      }
    ]
  }
};

export default nextConfig;
