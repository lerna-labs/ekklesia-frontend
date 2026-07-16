# Contributing

Thanks for your interest in contributing to ekklesia-frontend.

## Filing issues

Issues for Ekklesia projects are tracked centrally in [ekklesia-docs](https://github.com/Lerna-Labs/ekklesia-docs). Please file bugs and feature requests there rather than in this repository, so they can be triaged and routed to the right project. If you've found a security vulnerability, see [SECURITY.md](SECURITY.md) instead — do not file it as a public issue.

## Branching

Branch from `development` for new work, and open your pull request back against `development`. `staging` and `main` are integration branches maintained by the maintainers.

## Local checks

Before opening a pull request, run these locally:

```sh
npm run lint
npm run build
```

Both also run in CI on every pull request.

## Changelog entries

Every change needs a changelog entry. Run:

```sh
npm run changeset
```

and follow the prompts to describe your change. CI will fail your pull request if it's missing one — if the change genuinely doesn't need a changelog entry (e.g. it only touches docs or CI config), label the PR `skip-changeset` instead.

## Pull requests

Fill out the pull request template's checklist. A maintainer (see [CODEOWNERS](.github/CODEOWNERS)) will review and merge.
