# Docker Guide

`pwvm` works well in Docker when you want reproducible Playwright version switching without mutating the host machine.

This Docker flow is separate from the published npm package story. The demo uses this repository's current code by building and packing the repo locally, then installing that tarball into a disposable image. That keeps the npm package lightweight while still giving us a strong Docker validation path for development, demos, and future image publishing work.

## Why use pwvm in Docker

- Keep multiple Playwright versions cached inside one container image or runtime home directory.
- Switch versions quickly with `pwvm use` instead of rebuilding the whole environment for every version change.
- Prove that plain `playwright` commands resolve naturally through the pwvm shim.
- Demo or validate version-management behavior in an isolated environment.
- Test non-root container usage early, which is closer to how many production containers run.

## What the Docker demo proves

The Docker demo in this repo validates that a non-root container can:

- install `pwvm` from this repo's current packaged build
- run `pwvm setup`
- install multiple Playwright versions
- switch versions with `pwvm use`
- run plain `playwright --version`
- run plain `playwright test`
- show the active Playwright version during the test run
- prune older versions while keeping the active one working
- remove `pwvm` and its shims cleanly at the end

## Why this is useful for testing

Docker makes this easier to trust because the environment is disposable and repeatable.

- The demo does not depend on your host shell profile.
- The demo runs as a non-root `app` user.
- The demo installs Playwright versions with `--no-browsers` so it stays focused on version routing rather than browser provisioning.
- The demo exercises the natural user path: `pwvm setup`, `pwvm use`, then plain `playwright ...`.

## How to run the Docker demo

Prerequisites:

- Docker daemon running locally
- Node/npm available on the host so the repo can be built and packed

Run:

```sh
node scripts/docker-demo.mjs
```

What happens:

1. `npm run build` builds the CLI into `dist/`.
2. `npm pack` creates a local package tarball from this repo.
3. Docker builds a non-root demo image from [`../Dockerfile.demo`](../Dockerfile.demo).
4. The image runs [`demo/run-demo.sh`](./demo/run-demo.sh).
5. The script installs multiple Playwright versions, switches between them, and shows the selected version during `playwright test`.

## Demo files

- [`../Dockerfile.demo`](../Dockerfile.demo)
  Builds the non-root demo image.
- [`../scripts/docker-demo.mjs`](../scripts/docker-demo.mjs)
  Builds the repo, packs it locally, then builds and runs the Docker demo image.
- [`demo/run-demo.sh`](./demo/run-demo.sh)
  Runs the end-to-end pwvm walkthrough inside the container.
- [`demo/version.spec.js`](./demo/version.spec.js)
  Prints the resolved Playwright version during the demo test run.

## Benefits of a Dockerized pwvm workflow

### Cached multi-version installs

`pwvm` stores Playwright versions under `~/.pwvm/versions/<version>`, so one container environment can keep multiple versions available at once.

That means:

- no reinstall just to switch back and forth between versions
- faster verification when you need to compare old and new Playwright behavior
- simpler test-matrix experiments in a controlled environment

### Easy version switching

Once versions are installed, switching is cheap:

```sh
pwvm use 1.40.0
playwright --version

pwvm use 1.57.0
playwright --version
```

That is especially useful in Docker because the container can serve as a stable reusable sandbox for version comparisons.

### Cleaner host machine

Using the Docker demo avoids mixing experimental pwvm state with your host environment. The shim path, installs, and cleanup all happen inside the container.

## About npm package size and publish footprint

The Docker demo files are repo-only tooling and documentation. They are not part of the npm package allowlist used for publish.

The npm package remains lightweight because [`../package.json`](../package.json) only publishes:

- `dist`
- `README.md`
- `wiki`
- `LICENSE`

## Next steps

When you are ready, this Docker guide can support:

- a polished README Docker section
- CI smoke tests around Docker usage
- a future public Docker image built on the same non-root pattern
