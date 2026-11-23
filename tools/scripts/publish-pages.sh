#!/bin/sh
# Run after committing all changes. Publishes only the committed public site.
set -eu
cd "$(git rev-parse --show-toplevel)"
if [ -n "$(git status --porcelain)" ]; then
  echo "Commit changes before publishing." >&2
  exit 1
fi
node tools/tests/startup_checks.cjs
node tools/tests/navigation_checks.cjs
python3 tools/tests/static_checks.py
publish_tmp=$(mktemp -d)
trap 'rm -rf "$publish_tmp"' EXIT HUP INT TERM
mkdir "$publish_tmp/source"
git archive HEAD > "$publish_tmp/source.tar"
tar -xf "$publish_tmp/source.tar" -C "$publish_tmp/source"
python3 "$publish_tmp/source/tools/scripts/build_site.py" --source "$publish_tmp/source" --output "$publish_tmp/site"
git fetch origin gh-pages
publish_parent=$(git rev-parse FETCH_HEAD)
publish_git_dir=$(git rev-parse --absolute-git-dir)
GIT_DIR="$publish_git_dir" GIT_WORK_TREE="$publish_tmp/site" GIT_INDEX_FILE="$publish_tmp/index" git -C "$publish_tmp/site" add --all
publish_tree=$(GIT_DIR="$publish_git_dir" GIT_INDEX_FILE="$publish_tmp/index" git write-tree)
publish_commit=$(git commit-tree "$publish_tree" -p "$publish_parent" -m "Publish Reeltrip from $(git rev-parse --short HEAD)")
git push origin main
git push origin "$publish_commit:refs/heads/gh-pages"
