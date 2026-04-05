#!/bin/sh
set -eu

# Print a clear banner before each major demo phase.
show_step() {
  printf '\n============================================================\n'
  printf '%s\n' "$1"
  printf '============================================================\n'
}

# Echo the command first so the demo transcript is easy to follow later.
run_cmd() {
  printf '$ %s\n' "$*"
  "$@"
}

# Prove that plain `playwright` commands resolve to the version selected by pwvm.
show_identity() {
  show_step "$1"
  echo "This is the natural CLI flow after pwvm setup: plain playwright commands."
  run_cmd pwvm current
  run_cmd playwright --version
  CURRENT_VERSION="$(pwvm current | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | tail -n 1)"
  if [ -z "$CURRENT_VERSION" ]; then
    echo "Failed to determine the active Playwright version"
    exit 1
  fi
  PWVM_PLAYWRIGHT_ROOT="${HOME}/.pwvm/versions/${CURRENT_VERSION}/node_modules/playwright"
  export PWVM_PLAYWRIGHT_ROOT
  run_cmd playwright test /demo/version.spec.js --reporter=line --workers=1
}

# Basic runtime context so the transcript makes it obvious we are not root.
show_step "pwvm Docker demo starting"
echo "User: $(id -un)"
echo "Home: ${HOME}"
echo "Shell: ${SHELL:-/bin/sh}"

# Set up pwvm and enable the shim directory for the current shell session.
show_step "Install pwvm and configure shims"
run_cmd pwvm --version
run_cmd pwvm setup
export PATH="${HOME}/.pwvm/shims:$PATH"
echo "Shim PATH enabled for this session: ${HOME}/.pwvm/shims"

show_step "Install two explicit Playwright versions"
run_cmd pwvm install 1.40.0 --no-browsers
run_cmd pwvm install 1.57.0 --no-browsers
run_cmd pwvm list

show_step "Switch to 1.40.0 and verify natural playwright resolution"
run_cmd pwvm use 1.40.0
show_identity "Playwright routed through pwvm at 1.40.0"

show_step "Switch to 1.57.0 and verify natural playwright resolution"
run_cmd pwvm use 1.57.0
show_identity "Playwright routed through pwvm at 1.57.0"

show_step "Install latest Playwright and switch to the resolved version"
# Capture the resolved semver so the demo can show the exact latest version used.
pwvm install latest --no-browsers | tee /tmp/pwvm-install-latest.log
LATEST_VERSION="$(awk '/Resolved latest Playwright version to / { print $NF }' /tmp/pwvm-install-latest.log | tail -n 1)"

if [ -z "$LATEST_VERSION" ]; then
  echo "Failed to determine resolved latest Playwright version"
  exit 1
fi

run_cmd pwvm use "$LATEST_VERSION"
show_identity "Playwright routed through pwvm at latest (${LATEST_VERSION})"

show_step "Prune older versions while keeping the active one"
echo "Installed versions before prune:"
run_cmd pwvm list
run_cmd pwvm prune
echo "Installed versions after prune:"
run_cmd pwvm list
show_identity "Playwright still works after pruning old versions"

show_step "Remove pwvm completely from the container"
run_cmd npm uninstall -g pwvm
run_cmd rm -rf "${HOME}/.pwvm"
# Clear shell command hashing so command existence checks reflect the uninstall.
hash -r 2>/dev/null || true

if command -v pwvm >/dev/null 2>&1; then
  echo "pwvm should have been removed, but is still on PATH"
  exit 1
fi

if command -v playwright >/dev/null 2>&1; then
  echo "playwright shim should have been removed, but is still on PATH"
  exit 1
fi

echo "pwvm and its shims were removed successfully."
echo "Docker demo completed successfully."
