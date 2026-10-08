#!/usr/bin/env bash
# Builds the zip to upload to the Chrome Web Store: only the files the
# extension runs, nothing from store/ or scripts/.
# Usage: scripts/package.sh  ->  dist/first-backlog-<version>.zip
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')"
OUT="dist/first-backlog-$VERSION.zip"

mkdir -p dist
rm -f "$OUT"
zip -q -X "$OUT" manifest.json settings.js corners.js content.js popup.html popup.css popup.js \
  icons/icon16.png icons/icon32.png icons/icon48.png icons/icon128.png
unzip -l "$OUT"
echo "Built $OUT"
