# Roadmap

## Version 1: a working landing page

- [x] Hosting in workloads-prod: private S3 bucket, CloudFront with origin
      access control, WAF, deploy role (`cloud-homelab`, 2026-10-20)
- [x] Landing page: four tiles (Maplenote, Stargazer, how this site runs,
      homelab), light and dark mode, works on a phone (2026-10-20)
- [x] Deploy on merge via GitHub Actions and OIDC; checks on every PR
- [x] Maplenote's tile points at its prod address, its own CloudFront
      distribution (2026-10-23, after the sandbox copy was deleted)
- [x] "How I work with AI" tile and page (`site/ai.html`, 2026-10-24)
- [ ] A domain (Charlie registers it), then `example.dev` for this page

## Later tiles

- [x] Stargazer's tile links to its Lichess bot, StargazerEngine
      (2026-10-26), until the browser version below exists
- [ ] Stargazer compiled to WebAssembly: play the engine in the browser,
      right on this site (the tile then opens it, and Lichess stays a link
      on that page)
- [ ] Homelab write-ups and a read-only status page (never a path into the
      house)

## Parking lot

- A Content-Security-Policy header on the distribution (the page already
  has no inline scripts or styles, so it can be strict).
- A custom 404 page.
- An "About Charlie" tile or section, with a resume link.
- Links from the AI page to stargazer and cloud-homelab, if those repos
  go public.
- A tile for the next AI project (a research pipeline) once it has
  results worth showing.
- Social preview image (`og:image`) so the link looks good when shared.

## Known limitations

- The address is `d2mxgk1quci5q8.cloudfront.net` until there's a domain.
- The Maplenote tile's address is Maplenote's own `*.cloudfront.net` name
  until there's a domain; if that distribution is ever replaced, the tile
  must change with it.
