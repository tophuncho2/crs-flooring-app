import path from "node:path"
import { withSentryConfig } from "@sentry/nextjs"
import type { NextConfig } from "next"

const isDevelopment = process.env.NODE_ENV !== "production"

// Temporary CSP allowances:
// - script-src 'unsafe-inline' is kept because the current Next.js runtime still emits inline bootstrap scripts.
// - script-src 'unsafe-eval' is only enabled in development for local tooling compatibility.
// - style-src 'unsafe-inline' is kept for the current styling/runtime setup.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "manifest-src 'self'",
  "media-src 'self' data: blob:",
  "object-src 'none'",
  "connect-src 'self' https: wss:",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
  ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
].join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()" },
]

const nextConfig: NextConfig = {
  // Railpack's runtime image only reliably carries Next's self-contained
  // standalone server (relay/worker deploy the same `node <file>` way). Plain
  // `next start` lost its `.next` build under the current builder, so emit the
  // standalone bundle instead. outputFileTracingRoot points at the monorepo
  // root so workspace deps get traced into the bundle.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@builders/db", "@builders/domain", "@builders/lib"],
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN || !process.env.SENTRY_ORG || !process.env.SENTRY_PROJECT,
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
})
