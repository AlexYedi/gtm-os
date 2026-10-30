/**
 * verify-public-safe.ts — repo-tree egress scan (G-04).
 *
 * Scans every TRACKED file for patterns that must not ship in a public repo:
 *   - emails and (conservative NANP) phone numbers;
 *   - secret-key prefixes: sb_secret_ / sk- / ghp_;
 *   - compensation figures ($150k-style amounts and the term "OTE");
 *   - denylisted confidential entities read from the PII_DENYLIST env var, so the
 *     names themselves never appear in this source tree (same contract as
 *     gtm-os-hub's lib/public-safety.ts — modelled on it, per the G-04 spec).
 *
 * Prints one `file:line` per hit and exits non-zero when anything is found.
 * Hits are Alex's call (redact / gitignore / accept) — this scan never deletes.
 *
 * Scoping, recorded here so the PR review can veto it:
 *   - Example-data patterns (email / phone / comp) are suppressed under
 *     `.claude/skills/` — vendored skill docs whose examples are fictional by
 *     construction (RFC 2606 `.example` TLDs, acme.com demos, test vectors).
 *     SECRET-PREFIX and DENYLIST patterns scan EVERY path, always.
 *   - Emails at RFC 2606 reserved domains (example.com/net/org, *.example) are
 *     never hits in any path.
 *   - Binary files (NUL byte in the first 8 KB) are skipped — decoding a PDF as
 *     text yields thousands of digit-run false positives.
 *   - `scripts/public-safe-allowlist.txt` is the accepted-hits ledger: one
 *     `path<TAB>matched-text` per line, for hits Alex has accepted (e.g. the
 *     G-04 spec naming its own patterns). The ledger and this script skip
 *     self-scanning.
 *
 * Run: bun scripts/verify-public-safe.ts
 *      PII_DENYLIST="acme corp,jane doe" bun scripts/verify-public-safe.ts
 */

interface Hit {
  file: string
  line: number
  kind: string
  match: string
}

interface PatternDef {
  kind: string
  regex: RegExp
  /** Paths (prefix match) where this pattern is suppressed; empty = everywhere. */
  skipPaths?: string[]
  /** Per-match veto (e.g. RFC 2606 reserved email domains). */
  ignore?: (match: string) => boolean
}

const SELF_PATHS = ['scripts/verify-public-safe.ts', 'scripts/public-safe-allowlist.txt']

// Paths holding vendored skill docs whose examples are fictional by construction.
const EXAMPLE_DOC_PATHS = ['.claude/skills/']

// Key prefixes are written with character classes (e.g. `sb[_]secret_`) so this
// scanner never matches its own source — same self-avoidance trick throughout.
const PATTERNS: PatternDef[] = [
  {
    kind: 'email',
    regex: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    skipPaths: EXAMPLE_DOC_PATHS,
    ignore: isReservedEmail,
  },
  {
    // Conservative NANP phone, modelled on gtm-os-hub's public-safety.ts but
    // tightened: separators are REQUIRED between all groups (and after an
    // optional country code) so digit-run IDs, hashes and timestamps in JSON
    // data never false-positive. "(212) 555-0199" and "212-555-0199" match;
    // the compact "(212)555-0199" form is deliberately not caught.
    kind: 'phone',
    regex: /\b(?:\+?\d{1,3}[\s.-])?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}\b/g,
    skipPaths: EXAMPLE_DOC_PATHS,
  },
  { kind: 'supabase-secret-key', regex: /sb[_]secret_[A-Za-z0-9_\-]{10,}/g },
  { kind: 'api-key-sk-prefix', regex: /\bsk[-][A-Za-z0-9_\-]{20,}\b/g },
  { kind: 'github-token-ghp-prefix', regex: /\bghp[_][A-Za-z0-9]{20,}\b/g },
  {
    kind: 'comp-figure',
    // $ followed by a number and an optional k/K, e.g. $150k, $95K, $120,000.
    regex: /\$\d{1,3}(?:,\d{3})*(?:\.\d+)?\s?(?:k\b|K\b|,000\b)/g,
    skipPaths: EXAMPLE_DOC_PATHS,
  },
  // [E] breaks the literal so this file never self-matches.
  { kind: 'comp-term-OTE', regex: /\bOT[E]\b/g },
]

