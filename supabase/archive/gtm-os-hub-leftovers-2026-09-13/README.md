# GTM_OS_HUB leftover tables — archive (2026-09-13, YED-165)

Rows and column definitions exported over REST (secret key) from the Hub's Supabase project
`GTM_OS_HUB` (`nnywrmetdoixdbevvsvf`) **before** the tables were dropped. They were early Empire
State pipeline objects (~2026-04) that ended up in the Hub's database; nothing in the Hub reads them.
The publishable key could read 0 rows from all four, so nothing was ever publicly exposed.

| Table | Rows | Foreign keys |
|---|---|---|
| `events` | 4 | — |
| `event_briefs` | 6 | `event_id → events.id` |
| `contacts` | 0 | `source_event_id → events.id` |
| `content_drafts` | 0 | `event_id → events.id`, `contact_id → contacts.id` |

- `column_definitions.json`: PostgREST OpenAPI definitions (types, FKs) for all four tables.
- Also deleted: the empty storage bucket `post-event-uploads` (0 objects, created 2026-04-03).
- The drop is recorded as `supabase/migrations/0006_drop_empire_leftovers.sql` in `gtm-os-hub`.

Not restored anywhere. The canonical home for event data is the Empire State database; re-import
from here only if one of these rows turns out to be missing there.
