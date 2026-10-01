import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { clearPassword, createTask, getPassword, getTasks, setPassword } from './api';
import TaskCard from './components/TaskCard';
import TaskCreatePage from './pages/TaskCreatePage';
import type { FormStatus, Task, TaskInput } from './types';

type View = 'checking' | 'locked' | 'portal';
type LoadTasksResult =
  | { kind: 'success' }
  | { kind: 'unauthorized'; message: string }
  | { kind: 'server-error'; message: string }
  | { kind: 'network-error'; message: string };

const emptyInput: TaskInput = {
  taskName: '',
  formUrl: '',
  eventDate: '',
  eventLocation: '',
  eventOneLiner: '',
};

export default function App() {
  return (
    <BrowserRouter>
      <PortalApp />
    </BrowserRouter>
  );
}

function PortalApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('checking');
  const [password, setPasswordInput] = useState('');
  const [gateError, setGateError] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [listMessage, setListMessage] = useState('Loading tasks…');
  const [input, setInput] = useState<TaskInput>(emptyInput);
  const [status, setStatus] = useState<FormStatus>(null);
  const [submitting, setSubmitting] = useState(false);

  const lock = useCallback((message: string) => {
    clearPassword();
    setPasswordInput('');
    setGateError(message);
    setView('locked');
  }, []);

  const showGateError = useCallback((message: string) => {
    setGateError(message);
    setView('locked');
  }, []);

  const loadTasks = useCallback(async (passwordOverride?: string): Promise<LoadTasksResult> => {
    setListMessage('Loading tasks…');
    try {
      const { response, data } = await getTasks(passwordOverride);
      if (response.status === 401) {
        setTasks([]);
        setListMessage('');
        return { kind: 'unauthorized', message: 'Incorrect password.' };
      }
      if (!response.ok || data?.status !== 'success') {
        const message = data?.message ?? 'Error loading task database.';
        setTasks([]);
        setListMessage(message);
        return { kind: 'server-error', message };
      }
      const newestFirst = [...(data.tasks ?? [])].reverse();
      setTasks(newestFirst);
      setListMessage(newestFirst.length ? '' : 'No tasks created yet.');
      return { kind: 'success' };
    } catch {
      const message = 'Could not reach the portal. Check your connection and try again.';
      setTasks([]);
      setListMessage(message);
      return { kind: 'network-error', message };
    }
  }, []);

  useEffect(() => {
    if (!getPassword()) {
      setView('locked');
      if (location.pathname !== '/unlock') {
        navigate('/unlock', { replace: true });
      }
      return;
    }

    void loadTasks(getPassword()).then((result) => {
      if (result.kind === 'success') {
        setView('portal');
        if (location.pathname === '/unlock') {
          navigate('/', { replace: true });
        }
      } else if (result.kind === 'unauthorized') {
        lock(result.message);
        navigate('/unlock', { replace: true });
      } else {
        showGateError(result.message);
        navigate('/unlock', { replace: true });
      }
    });
  }, [loadTasks, lock, location.pathname, navigate, showGateError]);

  async function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGateError('');
    const result = await loadTasks(password);
    if (result.kind === 'success') {
      setPassword(password);
      setView('portal');
      navigate('/', { replace: true });
    } else if (result.kind === 'unauthorized') {
      lock(result.message);
    } else {
      showGateError(result.message);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const { response, data } = await createTask({
        ...input,
        taskName: input.taskName.trim(),
        formUrl: input.formUrl.trim(),
        eventLocation: input.eventLocation.trim(),
        eventOneLiner: input.eventOneLiner.trim(),
      });

      if (response.status === 401) {
        lock('Session expired. Enter the portal password again.');
        navigate('/unlock', { replace: true });
        return;
      }

      if (response.ok && data?.status === 'success') {
        setStatus({ kind: 'success', message: `✅ ${data.message ?? 'Event created.'}` });
        setInput(emptyInput);
        const refreshResult = await loadTasks();
        if (refreshResult.kind === 'unauthorized') {
          lock('Session expired. Enter the portal password again.');
          navigate('/unlock', { replace: true });
        }
      } else {
        setStatus({ kind: 'error', message: `❌ ${data?.message ?? 'Failed to execute automation.'}` });
      }
    } catch {
      setStatus({ kind: 'error', message: '❌ Failed to connect to the server.' });
    } finally {
      setSubmitting(false);
    }
  }

  const update = (field: keyof TaskInput, value: string) => setInput((current) => ({ ...current, [field]: value }));

  return (
    <Routes>
      <Route
        path="/unlock"
        element={(
          <main className="mx-auto w-[min(100%-2rem,480px)] pt-[14vh] pb-[72px] max-[600px]:pt-[22px]">
            <section className="mb-5 rounded-[18px] border border-[#304537]/[.12] bg-white/[.94] p-7 shadow-[0_18px_50px_rgba(31,50,38,.07)] max-[600px]:rounded-[14px] max-[600px]:p-[22px]">
              <h1 className="mb-4 text-[1.7rem] leading-tight font-bold sm:text-[2rem]">WDS Operations Portal</h1>
              <p className="mb-5 text-sm leading-relaxed text-[#5c6961]"><strong>Local demo mode:</strong> enter any password to continue. It uses fictional data and does not call Google Sheets, Drive, or Telegram.</p>
              <form onSubmit={handleUnlock}>
                <label className="mb-[7px] block text-[.84rem] font-bold" htmlFor="portalPassword">Portal Password</label>
                <input
                  className="w-full rounded-[9px] border border-[#ced8d1] bg-[#fbfcfa] px-[13px] py-[11px] text-[#17201b] outline-none transition focus:border-[#517d3d] focus:shadow-[0_0_0_3px_rgba(81,125,61,.13)]"
                  autoFocus
                  autoComplete="current-password"
                  id="portalPassword"
                  onChange={(event) => setPasswordInput(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
                <button className="mt-[22px] w-full rounded-[9px] bg-[#295b43] px-[18px] py-[13px] font-bold text-white transition hover:-translate-y-px hover:bg-[#183d2e] disabled:cursor-wait disabled:bg-[#94a49a]" type="submit">Unlock</button>
                <p aria-live="polite" className="mt-3 min-h-[1.2em] text-sm text-[#a43b32]">{gateError}</p>
              </form>
            </section>
          </main>
        )}
      />

      <Route
        path="/"
        element={
          view === 'portal' ? (
            <main className="mx-auto w-[min(100%-2rem,760px)] py-12 pb-[72px] max-[600px]:pt-[22px]">
              <section className="relative mb-5 overflow-hidden rounded-[18px] bg-[#183d2e] p-[38px] text-[#f7fbf5] max-[600px]:rounded-[14px] max-[600px]:p-[22px]">
                <span aria-hidden="true" className="absolute -top-[105px] -right-[105px] size-[340px] rounded-full border-[55px] border-[#d9ee76] opacity-90 max-[600px]:opacity-35" />
                <p className="relative z-10 mb-[10px] text-[.76rem] font-bold tracking-[.13em] text-[#d9ee76] uppercase">Women Devs SG · Operations</p>
                <h1 className="relative z-10 max-w-[560px] text-[1.7rem] leading-[1.1] font-bold sm:text-[2.65rem]">Turn an event idea into an organised project.</h1>
                <p className="relative z-10 mt-[14px] max-w-[520px] leading-relaxed text-[#c8d8cf]">Create an event once, then let the portal prepare its workspace and notify the team.</p>
              </section>

              <section className="mb-5 rounded-[18px] border border-[#304537]/[.12] bg-white/[.94] p-7 shadow-[0_18px_50px_rgba(31,50,38,.07)] max-[600px]:rounded-[14px] max-[600px]:p-[22px]">
                <div className="mb-6 flex items-center justify-between gap-4 max-[480px]:items-start">
                  <div><p className="mb-[3px] text-[.76rem] font-bold tracking-[.13em] text-[#6c8f31] uppercase">01</p><h2 className="text-[1.35rem] font-bold">Event setup</h2></div>
                  <button className="mt-0 w-auto shrink-0 rounded-[9px] bg-[#295b43] px-4 py-3 font-bold text-white transition hover:bg-[#183d2e]" onClick={() => navigate('/create-task')} type="button">Create an event</button>
                </div>
                <p className="text-sm leading-relaxed text-[#5c6961]">Demo mode is available locally for testing without real integrations.</p>
              </section>

              <section className="mb-5 rounded-[18px] border border-[#304537]/[.12] bg-white/[.94] p-7 shadow-[0_18px_50px_rgba(31,50,38,.07)] max-[600px]:rounded-[14px] max-[600px]:p-[22px]">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div><p className="mb-[3px] text-[.76rem] font-bold tracking-[.13em] text-[#6c8f31] uppercase">02</p><h2 className="text-[1.35rem] font-bold">Events</h2></div>
                  <span className="rounded-full bg-[#edf4e6] px-[10px] py-1.5 text-xs font-bold text-[#4d682d]">{tasks.length} total</span>
                </div>
                {listMessage && <p className="rounded-xl border border-dashed border-[#c8d4cc] p-7 text-center text-[#718078]">{listMessage}</p>}
                <div className="grid gap-3">
                  {tasks.map((task) => <TaskCard key={task.taskId || `${task.taskName}-${task.createdAt}`} task={task} />)}
                </div>
              </section>
            </main>
          ) : view === 'checking' ? (
            <main className="mx-auto w-[min(100%-2rem,480px)] pt-[14vh] pb-[72px] max-[600px]:pt-[22px]">
              <section className="rounded-[18px] border border-[#304537]/[.12] bg-white/[.94] p-7 shadow-[0_18px_50px_rgba(31,50,38,.07)] max-[600px]:rounded-[14px] max-[600px]:p-[22px]">
                <h1 className="mb-4 text-[1.7rem] leading-tight font-bold sm:text-[2rem]">WDS Operations Portal</h1>
                <p className="text-sm text-[#5c6961]">Checking your session…</p>
              </section>
            </main>
          ) : (
            <Navigate to="/unlock" replace />
          )
        }
      />

      <Route
        path="/create-task"
        element={
          view === 'portal' ? (
            <TaskCreatePage
              demoModeNote="Demo mode is for local-only testing and does not call Google Sheets, Drive, or Telegram."
              input={input}
              onBack={() => navigate('/')}
              onChange={update}
              onSubmit={handleSubmit}
              status={status}
              submitting={submitting}
            />
          ) : (
            <Navigate to="/unlock" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