/** RFC 2606 reserved e-mail domains: fictional by standard, never real inboxes. */
const RESERVED_EMAIL = /@(?:example\.(?:com|net|org)|[a-z0-9.-]+\.example)$/i

function isReservedEmail(match: string): boolean {
  return RESERVED_EMAIL.test(match)
}

/** Denylisted confidential entities from env (comma-separated), never in source. */
function denylist(): string[] {
  return (process.env.PII_DENYLIST ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function denylistPatterns(): PatternDef[] {
  return denylist().map((term) => ({
    kind: `denylist:${term}`,
    regex: new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i'),
  }))
}

function isBinary(bytes: Uint8Array): boolean {
  const head = bytes.subarray(0, 8192)
  return head.includes(0)
}

interface AllowedHit {
  file: string
  match: string
}

/** Accepted-hits ledger: `path<TAB>matched-text` per line, `#` comments. */
async function loadAllowlist(): Promise<AllowedHit[]> {
  const f = Bun.file('scripts/public-safe-allowlist.txt')
  if (!(await f.exists())) return []
  return (await f.text())
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => {
      const tab = line.indexOf('\t')
      return tab === -1
        ? { file: line, match: '' }
        : { file: line.slice(0, tab).trim(), match: line.slice(tab + 1).trim() }
    })
}

function isAllowed(hit: Hit, allowed: AllowedHit[]): boolean {
  return allowed.some((a) => hit.file === a.file && hit.match === a.match)
}

function scanText(file: string, text: string, patterns: PatternDef[]): Hit[] {
  const hits: Hit[] = []
  for (const { kind, regex, skipPaths, ignore } of patterns) {
    if (skipPaths?.some((p) => file.startsWith(p))) continue
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      // Reset lastIndex per line: all patterns above carry the `g` flag.
      regex.lastIndex = 0
      const m = regex.exec(lines[i])
      if (m && !ignore?.(m[0])) {
        hits.push({ file, line: i + 1, kind, match: m[0].slice(0, 60) })
      }
    }
  }
  return hits
}

async function main(): Promise<void> {
  const cmd = Bun.spawn(['git', 'ls-files', '-z'], {
    stdout: 'pipe',
    stderr: 'inherit',
  })
  const tracked = (await new Response(cmd.stdout).text())
    .split('\0')
    .filter(Boolean)

  const allowed = await loadAllowlist()
  const allHits: Hit[] = []
  let binariesSkipped = 0

  for (const file of tracked) {
    // Self-exclusion: the scanner and its ledger would otherwise match the
    // very patterns they define (e.g. the OTE entry text).
    if (SELF_PATHS.includes(file)) continue
    const f = Bun.file(file)
    if (!(await f.exists())) continue
    const stat = await f.stat()
    if (stat.size > 2 * 1024 * 1024) continue
    const bytes = new Uint8Array(await f.arrayBuffer())
    if (isBinary(bytes)) {
      binariesSkipped++
      continue
    }
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    allHits.push(...scanText(file, text, [...PATTERNS, ...denylistPatterns()]))
  }
  await cmd.exited

  const reportable = allHits.filter((h) => !isAllowed(h, allowed))

  for (const h of allHits.filter((h) => isAllowed(h, allowed))) {
    console.log(`accepted: ${h.file}:${h.line}  [${h.kind}]  ${h.match}`)
  }

  if (reportable.length === 0) {
    console.log(
      `0 hits. Tree is public-safe` +
        ` (binaries skipped: ${binariesSkipped}, accepted ledger entries: ${allowed.length}` +
        `${denylist().length > 0 ? ', PII_DENYLIST terms loaded' : ', PII_DENYLIST not set'}).`,
    )
    process.exitCode = process.exitCode === 2 ? 2 : 0
    return
  }

  console.error(
    `${reportable.length} hit(s) — review required (redact, gitignore, or accept; never auto-delete):`,
  )
  for (const h of reportable) {
    console.error(`  ${h.file}:${h.line}  [${h.kind}]  ${h.match}`)
  }
  process.exitCode = 1
}

await main()
