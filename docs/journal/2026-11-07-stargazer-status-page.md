# 2026-11-07: The Stargazer bot's status page

## Goal
The page half of stargazer's Milestone 5c: a public status page for the
Lichess bot, reading the files the AWS side writes (cloud-homelab,
stargazer-history.tf).

## What was done
- `site/stargazer-bot.html` and `site/stargazer/status.js`: right now
  (online, off for the night, or offline; today's games and ratings), the
  two SLOs against their targets, rating over time per speed (an SVG
  drawn by the script), results by speed and colour, top openings, and
  the latest games linked to Lichess. The live file refreshes every
  minute while the tab is visible.
- Linked from the play page ("how the bot is doing").
- The deploy's sync excludes `data/*`; without it every deploy would
  delete the Lambdas' files.
- `tests/test_site.py`: "reachable from the landing page" follows links
  through pages, since this page hangs off the play page.
- `tests/test_status.py`: the page in Chromium against sample files
  (Playwright answers the two requests), plus checks without a browser.

## Problems and fixes
- Opponents' names come from Lichess, and a file in the bucket could be
  tampered with, so the page builds everything with `textContent` and
  `createElement`. A test feeds it `<img src=x onerror=...>` as a name
  and an opening and checks it shows as text and no image appears; a
  test fails on any `innerHTML` in the script; a game id that isn't
  Lichess's 8-character shape isn't made a link.
- When does "offline" mean "off for the night"? The observer only checks
  from 10:05 to 21:15, so a check older than 15 minutes means it's
  outside the bot's hours; today's counters hide after 2 hours so
  yesterday's don't pass for today's.

## How it was verified
- `REQUIRE_BROWSER_TESTS=1 python3 -m unittest discover -s tests -v`:
  27 tests pass (10 new).
- Proved the new tests can fail: linking any game id failed the hostile
  data test; an `innerHTML` in the script failed the no-HTML check;
  removing the exclude from the deploy failed the deploy check. Each
  restored.
- Screenshots at desktop and phone width with sample data: no sideways
  scrolling at 390 px (preview in the project files,
  `stargazer/status-page-preview.png`).

## Impact
A new page that shows "No data yet" until the AWS side is applied and
backfilled. $0 here.
