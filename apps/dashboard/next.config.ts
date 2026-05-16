import type { NextConfig } from "next";
import dotenv from "dotenv";
import path from "path";

// Load .env.local for development (gitignored, contains secrets)
const rootDir = path.resolve(__dirname, "../..");
const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.local";
dotenv.config({ path: path.join(rootDir, envFile) });

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
