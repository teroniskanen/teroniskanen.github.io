#!/bin/sh
# Usage: ./deploy.sh "commit message"
set -e
msg="${1:-update}"

ver_file="projis/js/version.js"
cur_ver="$(sed -n "s/^export const APP_VERSION = '\\([0-9][0-9]*\\.[0-9][0-9]*\\)';$/\\1/p" "$ver_file")"
if [ -z "$cur_ver" ]; then
  echo "Could not parse version from $ver_file"
  exit 1
fi
next_ver="$(awk -v v="$cur_ver" 'BEGIN { printf "%.2f", v + 0.01 }')"
sed -i '' "s/^export const APP_VERSION = '.*';$/export const APP_VERSION = '$next_ver';/" "$ver_file"
echo "Version bumped: $cur_ver -> $next_ver"

git add projis/
git commit -m "$msg

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin main
echo "Deployed → https://teroniskanen.github.io/projis/"
