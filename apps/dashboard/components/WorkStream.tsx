import type { PublicCommit } from '@/lib/sources/github'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function WorkStream({ commits }: { commits: PublicCommit[] }) {
  return (
    <ol className="relative border-l border-edge pl-6">
      {commits.map((c) => (
        <li key={c.sha} className="mb-7 last:mb-0">
          <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
          <div className="flex items-baseline gap-3">
            <time className="font-mono text-xs text-ink-soft tabular-nums">{formatDate(c.date)}</time>
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-ink-soft hover:text-accent"
            >
              {c.sha}
            </a>
          </div>
          <a
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-[0.95rem] leading-snug text-ink hover:text-accent-dark"
          >
            {c.subject}
          </a>
        </li>
      ))}
    </ol>
  )
}
