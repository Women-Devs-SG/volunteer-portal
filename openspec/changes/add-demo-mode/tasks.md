## 1. Fixtures

- [x] 1.1 Add `fixtures/tasks.demo.json` with 5 fictional tasks in the shape
      `GET /api/tasks` returns, covering a task with no Drive URL and one with a
      long description
- [x] 1.2 Confirm no fixture contains a real volunteer name, event, location, form
      link, or Drive URL

## 2. Demo module

- [x] 2.1 Add `lib/demo.mjs` exporting `isDemoMode()`, truthy only for `DEMO_MODE`
      of `1` or `true`
- [x] 2.2 Add the production interlock: a `demoMisconfigured()` guard returning a
      `503` response when `DEMO_MODE` is truthy and `CONTEXT` is `production`
- [x] 2.3 Expose `listDemoTasks()` and `addDemoTask()` over a scratch file in the OS
      temp directory, so both functions see the same demo tasks
      — first built as a module-level array; that cannot work across two separate
      functions, found by driving the running dev server rather than by unit checks
- [x] 2.5 Support writes only where both functions share a temp directory, and have
      `addDemoTask` report whether it stored anything so the response can say which
      — the file store alone still failed on a deployed demo, where each function
      has its own container; caught in review, not by any test
- [x] 2.6 Write to a temporary path and rename into place, so a concurrent listing
      never reads a half-written file
- [x] 2.4 Log a warning naming `DEMO_MODE` on every demo-mode request

## 3. Wire into the functions

- [x] 3.1 In both functions, run the method check first, then the production
      interlock, then the demo branch, then `requirePassword`
- [x] 3.2 `tasks.mjs`: return the demo list with the same `200` shape
- [x] 3.3 `create-task.mjs`: keep `readJsonObject` and `validateTaskInput` ahead of
      the demo branch, then store in memory and return the real response shape with
      a demo `message`
- [x] 3.4 Confirm no Google client is constructed on either demo path

## 4. Configuration and docs

- [x] 4.1 Ship `.env.example` with `DEMO_MODE=1` and blank credentials, warning that
      it must never be set in Netlify production
- [x] 4.2 Add a no-credentials quick start to `README.md`, including that any
      password unlocks the demo
- [x] 4.3 Note in `DEPLOYMENT.md` that `DEMO_MODE` must not be set on the live site

## 5. Verify

- [x] 5.1 With `DEMO_MODE=1` and no other variables, confirm `GET /api/tasks`
      returns the fixtures with no password header
- [x] 5.2 Confirm a valid `POST /api/create-task` succeeds and the new task appears
      in the next listing — verified over HTTP against `netlify dev`, which is the
      only check that exercises the two functions as separate processes
- [x] 5.3 Confirm validation still rejects a `javascript:` form URL with `400` and an
      over-length task name with `400`
- [x] 5.4 Confirm a wrong method still returns `405` with the right `Allow` header
- [x] 5.5 With `DEMO_MODE=1` and `CONTEXT=production`, confirm both endpoints return
      `503` naming `DEMO_MODE`
- [x] 5.6 With `DEMO_MODE` unset, confirm the real path still returns `503` when
      `PORTAL_PASSWORD` is unset and `401` on a wrong password
- [ ] 5.7 Run `npm run dev` from a clean `.env.example` copy and confirm the portal
      loads in a browser after typing any password
      — 5.1-5.6 were verified by invoking both handlers directly across 18 cases;
      this last one needs a browser and the Netlify CLI
