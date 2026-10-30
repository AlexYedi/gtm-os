/**
 * Fixture tests for verify-public-safe.ts — one case per layer gap from the
 * G-04 review (2026-10-30), so the next edit to the scanner proves each layer
 * on its own:
 *   1. every match on a line is checked (a reserved-domain email at the head
 *      of the line must not hide a real address);
 *   2. files larger than the old 2 MB guard are scanned (no size fails-open);
 *   3. the accepted-hits ledger path is scanned for secret prefixes and
 *      denylist terms;
 * plus: binary files are skipped BY PATH (visible, not counted).
 *
 * Fixture strings are built by concatenation at runtime so this test file
 * itself never trips the scanner it tests.
 *
 * Run: bun test scripts/verify-public-safe.test.ts
 */
import { describe, expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PATTERNS, scanFiles, scanText } from './verify-public-safe.ts'

// Runtime-assembled fixtures — see the file comment.
const REAL_EMAIL = ['someone.real', '@', 'gmail', '.com'].join('')
const RESERVED_EMAIL = 'jane@example.com'
const SK_KEY = ['sk-', 'a'.repeat(24), 'ZZ9'].join('')
const PHONE = ['212-555-01', '99'].join('')

const PATTERNS_WITH_SECRETS = PATTERNS // secret-prefix patterns scan every path

describe('verify-public-safe', () => {
  test('gap 1: reports the real email even after a reserved-domain email on the same line', () => {
    const line = `contact ${RESERVED_EMAIL} or ${REAL_EMAIL} today`
    const hits = scanText('notes.md', line, PATTERNS_WITH_SECRETS)
    const emails = hits.filter((h) => h.kind === 'email')
    expect(emails.some((h) => h.match === REAL_EMAIL)).toBe(true)
    expect(emails.some((h) => h.match === RESERVED_EMAIL)).toBe(false)
  })

  test('gap 2a: a file larger than the old 2 MB guard is scanned in full', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'g04-scan-'))
    try {
      // > 2 MiB of padding lines, real email on the LAST line.
      const padding = ('x'.repeat(120) + '\n').repeat(Math.ceil(2 * 1024 * 1024 / 121) + 1)
      const path = join(dir, 'big.json')
      await writeFile(path, padding + `{"contact": "${REAL_EMAIL}"}\n`)
      const { hits } = await scanFiles([path], PATTERNS_WITH_SECRETS)
      expect(hits.some((h) => h.kind === 'email' && h.match === REAL_EMAIL)).toBe(true)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('gap 2b: binary files are skipped BY PATH, not just counted', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'g04-scan-'))
    try {
      const nulPath = join(dir, 'thing.bin')
      // NUL byte in the head = detected as binary.
      await writeFile(nulPath, new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00, 0x03, 0x04]))
      // A PDF whose compressed streams avoid NUL in the head is STILL binary:
      // %PDF- magic in the first bytes, printable-looking garbage after.
      const pdfPath = join(dir, 'thing.pdf')
      await writeFile(pdfPath, new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x40, 0x7b]))
      const { hits, binarySkipped } = await scanFiles([nulPath, pdfPath], PATTERNS_WITH_SECRETS)
      expect(binarySkipped).toEqual([nulPath, pdfPath])
      expect(hits).toEqual([])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('gap 3: the ledger path is scanned for secret prefixes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'g04-scan-'))
    try {
      // The accepted-hits ledger is exactly where a careless accept would paste
      // a real secret as a "comment" — secret prefixes must scan it anyway.
      const path = join(dir, 'public-safe-allowlist.txt')
      await writeFile(path, `# accepted by review\n# key: ${SK_KEY}\n`)
      const { hits } = await scanFiles([path], PATTERNS_WITH_SECRETS)
      expect(hits.some((h) => h.kind === 'api-key-sk-prefix' && h.match === SK_KEY)).toBe(true)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('baseline: a real NANP phone still scans as a hit', () => {
    const hits = scanText('c.txt', `call ${PHONE} now`, PATTERNS_WITH_SECRETS)
    expect(hits.some((h) => h.kind === 'phone' && h.match === PHONE)).toBe(true)
  })
})
