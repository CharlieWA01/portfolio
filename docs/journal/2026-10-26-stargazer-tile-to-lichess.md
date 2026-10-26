# 2026-10-26: Stargazer tile links to Lichess

## Goal
Make the Stargazer tile work on click now that the engine plays on
Lichess, without giving up the plan to play it in the browser here.

## What was done
- `site/index.html`: the Stargazer tile changed from a greyed-out "soon"
  `div` to a link to `https://lichess.org/@/StargazerEngine` (with
  `rel="noopener"`, like the other outside links). New copy: built from
  scratch in Rust, plays rated games on Lichess, watch or challenge it.
  Tag: Rust · Lichess · AWS EC2.
- DECISIONS.md: why a link to Lichess for now, and what happens when the
  WebAssembly version exists.
- ROADMAP.md: ticked the Lichess link; the WebAssembly item stays open.
- PORTFOLIO.md: the "each tile works on click" line mentions Stargazer.
- `site/ai.html`: stargazer is public now, so the page links its perft
  and SPRT runbooks, its decision log and its CLAUDE.md as evidence, the
  same way it links Maplenote's. The roadmap's parking-lot item now names
  only cloud-homelab (still private).

## Problems and fixes
None.

## How it was verified
`python3 -m unittest discover -s tests -v`: all tests pass, including
"external links use noopener" and "external links are https" for the new
link.

## Cost impact
$0.
