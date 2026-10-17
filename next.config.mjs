/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow an alternate build directory so tooling (e.g. the e2e suite) can
  // build/serve without clobbering a `.next` used by a running dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
