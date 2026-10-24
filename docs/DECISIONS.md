# Decisions

Newest at the bottom. Hosting decisions (CloudFront, WAF, two
distributions, the deploy role) are in `cloud-homelab`'s DECISIONS.md,
2026-10-20; this file holds the page's own choices.

## 2026-10-20: Plain HTML and CSS, no framework or build step

**Decision:** the page is hand-written `site/index.html` and
`site/style.css`, with no JavaScript yet.
**Alternatives:** a static site generator (Hugo, Astro) or a React app
(templates and components, but a build step, dependencies to update, and
more to explain for a page with four tiles).
**Why:** it loads instantly, has nothing to patch, and anyone can read
the source. A tile that needs code (Stargazer) brings its own.
**Cost:** $0.

## 2026-10-20: Tiles link out to each app's own address

**Decision:** a tile is a link to its app, not an embed (no iframe).
**Alternatives:** iframes, so apps open inside the page (feels slicker,
but an embedded app shares the page's frame and its security headers
fight it, e.g. `X-Frame-Options: SAMEORIGIN`).
**Why:** keeps Maplenote on its own origin (its sign-in cookie never
mixes with other tiles) and keeps each app independent.
**Trade-off:** visitors leave the page to try an app.

## 2026-10-20: No secrets or IDs in this public repo

**Decision:** the repo is public. The deploy role's ARN and the
distribution ID are repository variables *(superseded 2026-10-23: secrets,
see below)*; the bucket name is worked out at
deploy time from the signed-in account, and the account ID is masked in
the logs.
**Alternatives:** a private repo (hides everything, but employers can't
read the code that runs the site).
**Why:** the code is part of the portfolio. **Cost:** $0.

## 2026-10-23: The role ARN and distribution ID become secrets

**Decision:** `AWS_DEPLOY_ROLE_ARN` and `SITE_DISTRIBUTION_ID` move from
repository variables to repository secrets.
**Supersedes:** keeping them as variables (2026-10-20).
**Why:** the first deploy's public log showed the full role ARN (so the
prod account ID) and the distribution ID. GitHub prints a variable's value
as-is, and `configure-aws-credentials` prints its inputs before
`mask-aws-account-id` starts working. Secrets are printed as `***`. Found
while making maplenote public (maplenote DECISIONS.md, 2026-10-23).
**Alternatives:** *masking by hand* (`::add-mask::`) can't come before the
action prints its inputs. **Cost:** $0.

## 2026-10-24: A "How I work with AI" page, candid about who writes the code

**Decision:** a fifth tile opens `site/ai.html`, a page on this site (not
a separate app) about how Charlie directs Claude. It says plainly that
Claude writes most of the code and that Charlie owns the goals,
constraints, design decisions, review and verification, then backs that
with the rules and decisions from the repos.
**Alternatives:** leave it implicit (each project's summary already says
"built with Claude Code", but nobody reads that far); a blog post or
README (not on the page an employer actually opens); downplaying the AI
(the repos and commit trailers show it anyway, and getting caught
overselling is worse than saying it up front).
**Why:** it's the most differentiating thing these projects show and was
the least visible. The evidence already exists in the decision logs.
**Links:** only to public repos. stargazer and cloud-homelab are private,
so the page describes their rules in words; if they go public, links can
be added.
**Cost:** $0.

