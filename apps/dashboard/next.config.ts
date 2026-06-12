import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const here = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  // Monorepo: trace from the repo root so hoisted deps resolve and the
  // multi-lockfile workspace-root warning is silenced.
  outputFileTracingRoot: path.resolve(here, '../..'),
  // Public surfaces render via ISR; revalidation is set per-fetch in lib/sources/*.
}

export default nextConfig
