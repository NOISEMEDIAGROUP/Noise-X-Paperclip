# Contributing to Paperclip

Thanks for your interest in contributing! Whether it's a bug fix, documentation improvement, or new feature, we appreciate your help.

- [Discord](https://discord.gg/m4HZY7xNG3) — chat with the community
- [GitHub Issues](https://github.com/paperclipai/paperclip/issues) — bugs and feature requests
- [GitHub Discussions](https://github.com/paperclipai/paperclip/discussions) — ideas and RFCs

## Getting Started

```sh
git clone https://github.com/paperclipai/paperclip.git
cd paperclip
pnpm install
pnpm dev
```

See `doc/DEVELOPING.md` for detailed dev setup and `AGENTS.md` for engineering rules and repo structure.

## Contribution Pathways

- **Bug fixes and small improvements** — open a PR directly.
- **Docs and typos** — open a PR directly; no issue needed.
- **New features or significant changes** — open a [GitHub Discussion](https://github.com/paperclipai/paperclip/discussions) first so we can align on scope and approach before you invest time.
- **Security vulnerabilities** — use [GitHub's private vulnerability reporting](https://github.com/paperclipai/paperclip/security/advisories/new). Do **not** open a public issue.

## Pre-Submission Checklist

Before opening a PR, make sure everything passes:

```sh
pnpm -r typecheck && pnpm test:run && pnpm build
```

- If your change touches the DB schema, include a migration (`pnpm db:generate`).
- If your change touches an API, update all impacted layers (db, shared, server, ui) per `AGENTS.md`.
- Keep PRs focused — one concern per PR.

## Code Style

- TypeScript throughout. Avoid `any`.
- Keep entities company-scoped (see `AGENTS.md` rule 1).
- Follow existing patterns in the codebase rather than introducing new conventions.
- Prefer simple, direct solutions over abstractions for one-time operations.

## AI-Generated Code

AI-generated contributions are welcome. The same quality bar applies: you must understand the code you submit and ensure it passes the full check suite. If you're an AI agent contributing directly, see `AGENTS.md` for detailed guidance.

## Current Priorities

See the **Roadmap** section in `README.md`. Contributions to docs, OpenClaw integration, and adapter development are especially welcome.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
