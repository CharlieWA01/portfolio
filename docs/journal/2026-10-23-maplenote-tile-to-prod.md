# 2026-10-23: Maplenote tile points at prod

## Goal
Fix the dead Maplenote tile. Charlie noticed clicking it went nowhere.

## What was done
- Found the cause: the tile linked straight to the sandbox copy's Lambda
  function URL (`…lambda-url.us-east-2.on.aws`). That copy was deleted
  about 40 minutes earlier, once Maplenote was live in workloads-prod
  (cloud-homelab#27, maplenote#27), so the address no longer exists.
- Pointed the tile at Maplenote's prod address, its own CloudFront
  distribution `https://d2zye7hhdqzevn.cloudfront.net/`. The address is in
  maplenote's `PROD_URL` variable and printed as the `production`
  environment's URL at the end of each `deploy-prod` run (that's where it
  was read from). A `*.cloudfront.net` name isn't an account or resource
  ID, so it's fine in this public repo, like the page's own address.
- Added a test that no tile links straight to a Lambda function URL, so a
  sandbox-style address can't slip back in.

## Problems and fixes
- The roadmap already said "points at sandbox for now", but nothing tied
  the sandbox teardown to this repo, so the link broke silently. The new
  test guards the specific mistake; a link checker in CI is a possible
  later step (it would need network access to the live addresses).

## How it was verified
- `python3 -m unittest discover -s tests -v`: all pass.
- Proved the new test can fail: with a `…lambda-url…` link put back, it
  fails; restored, it passes.
- The live check (clicking the tile) happens after merge and deploy.

## Cost impact
None.
