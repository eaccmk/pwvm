# Security Policy

`pwvm` uses deterministic Playwright installs by requiring explicit version selection and isolating each version (including browser binaries) in a fixed directory. No automatic upgrades or background resolution occurs.

## Security & Network Behavior

`pwvm` does not perform any background network activity.

Network requests and shell executions only occur when explicitly triggered by user commands such as:
- `pwvm install`
- `pwvm list-remote`

These requests are limited to read-only HTTPS calls (e.g., npm registry metadata lookup).
No automatic upgrades, background resolution, or implicit downloads occur.

Commands like `use`, `list`, `current`, `doctor`, and `prune` operate entirely on local state and do not access the network.

## Responsible Disclosure

If you discover a security issue, please open a private issue or contact the maintainer.