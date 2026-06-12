import { WorkStream } from '@/components/WorkStream'
import { getPublicCommits } from '@/lib/sources/github'

export default async function Home() {
  const commits = await getPublicCommits(20)

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 md:py-24">
      <header className="mb-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
          GTM Engineering · in public
        </p>
        <h1 className="mt-3 text-4xl font-bold md:text-5xl">Alex Yedi</h1>
        <p className="mt-4 max-w-prose text-lg leading-relaxed text-ink-muted">
          Building an always-on signal pipeline — Notion → Supabase → evals → activation —
          toward a Forward Deployed GTM Engineer practice. This is the work, live.
        </p>
      </header>

      {/* Tier toggle — The Work, Live (active) / Living System Map (V1) */}
      <nav className="mb-10 flex gap-1 rounded-lg border border-edge bg-paper p-1 text-sm">
        <span className="rounded-md bg-surface px-3 py-1.5 font-medium text-ink shadow-sm">
          The Work, Live
        </span>
        <span className="cursor-not-allowed px-3 py-1.5 text-ink-soft" title="Coming in V1">
          Living System Map ⊘
        </span>
      </nav>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Shipped</h2>
          <span className="font-mono text-xs text-ink-soft">source: github · auto-pulled</span>
        </div>
        <WorkStream commits={commits} />
      </section>

      <footer className="mt-16 border-t border-edge pt-6 font-mono text-xs text-ink-soft">
        Projection layer over Linear · GitHub · Notion · Supabase. No state of its own.
      </footer>
    </main>
  )
}
