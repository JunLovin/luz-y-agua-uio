import { config } from "@luz-y-agua/shared";
import type { NextConfig } from "next";

const revalidate = config.web.revalidateMs / 1000;

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  cacheLife: {
    /** Public pages and the data behind them (§9): rebuilt in the background every few minutes. */
    city: { stale: revalidate, revalidate, expire: 3600 },
  },
};

export default nextConfig;
