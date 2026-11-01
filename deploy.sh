#!/bin/sh
# Copy ShineSlot into the public Pages repo and stamp a version on every script link,
# so phones load the new files instead of an old cached copy.
# Usage: sh deploy.sh /path/to/shineslot-pages-repo
set -e
dest="$1"; [ -d "$dest/.git" ] || { echo "usage: sh deploy.sh <pages repo>"; exit 1; }
v=$(date +%Y%m%d%H%M)
cp -r ./. "$dest/"
cd "$dest"
sed -i "s|src=\"app.js[^\"]*\"|src=\"app.js?v=$v\"|" index.html
for f in app.js cloud.js sample.js; do
  sed -i -E "s#from '\./([a-z]+)\.js(\?v=[0-9]+)?'#from './\1.js?v=$v'#g" "$f"
done
echo "stamped v=$v"
