import { assertPublicSafe, scrub } from '../public-safety'

/**
 * PUBLIC commit shape. Note what is ABSENT: no author email, no committer,
 * no message body. This is the allowlist projection — the type itself is the
 * primary PII control. The raw GitHub type below deliberately never declares
 * `author.email`, so it cannot be read, let alone rendered.
 */
export interface PublicCommit {
  sha: string // short
  subject: string // first line only, scrubbed
  date: string // ISO
  url: string // public commit permalink
}

interface RawCommit {
  sha: string
  commit: { message: string; author: { date: string } }
  html_url: string
}

const REPO = process.env.GTM_OS_REPO ?? 'AlexYedi/gtm-os'

function toPublic(c: RawCommit): PublicCommit {
  const subject = scrub((c.commit.message.split('\n')[0] ?? '').trim())
  return { sha: c.sha.slice(0, 7), subject, date: c.commit.author.date, url: c.html_url }
}

/**
 * Fetch recent commits as PII-safe PublicCommit[]. Without GITHUB_TOKEN (local
 * dev / no network) returns a clearly-labelled fixture so the page always renders.
 * Every return path passes through assertPublicSafe — the egress gate.
 */
export async function getPublicCommits(limit = 20): Promise<PublicCommit[]> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    assertPublicSafe(FIXTURE_COMMITS, 'github fixture')
    return FIXTURE_COMMITS
  }

  const res = await fetch(`https://api.github.com/repos/${REPO}/commits?per_page=${limit}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    next: { revalidate: 900 }, // 15 min ISR cache
  })
  if (!res.ok) {
    assertPublicSafe(FIXTURE_COMMITS, 'github fixture (fetch fallback)')
    return FIXTURE_COMMITS
  }

  const raw = (await res.json()) as RawCommit[]
  const commits = raw.map(toPublic)
  assertPublicSafe(commits, 'github commits')
  return commits
}

// Offline dev fixture — real recent gtm-os history, no token required.
const FIXTURE_COMMITS: PublicCommit[] = [
  {
    sha: '4143fac',
    subject: 'hygiene learnings and event intelligence write up',
    date: '2026-06-10T00:00:00Z',
    url: `https://github.com/${REPO}/commit/4143fac`,
  },
  {
    sha: '5d32e68',
    subject: 'hubspot connection fix',
    date: '2026-06-09T00:00:00Z',
    url: `https://github.com/${REPO}/commit/5d32e68`,
  },
  {
    sha: 'b2e9cd3',
    subject: 'Add apps/plan-tracker — interactive HTML front-end for the 24-week plan',
    date: '2026-05-21T00:00:00Z',
    url: `https://github.com/${REPO}/commit/b2e9cd3`,
  },
  {
    sha: 'a7b82f6',
    subject: 'Add THE_PLAN.md — 24-week Forward Deployed GTME plan',
    date: '2026-05-20T00:00:00Z',
    url: `https://github.com/${REPO}/commit/a7b82f6`,
  },
]
