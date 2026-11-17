#!/bin/sh
# Run from the Git repository root after committing changes.
set -eu
node reeltrip-planning/tests/startup_checks.cjs
node reeltrip-planning/tests/navigation_checks.cjs
python3 reeltrip-planning/tests/static_checks.py
git push origin main
git subtree push --prefix=reeltrip-planning origin gh-pages
