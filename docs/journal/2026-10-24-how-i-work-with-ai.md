# 2026-10-24: "How I work with AI" tile and page

## Goal
Add a tile, and the page it opens, showing how Charlie directs Claude
across these projects. From a side brainstorm (2026-10-23): of the three
things these projects give Charlie (a portfolio, hands-on AWS and CI/CD,
experience with LLMs), the AI side is the most differentiating and was the
least visible. The repos already hold the evidence.

## What was done
- Read the evidence in maplenote, stargazer and cloud-homelab: each
  repo's `CLAUDE.md`; cloud-homelab's decisions on Claude's read-only
  sandbox role (2026-10-19) and plan-only prod role (2026-10-20) and its
  interview story "Letting an AI agent work on infrastructure without
  trusting it blindly"; stargazer's goal (code Charlie can explain), the
  rig-fairness decision (2026-10-22), "Claude starts standard SPRT tests
  without asking" (2026-10-24) and the Milestone 4 ordering; maplenote's
  autosave-prompt reversal in PR #3's review.
- New page `site/ai.html`, in Charlie's voice, with the candid framing up
  front: Claude writes most of the code; Charlie owns goals, constraints,
  design decisions, review and verification. Sections: who does what; the
  rules (a briefing per repo, plan vs apply enforced by AWS, prove every
  change, docs as memory, trust widened on purpose); four places Charlie
  changed course, plus one where Claude talked Charlie out of something;
  and "keeping myself honest" (the defend-your-design practice, framed
  as the next habit, not a claim, and a light mention of the next AI
  project without naming it).
- A fifth tile on the landing page, `tile-ai`, linking to `ai.html`.
- `style.css`: a single-column article layout for sub-pages, two new
  colour tokens (with dark-mode values) and the tile colour.
- `tests/test_site.py` now runs every check on every `site/*.html` page,
  and a new test fails if a page isn't linked from the landing page.

## Problems and fixes
- stargazer and cloud-homelab are **private**, so links to them would
  404 for a visitor. The page only links to public repos (maplenote,
  this one) and describes the rest in words. Nothing private is quoted:
  no account IDs, role ARNs or resource names.
- A story about the public-logs leak was drafted and then dropped: the
  record doesn't say Charlie caught it, and the page should only claim
  what the decision logs show.
- While proving the new test could fail, restoring with
  `git checkout -- site/index.html` also wiped the uncommitted tile.
  Re-added it; a reminder to commit before breaking things on purpose.

## How it was verified
- `python3 -m unittest discover -s tests -v`: 7 tests pass.
- Proved the checks cover the new page: pointing the tile at a missing
  file fails both the "local file exists" and "reachable from the landing
  page" tests; restored, all pass.
- Rendered both pages in Chromium at 1100 px (light) and 390 px (dark and
  light): no sideways scrolling, text readable in both themes.
- No change to hosting: `aws s3 sync` uploads `ai.html` with the rest of
  `site/`, and CloudFront serves it at `/ai.html`.

## Cost impact
None.
