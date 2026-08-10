const API_BASE_URL = '/api';
const PASSWORD_KEY = 'wds-portal-password';

// sessionStorage, not localStorage: the password is cleared when the tab closes.
function getPassword() {
  return sessionStorage.getItem(PASSWORD_KEY) || '';
}

function setPassword(value) {
  sessionStorage.setItem(PASSWORD_KEY, value);
}

function clearPassword() {
  sessionStorage.removeItem(PASSWORD_KEY);
}

function authHeaders(extra = {}) {
  return { ...extra, 'X-Portal-Password': getPassword() };
}

/** Sends the user back to the unlock screen, discarding the stored password. */
function lock(message) {
  clearPassword();
  showGate(message);
}

/**
 * Shows the unlock screen without discarding the password, for failures that are
 * not credential problems (portal unconfigured, sheet unreachable, offline).
 */
function showGate(message) {
  const gate = document.getElementById('gate');
  const portal = document.getElementById('portal');
  const gateError = document.getElementById('gateError');

  if (gate) gate.hidden = false;
  if (portal) portal.hidden = true;
  if (gateError) gateError.textContent = message || '';

  const input = document.getElementById('portalPassword');
  if (input) {
    input.value = '';
    input.focus();
  }
}

function unlock() {
  const gate = document.getElementById('gate');
  const portal = document.getElementById('portal');

  if (gate) gate.hidden = true;
  if (portal) portal.hidden = false;
}

document.addEventListener('DOMContentLoaded', () => {
  const gateForm = document.getElementById('gateForm');
  const taskForm = document.getElementById('taskForm');
  const statusBox = document.getElementById('statusBox');

  if (gateForm) {
    gateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('portalPassword');
      setPassword(input.value);
      // fetchTasks doubles as the credential check.
      showResult(await fetchTasks());
    });
  }

  if (getPassword()) {
    fetchTasks().then(showResult);
  } else {
    lock('');
  }

  /**
   * Both #gate and #portal start hidden, so every startup path must end by
   * showing one of them — otherwise a failure that is not a 401 leaves the
   * page blank with no way back except clearing session storage.
   */
  function showResult(result) {
    if (result === 'ok') {
      unlock();
    } else if (result === 'unauthorized') {
      // fetchTasks already re-locked with the reason.
    } else {
      // Not a credential problem, so the stored password survives the retry.
      showGate('Could not reach the portal. Check your connection and try again.');
    }
  }

  if (!taskForm) return;

  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');

    const payload = {
      taskName: document.getElementById('taskName').value.trim(),
      formUrl: document.getElementById('formUrl').value.trim(),
      eventDate: document.getElementById('eventDate').value.trim(),
      eventLocation: document.getElementById('eventLocation').value.trim(),
      eventOneLiner: document.getElementById('eventOneLiner').value.trim(),
    };

    submitBtn.disabled = true;
    submitBtn.innerText = 'Creating Drive Folder & Telegram Alert…';
    setStatus('', '');

    try {
      const response = await fetch(`${API_BASE_URL}/create-task`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        lock('Session expired. Enter the portal password again.');
        return;
      }

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        setStatus('success', `✅ ${result.message || 'Task created.'}`);
        taskForm.reset();
        fetchTasks();
      } else {
        setStatus('error', `❌ ${result.message || 'Failed to execute automation.'}`);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setStatus('error', '❌ Failed to connect to the server.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Create Task & Run Automations';
    }
  });

  function setStatus(kind, message) {
    if (!statusBox) return;
    statusBox.textContent = message;
    statusBox.className = kind ? `status-msg ${kind}` : 'status-msg';
  }
});

/** Resolves to 'ok', 'unauthorized', or 'unavailable'. */
async function fetchTasks() {
  const taskListContainer = document.getElementById('taskList');
  if (!taskListContainer) return 'unavailable';

  try {
    const response = await fetch(`${API_BASE_URL}/tasks`, { headers: authHeaders() });

    if (response.status === 401) {
      lock('Incorrect password.');
      return 'unauthorized';
    }

    const data = await response.json().catch(() => ({}));

    // 503 (portal not configured) and 502 (sheet unreachable) land here. Neither
    // is a credential problem, so the password is kept and the reason shown.
    if (!response.ok || data.status !== 'success') {
      taskListContainer.textContent = data.message || 'Error loading task database.';
      return response.ok ? 'ok' : 'unavailable';
    }

    if (!data.tasks.length) {
      taskListContainer.textContent = 'No tasks created yet.';
      return 'ok';
    }

    renderTasks(taskListContainer, data.tasks.slice().reverse());
    return 'ok';
  } catch (error) {
    console.error('Failed to load tasks:', error);
    taskListContainer.textContent = 'Error loading task database.';
    return 'unavailable';
  }
}

/**
 * Builds task cards with the DOM API rather than innerHTML, so no value coming
 * back from the spreadsheet can be interpreted as markup.
 */
function renderTasks(container, tasks) {
  container.textContent = '';

  for (const task of tasks) {
    const card = document.createElement('div');
    card.className = 'task-card';

    const info = document.createElement('div');
    info.className = 'task-info';

    const badge = document.createElement('span');
    badge.className = 'status-badge';
    badge.textContent = task.status || 'Pending';
    info.append(badge);

    const title = document.createElement('h4');
    title.textContent = task.taskName;
    info.append(title);

    addField(info, 'Date', task.eventDate);
    addField(info, 'Location', task.eventLocation);
    addField(info, 'About', task.eventOneLiner);

    if (task.driveUrl && /^https:\/\//i.test(task.driveUrl)) {
      const p = document.createElement('p');
      const link = document.createElement('a');
      link.href = task.driveUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = '📁 Open Drive Folder';
      p.append(link);
      info.append(p);
    }

    card.append(info);
    container.append(card);
  }
}

function addField(parent, label, value) {
  if (!value) return;
  const p = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = `${label}: `;
  p.append(strong, document.createTextNode(value));
  parent.append(p);
}
