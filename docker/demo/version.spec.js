// Resolve the active Playwright package directly from the pwvm-managed install.
const path = require("node:path");

const playwrightRoot = process.env.PWVM_PLAYWRIGHT_ROOT;

if (!playwrightRoot) {
  throw new Error("PWVM_PLAYWRIGHT_ROOT is not set");
}

const { test, expect } = require(path.join(playwrightRoot, "test"));
const { version } = require(path.join(playwrightRoot, "package.json"));

test("prints the Playwright version selected by pwvm", async () => {
  // Emit the version into test output so the Docker transcript shows the switch.
  console.log(`PWVM_DEMO_PLAYWRIGHT_VERSION=${version}`);
  expect(version).toBeTruthy();
});
