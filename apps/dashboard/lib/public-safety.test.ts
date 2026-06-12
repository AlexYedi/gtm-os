import { expect, test } from 'bun:test'
import { assertPublicSafe, scanForPii, scrub } from './public-safety'

test('flags emails', () => {
  expect(scanForPii('reach me at alex.e.yedi@gmail.com').clean).toBe(false)
})

test('flags linkedin urls', () => {
  expect(scanForPii('see https://linkedin.com/in/alexyedi').clean).toBe(false)
})

test('flags denylisted employer (case-insensitive)', () => {
  expect(scanForPii('synced with gky today').clean).toBe(false)
})

test('passes clean commit subjects', () => {
  expect(scanForPii('hubspot connection fix').clean).toBe(true)
})

test('does NOT false-positive on ISO dates', () => {
  expect(scanForPii('shipped on 2026-06-11').clean).toBe(true)
})

test('does NOT false-positive on short commit SHAs', () => {
  expect(scanForPii('commit 4143fac landed').clean).toBe(true)
})

test('scrub redacts email but keeps surrounding text', () => {
  expect(scrub('ping alex.e.yedi@gmail.com please')).toBe('ping [redacted-email] please')
})

test('assertPublicSafe throws on a leaked phone number', () => {
  expect(() => assertPublicSafe([{ note: 'call +1 (415) 555-0132' }])).toThrow()
})

test('assertPublicSafe passes a clean public payload', () => {
  expect(() =>
    assertPublicSafe([{ sha: '4143fac', subject: 'hubspot connection fix', date: '2026-06-09' }]),
  ).not.toThrow()
})
