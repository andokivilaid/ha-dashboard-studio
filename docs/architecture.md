# Architecture

How the pieces fit, and why each boundary is where it is.

```
                 ┌──────────────────────────────────────────────┐
                 │               apps/web (Next.js)             │
                 │                                              │
  browser ──────▶│  /gallery      /gallery/[slug]    /builder   │
                 │      │               │               │       │
                 │      └───────┬───────┘               │       │
                 │              ▼                       ▼       │
                 │   @ha-studio/lovelace-render  (React)        │
                 │              │                               │
                 │              ▼                               │
                 │   @ha-studio/lovelace  (types, YAML, mock)   │
                 └──────┬──────────────────┬────────────────────┘
                        │                  │
            /api/hacs/[slug]        /api/ai/{generate,critique}
                        │                  │
                        ▼                  ▼
            GitHub releases /        Anthropic / Google
            jsDelivr (HACS)          (user-supplied key)
```

## Packages

### `@ha-studio/lovelace` — the core

Framework-free: no React, no DOM. Everything needed to *understand* a
dashboard.

- **`types.ts`** — the `HomeAssistant` interface and the Lovelace config types.
  This file is the contract: both our React cards and third-party HACS web
  components receive an object shaped like this. Fields exist here because a
  real card reads them, not because they look tidy —
  `translationMetadata.translations[language]` is dereferenced unconditionally
  by `custom-card-helpers`, so its absence crashes every Lit-based card.
- **`yaml.ts`** — Home Assistant's YAML dialect is not YAML. `!include`,
  `!secret` and the four `!include_dir_*` tags would make a standard parser
  throw. `neutralizeHaTags()` rewrites them to quoted strings so the rest of
  the document still parses, and reports them so the UI can say exactly which
  file reference it could not follow.
- **`analyze.ts`** — one walk over a config yielding card types, custom cards,
  view types, badges, entities, domains, card-mod and template usage, plus
  `deriveTags()` for the gallery facets.
- **`synthesize.ts`** — plausible state for entities a config names but the
  demo home lacks. See *Entity synthesis* in `renderer-coverage.md`.
- **`lint.ts`** — configuration rules a screenshot cannot catch.
- **`registry.ts` / `resources.ts`** — the HACS bundle catalogue, and the
  reconciliation between it and what an instance has installed.
- **`mock/`** — a deterministic demo home. Determinism is not cosmetic;
  Playwright's visual snapshots depend on it.

### `@ha-studio/lovelace-render` — the React card set

Implements the built-in cards against Home Assistant's own CSS custom
properties. Three ideas carry most of the weight:

1. **Theme by custom property, never by hard-coded colour.** Everything reads
   `--ha-card-background`, `--state-light-active-color` and friends, declared
   on `.ha-render-root`. Light/dark is a `data-theme` attribute, and HACS cards
   inherit the same variables for free.
2. **`CustomCardHost` mounts the real thing.** For `custom:` cards it loads the
   bundle, waits for `customElements.whenDefined`, creates the element, calls
   `setConfig()` and assigns `.hass` — the same sequence the HA frontend uses.
3. **Unknown cards degrade, never fail.** `FallbackCard` names the card and its
   entity. A dashboard from 2019 using a long-dead card still previews.

`ha-shims.ts` registers minimal `<ha-card>`, `<ha-icon>`, `<ha-state-icon>`,
`<ha-svg-icon>` and `<ha-ripple>` elements, because HACS bundles compose them
and the real frontend normally provides them. They render into the light DOM,
and resolve MDI glyphs to codepoints rather than class names, because the
webfont's class rules cannot cross a shadow boundary.

### `@ha-studio/catalog` — the dashboards

`scripts/ingest.ts` harvests GitHub; `scripts/bundle.ts` turns the resulting
JSON plus the YAML files into two generated TypeScript modules. Generated
modules rather than runtime `fs` reads, because Next.js file tracing is
unreliable for dynamic paths and the result has to survive a serverless
deployment. Metadata and YAML are separate modules, so a page that only lists
dashboards never pays for megabytes of YAML.

## Why the HACS proxy exists

Most HACS cards are published as GitHub **release assets**:

```
$ curl -sI https://github.com/piitaya/lovelace-mushroom/releases/download/v5.3.0/mushroom.js
content-type: application/octet-stream
# ...and no Access-Control-Allow-Origin
```

A browser refuses to execute that as a module, on both MIME and CORS grounds.
`/api/hacs/[slug]` fetches it server-side and re-serves it same-origin as
`text/javascript`, cached for a day, with the pinned version echoed in
`X-Bundle-Version`. That one route is what makes third-party cards render at
all.

## The websocket sequence

After auth, in this order:

1. **Registries** — `config/area_registry/list`, `config/floor_registry/list`,
   `config/device_registry/list`, `config/entity_registry/list`,
   `config/label_registry/list`. Grouping and naming come from the structure
   the user already maintains; entity-id-derived names are the fallback, not
   the default.
2. **State** — `get_states`, `get_config`, `auth/current_user`,
   `frontend/get_themes`, and a `subscribe_entities` stream.
3. **Dashboards** — `lovelace/dashboards/list`, then `lovelace/config`.
4. **Resources** — `lovelace/resources`.

## What live mode adds beyond a different entity list

`lovelace/resources` is the interesting one. It lists the JavaScript modules
HACS registered, and the file paths are the only record of which cards exist —
Home Assistant does not track that. `resources.ts` matches those paths against
the bundle registry, which gives two answers the UI must not conflate:

- **Installed upstream?** If not, a generated dashboard using that card is
  broken for the user, so the generator's vocabulary is narrowed to what they
  have.
- **Renderable here?** If not, the preview degrades to a placeholder, but their
  instance is fine.

`lovelace/config` returns the config together with a hash that the HA frontend
uses for optimistic concurrency on save. This project never saves, but the hash
still answers "is the copy in my editor still what is on my instance?", so it
is kept and shown with the import.

## Read-only enforcement

`apps/web/src/lib/ha-connection.ts` holds `ALLOWED_COMMANDS`. `guardedSend()`
checks every message against it and throws `ReadOnlyViolation` before touching
the socket. The `hass` object's `callService`, `callApi` and `callWS` all route
through that check or reject outright, so a third-party card that tries to
toggle a light in the preview fails loudly instead of changing someone's house.

The mock `hass` behaves identically, which makes the read-only guarantee
unit-testable without a Home Assistant instance.

`.storage/lovelace` is never touched. The studio has no filesystem access to the
instance; the websocket is the only channel, and it is filtered.

## The AI loop

`/api/ai/generate` and `/api/ai/critique` are thin: validate with zod, dispatch
to a provider adapter, redact anything key-shaped from error strings. The key
arrives per request from the browser and is never stored.

The visual self-check runs in the **browser**, not on the server:
`modern-screenshot` serialises the live DOM into an SVG `foreignObject` and
rasterises it. That captures exactly what the user sees — HACS web components
included — and works on hosting where a headless browser is not available. The
PNG goes to the vision model with the YAML, and both the critique and the image
are shown in the chat so the user can disagree with the model.

Alongside it, `lint.ts` checks what a picture cannot show. See
[`ai-builder.md`](ai-builder.md).

## Prior art

[`homeassistant-ai/ha-mcp`](https://github.com/homeassistant-ai/ha-mcp) is an
MCP server that lets an agent *operate* a Home Assistant — dashboards included,
with JSON-patch edits and `config_hash` optimistic concurrency. The registry
fetch order, keeping the config hash on import, and the rule that `.storage` is
never edited directly all come from reading it. This project deliberately stops
where that one starts: it reads, renders, and hands you YAML.
