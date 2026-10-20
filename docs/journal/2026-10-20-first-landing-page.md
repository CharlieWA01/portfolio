# 2026-10-20: The first landing page

## Goal
Get a functional landing page live on the portfolio's CloudFront address,
the same evening the hosting was built (cloud-homelab journal,
2026-10-20-portfolio-site-start.md).

## What was done
- Charlie created the public `portfolio` repo (after trying `canopy` and
  `cwa-portfolio` as names).
- Wrote `site/index.html` and `site/style.css`: four tiles in a grid
  (Maplenote, Stargazer, how this site runs, homelab), colours as CSS
  variables, dark mode from the system setting, hover lift that respects
  "reduce motion", keyboard focus outlines.
- `tests/test_site.py` (plain Python, no installs): local files exist, no
  inline scripts or styles, external links are HTTPS with `rel="noopener"`,
  no placeholders left. Run by the `checks` workflow on every PR and before
  every deploy.
- `deploy` workflow: OIDC sign-in, `aws s3 sync --delete`, CloudFront
  invalidation. The bucket name is worked out from the account at deploy
  time so no ID appears in this public repo.
- Copied the shared docs standard, journal template, PR template and the
  `docs-check` and `docs-history` workflows from `cloud-homelab`.

## Problems and fixes
- `python3 -m unittest` alone found no tests (the `tests/` folder isn't a
  package); the workflows use `python3 -m unittest discover -s tests`.

## How it was verified
- The tests pass, and each was seen to fail first: with the placeholder
  link left in (2 failures) and with `rel="noopener"` removed (1 failure).
- The live checks (deploy run, the page in Chrome) are recorded when the
  first deploy runs.

## Cost impact
None beyond the hosting (about $7 a month, in `cloud-homelab`).
