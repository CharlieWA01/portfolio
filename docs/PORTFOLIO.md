# portfolio: project summary

*The one page to read before a presentation, resume update or interview.*

## In one sentence
A public page of clickable project tiles, served from a private S3 bucket
through CloudFront and AWS WAF, deployed by GitHub Actions with no stored
keys, for about $7 a month.

## What it shows
- Each tile works on click: Maplenote opens in guest mode with no login.
- A "How I work with AI" page: Claude writes most of the code; I own the
  goals, design, review and verification, with AWS-enforced limits on
  what the AI can change and proof required for every change.
- Built to be glanced at: one page, no scripts, fast everywhere, light and
  dark mode.
- The infrastructure is part of the story: Terraform in `cloud-homelab`,
  every decision recorded with its cost.

## Tech
HTML, CSS · AWS CloudFront (origin access control, managed security
headers), S3, WAF · GitHub Actions with OIDC · Terraform.

## Resume bullet (draft)
- Built and host a public portfolio site on CloudFront and a private S3
  origin behind AWS WAF, defined in Terraform and deployed from GitHub
  Actions via OIDC with a role scoped to one bucket and one distribution.
