# Release Artifact Decision

This app builds into a static site via `adapter-static`. Until now there was no Dockerfile, no host config, and no defined release artifact in this repo — this document records the decision so a publish workflow can be wired up on top of it later.

## Decision

**The release artifact is a tarball of the built static output**, attached to each GitHub release. Nothing in this repo runs the site directly; hosting is handled by whatever consumes the release artifact.

A container image was considered and rejected for now — there's no host in this repo's scope that needs to run a long-lived process, just static files to serve. A tarball keeps the artifact simple and lets the consuming host decide how to serve it (nginx, a CDN, another service's build step, etc.). This can be revisited if a containerized deployment target shows up.

## Which builds ship

- **Production** (`npm run build`) is the only build that produces a versioned release artifact, and only on a version bump landing on `main`.
- **Preprod/staging** builds run when those branches update, for preview purposes — they are not packaged as release artifacts.

## Out of scope here

Wiring the actual publish workflow (tagging a release, building, packaging the tarball, attaching it to the GitHub release) is separate follow-up work, not covered by this decision doc.

## Node version

`package.json` declares `engines.node: ">=20"` regardless of the artifact strategy above.
