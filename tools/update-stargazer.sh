#!/bin/sh
# Copy the Stargazer engine for the play page (site/stargazer.html) from a
# Stargazer release: downloads stargazer.wasm, checks it against the
# release's SHA-256, and records the tag and checksum in
# site/stargazer/ENGINE. Then open a PR with the result.
#
# Usage, from the repo root:  tools/update-stargazer.sh v0.2.0
set -eu

tag="${1:?usage: tools/update-stargazer.sh vX.Y.Z}"
release="https://github.com/CharlieWA01/stargazer/releases/download/$tag"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

curl -fsSL -o "$work/stargazer.wasm" "$release/stargazer.wasm"
curl -fsSL -o "$work/stargazer.wasm.sha256" "$release/stargazer.wasm.sha256"
(cd "$work" && sha256sum -c stargazer.wasm.sha256)

cp "$work/stargazer.wasm" site/stargazer/stargazer.wasm
chmod 644 site/stargazer/stargazer.wasm
sum=$(cut -d' ' -f1 "$work/stargazer.wasm.sha256")
cat > site/stargazer/ENGINE <<END
# The Stargazer release the play page runs, and its SHA-256 from the
# release page. Written by tools/update-stargazer.sh; the site checks
# compare stargazer.wasm against it.
tag=$tag
sha256=$sum
END
echo "site/stargazer/stargazer.wasm is now Stargazer $tag ($sum)."
