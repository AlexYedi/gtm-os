// Local egress verification — exercises the REAL GitHub → projection → guard path
// against the live (private) repo. NOT part of the build; run manually:
//   cd apps/dashboard && bun run scripts/verify-egress.ts
//
// Proves the PII contract on real data: raw GitHub data (contains author emails)
// FAILS the scan; the public projection that actually ships PASSES it.
import { getPublicCommits } from '../lib/sources/github'
import { scanForPii } from '../lib/public-safety'

const token = process.env.GITHUB_TOKEN
const repo = process.env.GTM_OS_REPO ?? 'AlexYedi/gtm-os'

if (!token) {
  console.error('✗ No GITHUB_TOKEN in env — set it in apps/dashboard/.env first.')
  process.exit(1)
}

// 1) RAW — what GitHub actually returns, including PII we must never ship.
const res = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=5`, {
  headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
})
if (!res.ok) {
  console.error(`✗ GitHub fetch failed: ${res.status} ${res.statusText}`)
  process.exit(1)
}
const raw = (await res.json()) as Array<Record<string, any>>
const rawEmails = [...new Set(raw.map((c) => c.commit?.author?.email).filter(Boolean))]
const rawScan = scanForPii(JSON.stringify(raw))

console.log('─'.repeat(64))
console.log(`RAW GitHub response (${raw.length} commits) — the data we read FROM:`)
console.log('  author emails present:', rawEmails)
console.log('  scanForPii(raw).clean :', rawScan.clean)
console.log('  sample hits           :', [...new Set(rawScan.hits)].slice(0, 6))

// 2) PUBLIC projection — what actually ships. assertPublicSafe() runs INSIDE this.
const pub = await getPublicCommits(5)
const pubScan = scanForPii(JSON.stringify(pub))

console.log('─'.repeat(64))
console.log('PUBLIC projection — the data we ship (assertPublicSafe passed):')
console.log(JSON.stringify(pub, null, 2))
console.log('─'.repeat(64))
console.log('  scanForPii(public).clean:', pubScan.clean)
console.log(
  rawScan.clean === false && pubScan.clean === true
    ? '✓ CONTRACT HOLDS: raw carries PII, projection is clean.'
    : '✗ CONTRACT VIOLATION — investigate before any deploy.',
)
console.log('─'.repeat(64))
