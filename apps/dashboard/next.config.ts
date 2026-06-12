import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Public surfaces render via ISR; revalidation is set per-fetch in lib/sources/*.
}

export default nextConfig
