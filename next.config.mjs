// The backend the browser's /api/v1 requests are passed on to. Read on the server only: the browser
// sees this app's origin and never the backend's address.
const backend = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
  .replace(/\/+$/, "")
  .replace(/\/api\/v1$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  experimental: {
    // Requests passed on to the backend are held in memory first, up to this much: room for the
    // backend's largest upload (50 MiB) plus the multipart envelope. The backend enforces the limit.
    proxyClientMaxBodySize: "60mb",
  },
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${backend}/api/v1/:path*` }];
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/dashboard/default",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
