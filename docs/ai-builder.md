# The AI builder

What happens between typing a sentence and seeing a dashboard.

## The loop

```
          user: "a phone-first home view with the lights and the front door"
                                   │
                    ┌──────────────▼───────────────┐
                    │ entity inventory              │  diagnostics, config
                    │ (packages/lovelace/mock/hass) │  entities, hidden and
                    └──────────────┬───────────────┘  unavailable removed
                                   │
                    ┌──────────────▼───────────────┐
                    │ POST /api/ai/generate         │  Claude or Gemini,
                    │ GENERATOR_SYSTEM + inventory  │  user's own key
                    └──────────────┬───────────────┘
                                   │ one fenced yaml block
                    ┌──────────────▼───────────────┐
                    │ parse → validate → render     │  invalid YAML is
                    └──────────────┬───────────────┘  rejected, not applied
                                   │
                    ┌──────────────▼───────────────┐
                    │ modern-screenshot on the live │  in the browser, so no
                    │ DOM → PNG data URL            │  headless browser needed
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │ POST /api/ai/critique         │  vision model sees the
                    │ CRITIC_SYSTEM + image + yaml  │  render it produced
                    └──────────────┬───────────────┘
                                   │
                    corrected YAML applied, and the chat shows both the
                    critique and the exact image the model looked at
```

## Why the generator prompt is so prescriptive

Models have read a great deal of Lovelace YAML, and most of it is old. Left
alone they reach for masonry views, `entities` cards and `show_header_toggle`,
which is what a 2020 dashboard looked like. `GENERATOR_SYSTEM` therefore states
current practice explicitly: sections views, heading cards, tile features per
domain, `grid_options` for width, badges for presence and whole-home power.

It also forbids inventing entity ids. The inventory is in the prompt; anything
outside it is a hallucination that renders as a dead card, so the model is told
to say so in prose instead.

## Why the critique is a separate call

Asking one call to write YAML *and* judge it does not work: the model has not
seen the result. Splitting it means the second call genuinely looks at pixels —
at whether three tiles each took a full row and left the grid half empty, at
whether a name is truncated, at whether a card shows "Unavailable". Those are
things you cannot see in the YAML.

The critic is told to judge only what it can see and to return an empty issue
list when the dashboard looks right, because a reviewer that always finds
something will churn a good layout into a worse one.

## Keys

The key is entered in the UI, kept in `localStorage`, and sent with each
request to this app's own API route, which uses it for exactly that call. It is
never logged and never stored server-side. Provider error strings are run
through a redactor before they reach the response, so a 401 cannot echo the key
back into the browser.

If you would rather not hand a key to a web app at all, run the studio locally —
`pnpm dev` — and it is the same code on your own machine.

## Costs

One "build me a dashboard" turn is two requests: a generation (a few thousand
input tokens for the inventory, a few thousand output for the YAML) and a
critique (one screenshot plus the YAML). The visual self-check can be turned
off in settings, which halves it.

## Testing it without spending anything

`tests/e2e/builder.spec.ts` stubs `/api/ai/generate` and `/api/ai/critique` at
the network layer and drives the whole flow: send a message, assert the YAML is
applied to the live preview, assert the self-check captured a real PNG and
displayed it, assert a provider error surfaces as an alert instead of being
swallowed.
