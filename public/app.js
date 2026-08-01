// Base API Endpoint URL (Local Express Server)
const API_BASE_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
  const taskForm = document.getElementById('taskForm');

  if (!taskForm) return;

  fetchTasks();

  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const taskNameInput = document.getElementById('taskName');
    const formUrlInput = document.getElementById('formUrl');
    const eventDateInput = document.getElementById('eventDate');
    const eventLocationInput = document.getElementById('eventLocation');
    const eventOneLinerInput = document.getElementById('eventOneLiner');

    const payload = {
      taskName: taskNameInput.value.trim(),
      formUrl: formUrlInput.value.trim(),
      eventDate: eventDateInput.value.trim(),
      eventLocation: eventLocationInput.value.trim(),
      eventOneLiner: eventOneLinerInput.value.trim(),
    };

    submitBtn.disabled = true;
    submitBtn.innerText = 'Creating Drive Folder & Telegram Alert...';

    try {
      const response = await fetch(`${API_BASE_URL}/create-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        alert(`✅ Success! Task created. ${result.message || ''}`);
        taskForm.reset();
        fetchTasks();
      } else {
        alert(`❌ Error: ${result.message || 'Failed to execute automation.'}`);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      alert('❌ Failed to connect to server backend.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Create Task & Run Automations';
    }
  });
});

async function fetchTasks() {
  const taskListContainer = document.getElementById('taskList');

  if (!taskListContainer) return;

  try {
    const response = await fetch(`${API_BASE_URL}/tasks`);
    const data = await response.json();

    if (data.status === 'success' && data.tasks.length > 0) {
      taskListContainer.innerHTML = data.tasks.reverse().map(task => `
        <div class="task-card">
          <div class="task-info">
            <span class="status-badge">${task.status || 'Pending'}</span>
            <h4>${escapeHtml(task.taskName)}</h4>
            ${task.eventDate ? `<p><strong>Date:</strong> ${escapeHtml(task.eventDate)}</p>` : ''}
            ${task.eventLocation ? `<p><strong>Location:</strong> ${escapeHtml(task.eventLocation)}</p>` : ''}
            ${task.eventOneLiner ? `<p><strong>About:</strong> ${escapeHtml(task.eventOneLiner)}</p>` : ''}
            ${task.driveUrl ? `<p><strong>Drive:</strong> ${escapeHtml(task.driveUrl)}</p>` : ''}
          </div>
        </div>
      `).join('');
    } else {
      taskListContainer.innerHTML = '<p>No tasks created yet.</p>';
    }
  } catch (error) {
    console.error('Failed to load tasks:', error);
    taskListContainer.innerHTML = '<p style="color:red;">Error loading task database.</p>';
  }
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[tag] || tag));
}
