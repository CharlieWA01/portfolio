# portfolio: briefing for Claude

Charlie's public portfolio: a Neal.fun-style page of project tiles that an
employer can glance at and click. Each tile is a project that works on
click (Maplenote first). Charlie is an associate systems engineer, newer to
app development; explain choices in plain language.

Start of a session: read `docs/ROADMAP.md` and `docs/DECISIONS.md`. The
infrastructure (bucket, CloudFront, WAF, deploy role) is Terraform in the
`cloud-homelab` repo, `terraform/prod`; its DECISIONS.md (2026-10-20) has
the hosting decisions.

## Documenting is part of every task

Follow `docs/DOCS-STANDARD.md` (shared with Charlie's other repos). A task
isn't done until, in the same PR: a journal entry (`docs/journal/`), real
choices in `docs/DECISIONS.md`, the roadmap ticked, and `docs/PORTFOLIO.md`
when headline facts change. Never edit `docs/HISTORY.md` by hand; a
workflow appends to it. The `docs-check` workflow fails PRs that change
code without touching `docs/`. End every GitHub comment Claude posts with
`— Claude`.

## Ground rules

- `site/` is plain HTML, CSS and small same-origin scripts. No
  build step, no CDNs, no inline scripts or `style` attributes, so a
  strict Content-Security-Policy can be added (it will need
  `'wasm-unsafe-eval'` for the play page). `tests/test_site.py`
  enforces the basics.
- The Stargazer play page (`site/stargazer.html`, `site/stargazer/`) runs
  the engine as WebAssembly in a worker. `stargazer.wasm` comes only from
  a tagged Stargazer release, via `tools/update-stargazer.sh` (never built
  here or edited); `site/stargazer/ENGINE` names the release.
  `tests/test_play.py` plays it in Playwright's Chromium.
- **This repo is public.** No account IDs, bucket names, distribution IDs,
  email addresses or anything from Terraform output in the code. Anything
  holding the account ID or a resource ID goes in a repository **secret**,
  never a variable or a `run:` line (both are printed in the public logs).
- Tiles for apps with real data and a login (Maplenote) link to that app's
  own address, never embed it: each such app keeps its own browser origin
  (cloud-homelab DECISIONS.md, 2026-10-20).
- Keep it fast and light: a visitor only glances.

## How we work

Work on a branch, open a PR; Charlie reviews and merges. Run
`REQUIRE_BROWSER_TESTS=1 python3 -m unittest discover -s tests -v` before
pushing (Playwright from `requirements-dev.txt`). Merging to `main`
deploys (`.github/workflows/deploy.yml`).
