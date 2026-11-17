# Contributing

Thanks for taking a look. This project has two halves that can be worked on
independently: the **catalogue** (collecting dashboards) and the **renderer +
builder** (showing and generating them).

## Getting set up

```bash
git clone https://github.com/andokivilaid/ha-dashboard-studio
cd ha-dashboard-studio
pnpm install
node scripts/sync-assets.mjs     # copies the MDI webfont into apps/web/public
pnpm dev                         # http://localhost:3177
```

Node 20.11+ and pnpm 12 are expected. The repository is a pnpm workspace; do
not mix in npm or yarn.

## Layout

| Path | What lives there |
|---|---|
| `apps/web` | The Next.js app: gallery, builder, API routes |
| `packages/lovelace` | Framework-free core: HA types, YAML parsing, dashboard analysis, the demo home, the HACS registry |
| `packages/lovelace-render` | React implementation of the Home Assistant card set |
| `packages/catalog` | Dashboard catalogue, its schema, the GitHub ingester and the licence policy |

## Running the checks

```bash
pnpm typecheck            # tsc across every package
pnpm test                 # vitest unit tests
pnpm build                # production build of the web app
pnpm test:e2e             # Playwright; starts the built app itself
pnpm test:e2e --ui        # interactive
```

End-to-end tests include visual snapshots. If a change is *meant* to alter the
rendering, update them deliberately:

```bash
pnpm exec playwright test --update-snapshots
```

and include the new PNGs in the pull request so a reviewer can see the diff.

## Adding a card to the renderer

1. Implement it in `packages/lovelace-render/src/cards/`, using the HA CSS
   custom properties from `styles.css` rather than hard-coded colours — that is
   what makes light/dark and third-party themes work.
2. Register it in the `switch` in `CardRenderer.tsx` and add its type to
   `SUPPORTED_CARD_TYPES`.
3. Add an e2e case to `tests/e2e/renderer.spec.ts` that types a config into the
   builder and asserts on what appears.

A card that is *not* implemented must degrade to `FallbackCard`, never to an
error. Dashboards from the wild use cards we have never heard of.

## Adding a HACS bundle

Add an entry to `CUSTOM_CARD_BUNDLES` in `packages/lovelace/src/registry.ts`
with a **pinned** version in the `source` URL, the licence, and every custom
element the bundle defines. The proxy at `/api/hacs/[slug]` picks it up
automatically. Check it loads with:

```bash
curl -I http://localhost:3177/api/hacs/<slug>.js
```

## Working on the catalogue

```bash
GITHUB_TOKEN=$(gh auth token) pnpm catalog:ingest --max-repos 400
pnpm catalog:validate     # hard-fails if a non-permissive source stored YAML
pnpm catalog:bundle       # regenerates the modules the app imports
```

`--fresh` discards previous results. `EXTRA_QUERIES="topic:foo,bar baz"` adds
search queries without editing the script.

### The licence rule is not negotiable

YAML is only committed for sources under a permissive licence (the list is in
`packages/catalog/src/schema.ts`). Everything else is metadata plus a link.
`pnpm catalog:validate` fails the build if that is ever violated, and CI runs
it. If you are an author who would rather not be listed at all, open an issue
and the entry goes away.

## Style

- TypeScript everywhere, `strict` on.
- Comments explain *why*, not *what*. Don't narrate the code.
- No new runtime dependency without a reason in the pull request description.
- Keep the renderer free of app-specific imports; it should stay usable on its
  own.

## Reporting a dashboard

Open an issue with the gallery URL. Removal requests from the original author
are actioned without discussion.
