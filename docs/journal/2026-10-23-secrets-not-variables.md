# 2026-10-23: The deploy's IDs become secrets

## Goal
Stop the public deploy logs showing the prod account ID and the landing
page's distribution ID.

## What was done
1. Read the one deploy run's log the way a stranger would (while scrubbing
   maplenote to go public): "Sign in to AWS (prod)" printed
   `role-to-assume: arn:aws:iam::<full prod account ID>:role/…`, and the
   cache step printed the distribution ID.
2. Switched `deploy.yml` to `secrets.AWS_DEPLOY_ROLE_ARN` and
   `secrets.SITE_DISTRIBUTION_ID`, and updated CLAUDE.md and the README.
3. Charlie: set the two secrets before merging, delete the two variables
   after, and Claude deletes the old deploy run once Charlie says so.

## Problems and fixes
- `mask-aws-account-id: true` doesn't cover the role ARN, because the
  action prints its inputs first. Secrets are masked from the start.

## How it was verified
- `python3 -m unittest discover -s tests -v` passes.
- After the merge: the new deploy's log shows `role-to-assume: ***` and
  `DISTRIBUTION_ID: ***`.

## Cost impact
None.
