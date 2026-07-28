import { readFileSync } from "fs";
import path from "path";

// The README tells users to configure the root .env — Next.js only reads env
// files inside apps/dashboard, so load the repo root .env here. Values already
// set (real env, .env.local) win.
try {
  const rootEnv = readFileSync(path.resolve(process.cwd(), "../../.env"), "utf-8");
  for (const line of rootEnv.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch { /* no root .env — defaults and .env.local apply */ }

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS
    ? process.env.ALLOWED_DEV_ORIGINS.split(",")
    : [],
};

export default nextConfig;
