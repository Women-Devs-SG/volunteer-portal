import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { clearPassword, createTask, getPassword, getTasks, setPassword } from './api';
import type { Task, TaskInput } from './types';

type View = 'checking' | 'locked' | 'portal';
type Status = { kind: 'success' | 'error'; message: string } | null;
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
  const [view, setView] = useState<View>('checking');
  const [password, setPasswordInput] = useState('');
  const [gateError, setGateError] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [listMessage, setListMessage] = useState('Loading tasks…');
  const [input, setInput] = useState<TaskInput>(emptyInput);
  const [status, setStatus] = useState<Status>(null);
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
      return;
    }
    void loadTasks(getPassword()).then((result) => {
      if (result.kind === 'success') {
        setView('portal');
      } else if (result.kind === 'unauthorized') {
        lock(result.message);
      } else {
        showGateError(result.message);
      }
    });
  }, [loadTasks, lock, showGateError]);

  async function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGateError('');
    const result = await loadTasks(password);
    if (result.kind === 'success') {
      setPassword(password);
      setView('portal');
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
        return;
      }
      if (response.ok && data?.status === 'success') {
        setStatus({ kind: 'success', message: `✅ ${data.message ?? 'Task created.'}` });
        setInput(emptyInput);
        const refreshResult = await loadTasks();
        if (refreshResult.kind === 'unauthorized') {
          lock('Session expired. Enter the portal password again.');
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

  if (view !== 'portal') {
    return (
      <main className="container gate-container">
        <section className="card">
          <h1>🔒 WDS Operations Portal</h1>
          {view === 'checking' ? <p>Checking your session…</p> : (
            <form onSubmit={handleUnlock}>
              <label htmlFor="portalPassword">Portal Password</label>
              <input
                autoFocus
                autoComplete="current-password"
                id="portalPassword"
                onChange={(event) => setPasswordInput(event.target.value)}
                required
                type="password"
                value={password}
              />
              <button type="submit">Unlock</button>
              <p aria-live="polite" className="gate-error">{gateError}</p>
            </form>
          )}
        </section>
      </main>
    );
  }

  const update = (field: keyof TaskInput, value: string) => setInput((current) => ({ ...current, [field]: value }));

  return (
    <main className="container">
      <section className="card hero-card">
        <p className="eyebrow">Women Devs SG · Operations</p>
        <h1>Turn an event idea into an organised project.</h1>
        <p className="intro">Create the task once, then let the portal prepare its workspace and notify the team.</p>
      </section>

      <section className="card">
        <div className="section-heading">
          <div><p className="step">01</p><h2>Create a task</h2></div>
          <span className="automation-note">Drive + Telegram automation</span>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="taskName">Task / Project Name <span>*</span></label>
              <input id="taskName" maxLength={120} onChange={(e) => update('taskName', e.target.value)} placeholder="e.g. MedCamp 2026 Marketing" required value={input.taskName} />
            </div>
            <div className="form-group">
              <label htmlFor="eventDate">Event Date</label>
              <input id="eventDate" onChange={(e) => update('eventDate', e.target.value)} type="date" value={input.eventDate} />
            </div>
            <div className="form-group">
              <label htmlFor="eventLocation">Event Location</label>
              <input id="eventLocation" maxLength={120} onChange={(e) => update('eventLocation', e.target.value)} placeholder="e.g. Singapore" value={input.eventLocation} />
            </div>
            <div className="form-group full-width">
              <label htmlFor="eventOneLiner">One-line Event Description</label>
              <input id="eventOneLiner" maxLength={280} onChange={(e) => update('eventOneLiner', e.target.value)} placeholder="e.g. A community-led volunteering meetup" value={input.eventOneLiner} />
            </div>
            <div className="form-group full-width">
              <label htmlFor="formUrl">Google Form Link <small>Optional</small></label>
              <input id="formUrl" maxLength={500} onChange={(e) => update('formUrl', e.target.value)} placeholder="https://forms.google.com/…" type="url" value={input.formUrl} />
            </div>
          </div>
          <button disabled={submitting} type="submit">{submitting ? 'Creating Drive Folder & Telegram Alert…' : 'Create Task & Run Automations →'}</button>
          <p aria-live="polite" className={status ? `status-msg ${status.kind}` : 'status-msg'}>{status?.message}</p>
        </form>
      </section>

      <section className="card">
        <div className="section-heading"><div><p className="step">02</p><h2>Active tasks</h2></div><span className="task-count">{tasks.length} total</span></div>
        {listMessage && <p className="empty-state">{listMessage}</p>}
        <div className="task-list">
          {tasks.map((task) => <TaskCard key={task.taskId || `${task.taskName}-${task.createdAt}`} task={task} />)}
        </div>
      </section>
    </main>
  );
}

function TaskCard({ task }: { task: Task }) {
  const driveUrl = /^https:\/\//i.test(task.driveUrl) ? task.driveUrl : null;
  return (
    <article className="task-card">
      <div className="task-card-header"><span className="status-badge">{task.status || 'Pending'}</span><span className="task-id">{task.taskId}</span></div>
      <h3>{task.taskName}</h3>
      <div className="task-meta">
        {task.eventDate && <p><strong>Date</strong>{task.eventDate}</p>}
        {task.eventLocation && <p><strong>Location</strong>{task.eventLocation}</p>}
        {task.eventOneLiner && <p className="full-width"><strong>About</strong>{task.eventOneLiner}</p>}
      </div>
      {driveUrl && <a className="drive-link" href={driveUrl} rel="noopener noreferrer" target="_blank">Open Drive Folder ↗</a>}
    </article>
  );
}
