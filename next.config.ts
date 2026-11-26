import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs", "unzipper", "pg"],
};

export default nextConfig;
