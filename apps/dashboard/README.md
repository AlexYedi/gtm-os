# apps/dashboard — The Hub

Live, projection-based hub for gtm-os: **The Work, Live** (public proof-of-work) → **Living
System Map** (public technical drill-down) → **Cockpit** (private management). Replaces the
Framer brochure and the internal R2 dashboard with one Next.js app.

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the full design — start with §0, the PII contract.

## Run locally

```bash
# from repo root
bun install
cd apps/dashboard
cp .env.example .env   # optional; without GITHUB_TOKEN, dev uses a labelled fixture
bun dev                # http://localhost:3000
```

## Test the safety layer (no install needed)

```bash
bun test apps/dashboard/lib/public-safety.test.ts
```

## Layout
```
app/                 # routes — / (The Work, Live)
components/           # presentational
lib/public-safety.ts # risk #3 — PII egress guard (the first module)
lib/sources/         # source adapters — each returns PII-safe Public* types
```

## Status
V0 scaffold (W3, 2026-06-11). The Work, Live renders from GitHub. Next: Linear wiring + Cockpit (V1).
