# Interview stories

STAR stories (situation, task, action, result) drawn from this repo. The
infrastructure stories live in `cloud-homelab`'s `docs/interview/`.

## Saying plainly that an AI writes my code
**Tags:** Process, Communication

- **Situation:** Claude writes most of the code in my projects. That's
  visible in every commit, and an interviewer will ask about it.
- **Task:** Present it honestly, and show what I actually contribute.
- **Action:** Built a "How I work with AI" page on my portfolio. It opens
  with the plain split (Claude writes code; I own goals, constraints,
  design, review and verification), then shows the rules with evidence:
  a briefing file per repo, AWS-enforced limits (the AI can plan
  infrastructure changes, only I apply them), statistical proof before a
  strength change merges, and decision logs that record where I changed
  its course and where it changed mine.
- **Result:** The question "did you write this?" becomes a conversation
  about judgment and verification, which is the part that's mine. The
  next step is practising explaining each design back in my own words.

## A chess engine in a web page, for $0 a month
**Tags:** Architecture, Cost, Testing

- **Situation:** My portfolio's chess engine tile only linked to Lichess.
  I wanted visitors to play the engine itself, one click from the page,
  without paying for or protecting a server.
- **Task:** Run the engine in the visitor's browser, on a static site with
  no build step.
- **Action:** Months earlier I'd made "runs in a browser" a design rule
  for the engine (no clock or input inside the core). So the engine
  didn't change: a small bridge compiles to a 141 KB WebAssembly file
  that each release publishes with a checksum. The page runs it in a
  background worker and asks it for legal moves, so the page has no chess
  rules of its own. I chose plain exported functions over a glue library,
  full strength over a quick difficulty slider, and a browser test in CI
  that plays real moves.
- **Result:** A playable engine on a static site, costing nothing to run,
  with nothing server-side to attack. The tests caught a real subtlety on
  the first run: promoting to a knight with only kings left is a draw.
