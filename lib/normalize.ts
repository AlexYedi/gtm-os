// Deterministic normalizers feeding the spine's dedup keys + slugs (hygiene §1, architecture §2.1).
import { createHash } from 'node:crypto'

export const normName = (s: string) =>
  s.toLowerCase().replace(/\b(inc|llc|ltd|corp|co)\.?\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

export const normLinkedin = (u?: string | null) =>
  u ? u.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\?.*$/, '').replace(/\/+$/, '') : null

export const domainOf = (u?: string | null) =>
  u ? u.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] : null

export const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)

export const sha = (s: string) => createHash('sha256').update(s).digest('hex')

// Notion "Funding Stage" select -> entities.funding_stage CHECK enum.
export const FUNDING: Record<string, string> = {
  Public: 'public', Seed: 'seed', 'Series A': 'series_a', 'Series B': 'series_b', 'Series C': 'series_c',
  'Series D': 'series_d_plus', 'Series E': 'series_d_plus', 'Series F': 'series_d_plus',
  'Series G': 'series_d_plus', 'Series H': 'series_d_plus', 'Series I': 'series_d_plus',
}

// Person Role Context (multi-select) -> the strongest person->event relation_type.
export const roleToRelation = (roles: string[]) =>
  roles.includes('host') || roles.includes('organizer') ? 'host_of'
  : roles.includes('speaker') ? 'speaker_at'
  : 'attended'
