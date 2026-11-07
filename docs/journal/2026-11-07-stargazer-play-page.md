# 2026-11-07: Play Stargazer in the browser

## Goal
The Stargazer tile opens a page on this site where visitors play the
engine, with the engine running on their own computer (DECISIONS.md,
2026-10-20 and 2026-10-26). Lichess stays a link on that page.

## What was done
- Charlie's choices (2026-11-07, from the plan in the "Build playable
  browser Stargazer" thread): plain exported functions from the engine,
  the `.wasm` committed here, our own board with an open-licence piece
  set, full strength only (difficulty levels parked), and a browser test.
- The engine's half is stargazer PR #47: a small bridge package compiled
  to `stargazer.wasm` (141 KB), attached to each release.
- `site/stargazer.html`: the page. A board you click (piece, then
  square), with the legal squares marked, the last move and a king in
  check highlighted, a promotion picker, new game as White or Black, flip
  the board, the move list in chess notation, and one line on what the
  engine saw ("searched 9 half-moves ahead and rates its position +0.20").
  Works on a phone (the panel goes under the board) and in dark mode.
  `#fen=<FEN>` in the address sets up a position (used by the tests).
- `site/stargazer/engine-worker.js`: loads the `.wasm` in a background
  worker, so the board doesn't freeze while the engine thinks (one second
  a move), and moves text in and out of its memory (about 30 lines).
- `site/stargazer/play.js`: the board and the game. It has no chess rules:
  legal moves, check and the end of the game all come from the engine.
- Pieces: the "cburnett" set (Colin M.L. Burnett, GPL v2 or later),
  copied unchanged from Lichess, credited on the page and in
  `site/stargazer/pieces/README.md`.
- `tools/update-stargazer.sh vX.Y.Z` copies `stargazer.wasm` from a
  Stargazer release, checks its SHA-256 and writes `site/stargazer/ENGINE`
  (tag and checksum). A test checks the file matches it.
- The tile now opens the page (tag: Rust · WebAssembly · Lichess).
- `checks` workflow: installs Playwright 1.56 and runs the browser tests,
  which fail instead of skipping there.

## Problems and fixes
- A browser test promoted a pawn to a knight, and the game ended at once:
  king and knight against king can't checkmate, so the engine (rightly)
  called it a draw. The test promotes to a rook instead.
- This session's Chromium is a newer build than Playwright 1.56 expects, so
  the tests accept `CHROMIUM_PATH` to run locally; CI installs the
  matching browser.
- The first CI run failed before any test: GitHub's `ubuntu-latest` is
  now Ubuntu 26.04, and Playwright 1.56 refuses to install its browser
  there ("does not support chromium on ubuntu26.04-x64"). The `checks`
  job is pinned to `ubuntu-24.04`. (Maplenote's `tests` workflow uses
  `ubuntu-latest` with the same Playwright, so it may hit this too.)
- Opening the page from a file (`file://`) can't start the engine
  (browsers don't allow workers there), so the README now serves `site/`
  with `python3 -m http.server`.

## How it was verified
- `REQUIRE_BROWSER_TESTS=1 python3 -m unittest discover -s tests -v`: 14
  tests pass. The browser tests: you move and the engine replies; an
  illegal move isn't played and the engine's pieces can't be picked up;
  as Black the engine moves first on a flipped board; promotion with the
  picker; checkmate ends the game ("Checkmate. You win!"); no errors in
  the console.
- Proved they can fail: renamed the clock the worker hands the engine, so
  the `.wasm` can't load; every browser test failed. Restored.
- Looked at screenshots: desktop light and dark, and a 390-pixel phone.
- AWS: `aws s3 sync` labels `.wasm` as `application/wasm`; the page loads
  about 18 files the first time, well under the WAF's 500 requests per 5
  minutes per visitor; the distribution's headers policy has no
  Content-Security-Policy, so nothing blocks WebAssembly. No change in
  cloud-homelab.

## Impact
- Every tile still opens something, and Stargazer's now shows the engine
  itself. About 160 KB more on the site (engine, pieces, scripts); $0.
- The site has JavaScript now, on this one page only.
- Before merging: the `.wasm` here was built from stargazer PR #47's
  branch. Once v0.2.0 is tagged, `tools/update-stargazer.sh v0.2.0`
  replaces it with the released file.
