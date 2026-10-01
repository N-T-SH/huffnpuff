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
NAMES=$(python3 - "$ROOT" <<'PY'
import re, sys, glob
root = sys.argv[1]
names = set()
for f in glob.glob(root + '/js/**/*.js', recursive=True):
    if '/vendor/' in f: continue
    for m in re.finditer(r"import \{([^}]*)\} from '[./]*vendor/three.js'", open(f).read()):
        names |= {x.strip() for x in m.group(1).split(',') if x.strip()}
addons = {'EffectComposer': 'postprocessing/EffectComposer.js', 'RenderPass': 'postprocessing/RenderPass.js', 'ShaderPass': 'postprocessing/ShaderPass.js', 'OutputPass': 'postprocessing/OutputPass.js', 'BokehPass': 'postprocessing/BokehPass.js'}
core = sorted(n for n in names if n not in addons)
print("export { %s } from 'three';" % ', '.join(core))
for n in sorted(names & addons.keys()):
    print("export { %s } from 'three/addons/%s';" % (n, addons[n]))
PY
)
echo "$NAMES" > entry.js
./node_modules/.bin/esbuild entry.js --bundle --minify --format=esm --target=es2020 --legal-comments=eof \
  --banner:js="/* three.js r${VER#0.} (MIT) — subset bundled for Pulse by tools/build-three.sh */" --outfile="$ROOT/js/vendor/three.js"
rm -rf "$TMP"
