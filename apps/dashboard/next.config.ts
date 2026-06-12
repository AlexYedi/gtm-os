import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const here = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  // The dashboard has no workspace deps, so it deploys standalone with the app
  // dir as the tracing root. This both silences the local multi-lockfile
  // workspace-root warning and stays correct in Vercel's apps/dashboard build context.
  outputFileTracingRoot: here,
  // Public surfaces render via ISR; revalidation is set per-fetch in lib/sources/*.
}

export default nextConfig
