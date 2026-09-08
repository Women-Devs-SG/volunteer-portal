// Demo mode: serves fictional tasks so the portal runs with no credentials.
//
// Nothing here ever touches Google or Telegram. The point is that a contributor
// who has just cloned a public repository can see the portal work, and that the
// team can demo it without a real event or volunteer name on screen.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import fixtures from '../fixtures/tasks.demo.json' with { type: 'json' };
import { json } from './http.mjs';

const TRUTHY = new Set(['1', 'true']);

function isRequested() {
  return TRUTHY.has(String(process.env.DEMO_MODE ?? '').trim().toLowerCase());
}

/**
 * Deploy context, set by Netlify on every invocation ("production",
 * "deploy-preview", "branch-deploy", "dev"). A local dev server may set nothing,
 * which is not production and so allows demo mode.
 */
function isProduction() {
  return process.env.CONTEXT === 'production';
}

/**
 * Resolves demo mode for one request.
 *
 * Returns `{ active, refusal }`. Callers return `refusal` when it is set, then
 * take the demo path when `active`. The two are deliberately separate fields on
 * one result: forgetting `refusal` leaves `active` false in production, so the
 * request falls through to the real, password-protected path rather than serving
 * fixtures to volunteers.
 */
export function demoStatus() {
  if (!isRequested()) return { active: false, refusal: null };

  if (isProduction()) {
    // DEMO_MODE has no legitimate use in production, so treat it the way
    // lib/auth.mjs treats a missing password: stop, do not guess.
    console.error('DEMO_MODE is set in the production context; refusing all requests.');
    return {
      active: false,
      refusal: json(503, {
        status: 'error',
        message: 'Portal is misconfigured (DEMO_MODE). Contact an administrator.',
      }),
    };
  }

  // Logged on every demo request: a maintainer who leaves DEMO_MODE=1 in .env
  // beside real credentials should not have to wonder why the data looks odd.
  console.warn('DEMO_MODE is on — serving fixtures, no Google or Telegram calls.');

  return { active: true, refusal: null };
}

// Demo writes go to a scratch file, not memory. `create-task` and `tasks` are
// separate functions — two separate lambdas in production, and separate
// invocations under `netlify dev` — so a module-level array in one is invisible
// to the other. A file in the OS temp directory is the simplest thing both can
// see. Delete it to reset the demo.
const STORE = join(tmpdir(), 'wds-portal-demo-tasks.json');

/** Never throws: a missing or corrupt scratch file just means "no extra tasks". */
function readAdded() {
  try {
    if (!existsSync(STORE)) return [];
    const parsed = JSON.parse(readFileSync(STORE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('DEMO_MODE: ignoring unreadable demo store:', error.message);
    return [];
  }
}

/** The committed fixtures first, then anything created since, oldest to newest. */
export function listDemoTasks() {
  return [...fixtures.map((task) => ({ ...task })), ...readAdded()];
}

export function addDemoTask(task) {
  const added = readAdded();
  added.push({ ...task });

  try {
    writeFileSync(STORE, JSON.stringify(added, null, 2), 'utf8');
  } catch (error) {
    // A read-only filesystem should not fail the request; the task is simply
    // not listed afterwards, and the response already said it was demo-only.
    console.warn('DEMO_MODE: could not persist demo task:', error.message);
  }
}

/** Exposed so the docs and a maintainer can find the file to delete. */
export function demoStorePath() {
  return STORE;
}

/** Visibly fake, so a demo screenshot can never be mistaken for a real folder. */
export function demoDriveUrl(taskId) {
  return `https://drive.google.com/drive/folders/DEMO_${taskId}`;
}
