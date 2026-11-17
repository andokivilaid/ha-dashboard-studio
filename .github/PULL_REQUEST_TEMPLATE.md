## What changed

<!-- One or two sentences. -->

## Checks

- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build && pnpm test:e2e`
- [ ] If the rendering changed deliberately, visual snapshots were regenerated
      with `pnpm exec playwright test --update-snapshots` and the new PNGs are
      in this PR.
- [ ] If the catalogue changed, `pnpm catalog:validate` passes.
