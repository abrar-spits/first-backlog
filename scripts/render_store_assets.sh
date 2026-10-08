#!/usr/bin/env bash
# Renders the Chrome Web Store images in store/ from the pages in store/src/.
# Needs Google Chrome. Usage: scripts/render_store_assets.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/store/src"
OUT="$ROOT/store"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

# The real popup, with a stand-in for chrome.storage so it renders outside Chrome.
mkdir -p "$SRC/build"
python3 - "$ROOT" "$SRC/build/popup-preview.html" <<'PY'
import sys
root, out = sys.argv[1:]
stub = ('<script>window.chrome={storage:{sync:{get:(d,cb)=>cb({...d}),set:(v,cb)=>cb&&cb()},'
        'onChanged:{addListener(){}}}};</script>')
html = open(f'{root}/popup.html').read()
html = html.replace('href="popup.css"', 'href="../../../popup.css"')
html = html.replace('src="icons/', 'src="../../../icons/')
html = html.replace('<script src="settings.js">', stub + '<script src="../../../settings.js">')
html = html.replace('src="popup.js"', 'src="../../../popup.js"')
html = html.replace('<head>', '<head><style>:root{color-scheme:dark}</style>', 1)
open(out, 'w').write(html)
PY

render() { # page width height output [scale]
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --force-dark-mode --blink-settings=preferredColorScheme=0 \
    --force-device-scale-factor="${5:-1}" --virtual-time-budget=3000 \
    --window-size="$2,$3" --screenshot="$OUT/$4" "file://$SRC/$1" 2>/dev/null
  echo "store/$4 ($2x$3 at ${5:-1}x)"
}

render screenshot-1.html 1280 800 screenshot-1.png
render screenshot-2.html 1280 800 screenshot-2.png
render screenshot-3.html 1280 800 screenshot-3.png
render screenshot-4.html 1280 800 screenshot-4.png
render promo-small.html 440 280 promo-small.png
render promo-marquee.html 1400 560 promo-marquee.png
# The banner at the top of README.md, sharp on high-density screens.
render github-banner.html 1280 560 github-banner.png 2
