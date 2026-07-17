// Source readers for the events_pipeline contract. The pipeline consumes a normalized EventsDump
// so the read source is swappable: FixtureReader (MCP-dumped JSON, proven) today; NotionApiReader
// (unattended NOTION_TOKEN path) next — see Phase_1/ingestion_mvp.md open-item #3.
import { readFileSync } from 'node:fs'

export interface EventRec { notion_id: string; name: string; event_date: string; location?: string | null; status: string; people: string[]; companies: string[]; topics: string[]; created_time: string }
export interface PersonRec { notion_id: string; name: string; email?: string | null; linkedin?: string | null; title?: string | null; roles: string[]; company_notion_id?: string | null }
export interface CompanyRec { notion_id: string; name: string; website?: string | null; funding_stage?: string | null; industry?: string[] }
export interface TopicRec { notion_id: string; topic: string }
export interface EventsDump { source: string; events: EventRec[]; people: PersonRec[]; companies: CompanyRec[]; topics: TopicRec[] }

export interface EventsReader { read(): Promise<EventsDump> }

/** Reads an MCP-dumped fixture. The proven first-run path + a test double. Keep fixtures out of
 *  git (they carry entity PII) — pass a path outside the repo. */
export class FixtureReader implements EventsReader {
  constructor(private path: string) {}
  async read(): Promise<EventsDump> {
    return JSON.parse(readFileSync(this.path, 'utf8')) as EventsDump
  }
}

// Notion API property extractors (verified against the live 2022-06-28 API, 2026-07-16).
const strip = (id: string) => id.replace(/-/g, '') // API returns dashed ids; spine uses dash-stripped
const pTitle = (p: any) => (p?.title ?? []).map((x: any) => x.plain_text).join('') || null
const pRich = (p: any) => (p?.rich_text ?? []).map((x: any) => x.plain_text).join('') || null
const pDate = (p: any) => p?.date?.start ?? null
const pSelect = (p: any) => p?.select?.name ?? null
const pMulti = (p: any) => (p?.multi_select ?? []).map((o: any) => o.name)
const pRel = (p: any) => (p?.relation ?? []).map((o: any) => strip(o.id))
const pEmail = (p: any) => p?.email ?? null
const pUrl = (p: any) => p?.url ?? null

/**
 * Token-based Notion reader — the production/unattended read path (what n8n / GitHub-Actions cron
 * will use). Reads the four events-pipeline databases over the official Notion API using the
 * NOTION_GTM_OS_SIGNAL_INGESTION_TOKEN internal-connection secret (read-only). Verified live.
 * Note: relation properties are capped at 25 ids per page by the query endpoint — fine for this
 * corpus; a future hardening would page the property-item endpoint for >25.
 */
export class NotionApiReader implements EventsReader {
  private static DB = {
    events: '96ac459885bb40298aef42e878df17ae',
    people: '97b02864c3c7453699d6a76b43838bfe',
    companies: 'dd0b3adb53964a658a3593fa1507bdc6',
    topics: 'f4e5e75272674ceb86060717216b0433',
  }
  private token = process.env.NOTION_GTM_OS_SIGNAL_INGESTION_TOKEN

  private async queryAll(dbId: string): Promise<any[]> {
    if (!this.token) throw new Error('NOTION_GTM_OS_SIGNAL_INGESTION_TOKEN not set')
    const out: any[] = []
    let cursor: string | undefined
    do {
      const r = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
        body: JSON.stringify(cursor ? { page_size: 100, start_cursor: cursor } : { page_size: 100 }),
      })
      if (!r.ok) throw new Error(`Notion query ${dbId} -> ${r.status} ${await r.text()}`)
      const d = await r.json()
      out.push(...d.results)
      cursor = d.has_more ? d.next_cursor : undefined
    } while (cursor)
    return out
  }

  async read(): Promise<EventsDump> {
    const [ev, pe, co, to] = await Promise.all([
      this.queryAll(NotionApiReader.DB.events), this.queryAll(NotionApiReader.DB.people),
      this.queryAll(NotionApiReader.DB.companies), this.queryAll(NotionApiReader.DB.topics),
    ])
    const P = (page: any) => page.properties
    const events: EventRec[] = ev.map(p => ({
      notion_id: strip(p.id), name: pTitle(P(p)['Event Name'])!, event_date: pDate(P(p)['Event Date'])!,
      location: pRich(P(p)['Location']), status: pSelect(P(p)['Event Status'])!,
      people: pRel(P(p)['People']), companies: pRel(P(p)['Companies']), topics: pRel(P(p)['Topics']),
      created_time: p.last_edited_time, // watermark: last_edited_time (better than created for incremental)
    })).filter(e => e.name && e.event_date && e.status) // events.title/date/status are NOT NULL + CHECK
    const people: PersonRec[] = pe.map(p => ({
      notion_id: strip(p.id), name: pTitle(P(p)['Name'])!, email: pEmail(P(p)['Email']),
      linkedin: pUrl(P(p)['LinkedIn URL']), title: pRich(P(p)['Current Title']),
      roles: pMulti(P(p)['Role Context']), company_notion_id: pRel(P(p)['Company'])[0] ?? null,
    })).filter(x => x.name)
    const companies: CompanyRec[] = co.map(p => ({
      notion_id: strip(p.id), name: pTitle(P(p)['Company Name'])!, website: pUrl(P(p)['Website']),
      funding_stage: pSelect(P(p)['Funding Stage']), industry: pMulti(P(p)['Industry / Space']),
    })).filter(x => x.name)
    const topics: TopicRec[] = to.map(p => ({ notion_id: strip(p.id), topic: pTitle(P(p)['Topic'])! })).filter(x => x.topic)
    return { source: 'events_pipeline', events, people, companies, topics }
  }
}
