# pwvm

### **Playwright Version Manager**

A simple *Playwright Version Manager* that solves a common pain point:

> Uncontrolled Playwright upgrades and breaking changes disrupt local setups and CI pipelines.

`pwvm` lets you install, manage, and switch Playwright versions reliably — **one command, predictable behavior**, just like `nvm` for Node.js.

---

## Why pwvm

Playwright evolves fast. That’s great — until a minor upgrade breaks tests you didn’t plan to touch.

`pwvm` keeps Playwright versions:

* isolated per version
* explicit and reproducible
* easy to switch locally and in CI

You upgrade **when you choose**, not when your tooling surprises you.

---

## Install

```sh
npm install -g pwvm
```

Then run the one-time setup:

```sh
pwvm setup
```

Follow the printed instructions to add pwvm shims to your `PATH`.

---

## Common usage

```sh
pwvm install 1.53.0
pwvm use 1.53.0
playwright test
```

Pin versions per project with `.pwvmrc`:

```text
1.53.0
```

---

## CI-friendly

`pwvm` works in GitHub Actions, Azure Pipelines, Bitbucket, and any CI where you control `PATH`.

Install → setup → select version → run Playwright.

---

## Support pwvm

`pwvm` is built and maintained independently to fix a problem many teams quietly struggle with.

If this tool saves you time, CI hours, or debugging frustration:

* ⭐ Star the project
* ❤️ Sponsor the work
* 🔁 Share it with your team

Your support helps keep pwvm maintained and improving.

---

📘 Full documentation and contributing guide: [https://github.com/eaccmk/pwvm](https://github.com/eaccmk/pwvm)
