# Contributing

Thanks for looking at this. The portal is a small internal tool that Women Devs SG
volunteers use to set up community events, and it is open source because the pattern
— a form, a spreadsheet as a database, and two automations — is worth sharing.

Contributions are welcome from anyone, whether or not you are part of WDS.

## You don't need our credentials

The live portal reads and writes a real Google Sheet, a real Drive folder, and posts
to the volunteer Telegram channel. We can't hand those out, so the repository ships
with a demo mode instead:

```bash
npm install
cp .env.example .env          # DEMO_MODE=1 is already set
npm run dev                   # http://localhost:8888
```

Type any password at the unlock screen. You get five fictional events from
[`fixtures/tasks.demo.json`](fixtures/tasks.demo.json) and can create more. No Google
or Telegram call is made. Tasks you create land in `wds-portal-demo-tasks.json` in
your system temp directory — the two endpoints are separate functions and cannot
share memory, so they share that file instead. Delete it to reset the demo.

That file only works because both functions run on your machine. A demo deployed to
a preview URL is read-only: it serves the fixtures and tells you so when you submit,
rather than accepting a task that would never appear.

Validation, status codes, and response shapes are identical to production, so demo
mode is a faithful place to work. The three side effects — Sheet, Drive, Telegram —
are the only things replaced.

## Never commit real data

This is the one rule we ask you to be careful about. The repository is public and the
community's records are not.

- **No real event names, volunteer names, locations, or form links** in code,
  fixtures, tests, comments, or commit messages.
- **No screenshots or GIFs of the live portal.** Take them in demo mode. A real
  dashboard screenshot leaks event names and Drive links in a way code review will
  not catch.
- **No credentials, ever** — not in a file, not in a commit message, not in an issue.
  `.env` is gitignored and GitHub push protection is on, but neither is a substitute
  for care. If you think you have committed a secret, say so immediately in the PR
  rather than force-pushing over it quietly; it needs rotating either way.

## Propose before you build

This repository uses [OpenSpec](https://github.com/Fission-AI/OpenSpec). Behaviour is
agreed in Markdown before it is coded, and [`openspec/specs/`](openspec/specs/) is the
source of truth for what the portal does today.

**For anything that changes behaviour**, start with a change proposal rather than a
patch:

```bash
npx @fission-ai/openspec@latest list --specs      # what the portal does today
npx @fission-ai/openspec@latest show task-intake  # read one capability
```

Then add a change under `openspec/changes/<change-name>/` — a `proposal.md` (why and
what), `design.md` (the approach and its trade-offs), delta specs under `specs/`, and
a `tasks.md` checklist. If you use Claude Code, `/opsx:propose "your idea"` scaffolds
all four.

Opening a PR with just the proposal is welcome and often the fastest route — it lets
us agree on the shape before you spend time on the code.

**Bug fixes, refactors, docs, and tooling** change no requirements and need no change
folder. Just open a PR.

## Before you open a PR

```bash
npx @fission-ai/openspec@latest validate --all --strict
node --check netlify/functions/create-task.mjs    # and any file you touched
npm audit --omit=dev
```

Run the synthetic regression suite before submitting frontend changes:

```bash
npm run lint
npm run typecheck
npx playwright install chromium   # once, if the browser is not installed
npm test
```

One Playwright suite covers validation rules, API contracts and browser flows.
`npm test` builds the production frontend, applies its security headers,
and runs the real Netlify handlers through a local test server. It forces demo
mode, removes integration credentials, blocks external browser requests and uses
an isolated temporary demo store. It never loads `.env` or the live portal.

`.github/workflows/validation.yml` runs these commands on pull requests and pushes
with Node 22 and Chromium, plus strict OpenSpec validation and the production
dependency audit. Check hosted results before marking a PR ready.

The HTTPS-only contract test is explicitly pending maintainer approval for issue
#2. Current HTTP(S) compatibility is tested against the form and API; activating
that contract requires a coordinated rule change and updating compatibility tests.

`scripts/diagnostics/debug-google.mjs` and `scripts/diagnostics/test-*.mjs` remain
hand-run integration diagnostics. The Google diagnostics need real credentials;
do not use them for this regression suite.

Conventions the code follows: ESM `import` only, two-space indent, single quotes,
semicolons. Comments explain *why*, not *what*, and are sparse. Match the file you
are editing.

## How PRs get merged

`main` requires a pull request — nobody pushes to it directly. Approvals aren't
mandatory, so a maintainer may merge their own PR after review; yours will be
reviewed by a maintainer before merging.

Once a change is implemented and deployed, its deltas are folded into the main specs
with `npx @fission-ai/openspec@latest archive <change-name>`. Maintainers handle that.

## Security and conduct

Please **don't** report a security problem in a public issue — see
[SECURITY.md](SECURITY.md). By taking part you agree to the
[Code of Conduct](CODE_OF_CONDUCT.md).
