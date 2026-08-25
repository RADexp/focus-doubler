import type { NextConfig } from "next";

import { version } from "./package.json";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Wersja żyje w package.json; stąd trafia do stopki przez lib/version.ts.
  env: { NEXT_PUBLIC_APP_VERSION: version },
};

export default nextConfig;
