#!/bin/sh
# Usage: ./deploy.sh "commit message"
set -e
msg="${1:-update}"
git add projis/
git commit -m "$msg

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin main
echo "Deployed → https://teroniskanen.github.io/projis/"
