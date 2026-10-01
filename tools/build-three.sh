#!/usr/bin/env bash
# Rebuilds js/vendor/three.js with exactly the names js/clay3d.js imports (tree-shaken + minified).
# Usage: tools/build-three.sh [three-version]
set -euo pipefail
VER="${1:-0.186.1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
cd "$TMP"
npm init -y >/dev/null
npm i -s "three@$VER" esbuild >/dev/null 2>&1
NAMES=$(python3 -c "
import re;s=open('$ROOT/js/clay3d.js').read()
m=re.search(r\"import \{([^}]*)\} from './vendor/three.js'\",s)
print(','.join(x.strip() for x in m.group(1).split(',') if x.strip()))")
echo "export { $NAMES } from 'three';" > entry.js
./node_modules/.bin/esbuild entry.js --bundle --minify --format=esm --target=es2020 --legal-comments=eof \
  --banner:js="/* three.js r${VER#0.} (MIT) — subset bundled for Pulse by tools/build-three.sh */" --outfile="$ROOT/js/vendor/three.js"
rm -rf "$TMP"
