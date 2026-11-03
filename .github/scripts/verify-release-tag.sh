#!/usr/bin/env bash
# Verifies that a release tag is a signed annotated tag that GitHub verifies,
# points at a commit on main, and matches the version in package.json.
# Usage: verify-release-tag.sh <tag>
# Environment: GITHUB_REPOSITORY (owner/name), GH_TOKEN, and GITHUB_SHA (the
# pushed commit; when unset, the signed tag's own commit is used).
set -uo pipefail

tag="${1:-}"
repo="${GITHUB_REPOSITORY:-}"

fail() {
  echo "::error::$1"
  exit 1
}

[ -n "$tag" ] || fail "usage: verify-release-tag.sh <tag>"
[ -n "$repo" ] || fail "GITHUB_REPOSITORY is not set"

ref_json=$(gh api "repos/$repo/git/ref/tags/$tag" 2>/dev/null) ||
  fail "tag $tag does not exist in $repo"
object_type=$(jq -r '.object.type' <<<"$ref_json")
object_sha=$(jq -r '.object.sha' <<<"$ref_json")
[ "$object_type" = "tag" ] ||
  fail "tag $tag is a lightweight tag (ref points at a $object_type); create it with git tag -s so it is an annotated tag object"

tag_json=$(gh api "repos/$repo/git/tags/$object_sha") ||
  fail "could not read tag object $object_sha for $tag"
verified=$(jq -r '.verification.verified' <<<"$tag_json")
reason=$(jq -r '.verification.reason' <<<"$tag_json")
target_type=$(jq -r '.object.type' <<<"$tag_json")
target_sha=$(jq -r '.object.sha' <<<"$tag_json")
[ "$verified" = "true" ] ||
  fail "tag $tag signature is not verified by GitHub (reason: $reason)"
[ "$target_type" = "commit" ] ||
  fail "tag $tag points at a $target_type, not a commit"

expected="${GITHUB_SHA:-$target_sha}"
[ "$target_sha" = "$expected" ] ||
  fail "signed tag $tag points at $target_sha, not the pushed commit $expected"

commit="$target_sha"
git cat-file -e "$commit^{commit}" 2>/dev/null ||
  fail "commit $commit is not available in the local checkout; fetch it first"
git merge-base --is-ancestor "$commit" origin/main 2>/dev/null ||
  fail "tagged commit $commit is not an ancestor of origin/main"

version=$(git show "$commit:package.json" | jq -r '.version')
[ "$tag" = "v$version" ] ||
  fail "tag $tag does not equal v$version, the version in package.json at $commit"

echo "Tag $tag is signed, annotated, on main, and matches package.json ($version)."
