# portfolio

Charlie's portfolio: one page of project tiles, each one something you can
click and try. Live at **https://d2mxgk1quci5q8.cloudfront.net** (a real
domain comes later).

## How it runs

```
visitor ─HTTPS─▶ CloudFront ─▶ AWS WAF (per-visitor rate limit, AWS common rules)
                    │
                    └─ origin access control ─▶ private S3 bucket (site/)

push to main ─▶ GitHub Actions ─OIDC─▶ deploy role ─▶ sync site/, clear cache
```

- **Static files only:** plain HTML and CSS in `site/`, no build step and
  no JavaScript.
- **Private bucket:** nobody can read S3 directly; only this site's
  CloudFront distribution can.
- **No stored keys:** the deploy workflow signs in to AWS with GitHub's OIDC
  token, as a role that can only write this site's files and clear its
  cache.
- **Infrastructure in Terraform** in Charlie's `cloud-homelab` repo
  (`terraform/prod`), applied by hand after review.
- **Cost:** about $7 a month, almost all of it the WAF. CloudFront's free
  allowance covers the traffic.

## Working on it

Open `site/index.html` in a browser; that's the whole site. Before a PR:

```sh
python3 -m unittest discover -s tests -v
```

Merging to `main` deploys. The deploy workflow needs two repository
variables (Settings → Secrets and variables → Actions → Variables):
`AWS_DEPLOY_ROLE_ARN` and `SITE_DISTRIBUTION_ID`, both from
`terraform output` in `cloud-homelab/terraform/prod`.

## Docs

`docs/ROADMAP.md` (what's next), `docs/DECISIONS.md` (why it's built this
way), `docs/journal/` (what happened), following `docs/DOCS-STANDARD.md`.
