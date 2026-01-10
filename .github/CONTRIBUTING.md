# Contributing to pwvm

Contributions are welcome ❤️  
Bug fixes, improvements, and documentation updates are all appreciated.

---

## Project requirements

This project uses:

- **Node.js ≥ 18**
- **ESM (`type: module`)**
- `node:*` imports
- **Separate TypeScript configs for build and tests**

### TypeScript & VS Code notes (important)

If you see editor or type errors:
1. Use the **workspace TypeScript version** in VS Code
2. Restart the TypeScript server
3. Ensure dependencies are installed with `npm install`

---

## Forking and setup

1. [Fork](https://github.com/eaccmk/pwvm/fork) the repository
2. Clone your fork
3. Install dependencies:

```sh
npm install
```

## Local development

Build the project:
```sh
npm run build
```

Run unit tests:
```sh
npm test
```

Run the CLI locally:
```sh
node dist/index.js <command>
```

### Integration (e2e) tests
Integration tests live under `itest/`

To run them locally:
```sh
npm run test:e2e
```
Please **re-skip integration tests before submitting a PR**, unless explicitly requested.

## Verifying changes locally

### Before opening a pull request, please verify:

- Build passes: `npm run build`

- Unit tests pass: `npm test`

- Package builds: `npm pack`

- Install tarball locally:
```sh
npm install -g ./pwvm-*.tgz
```

- Verify basic commands:
```sh
pwvm --version
pwvm doctor
```

## Submitting a Pull Request

- Open PRs against the main branch

- Keep PRs focused and reasonably small

- Clearly describe the motivation and impact of your change

## Uninstall (local testing cleanup)

```sh
rm -rf "$HOME/.pwvm"
npm uninstall -g pwvm
```

> [!TIP]
> Remove any PATH entry added during `pwvm setup`.

### Status

### Beta (0.x)

`pwvm` is stable for daily use but may introduce changes before `1.0.0`.
Feedback and issues are welcome.

> [!NOTE] Playwright licensing

`pwvm` interacts with Playwright at runtime but does **not ship or modify** Playwright source code.

Playwright is licensed under the **Apache License, Version 2.0**:
https://github.com/microsoft/playwright/blob/main/LICENSE