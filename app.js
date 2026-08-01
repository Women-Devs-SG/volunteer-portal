// Base API Endpoint URL (Local Express Server)
const API_BASE_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
  const taskForm = document.getElementById('taskForm');
  
  // Load initial tasks on page startup
  fetchTasks();

  // Handle Form Submission
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const taskNameInput = document.getElementById('taskName');
    const formUrlInput = document.getElementById('formUrl');

    const payload = {
      taskName: taskNameInput.value.trim(),
      formUrl: formUrlInput.value.trim(),
    };

    // UI Feedback: Loading state
    submitBtn.disabled = true;
    submitBtn.innerText = 'Creating Drive Folder & Telegram Alert...';

    try {
      const response = await fetch(`${API_BASE_URL}/create-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        alert(`✅ Success! Task created. Drive Folder ID: ${result.taskId}`);
        taskForm.reset();
        fetchTasks(); // Refresh dashboard list
      } else {
        alert(`❌ Error: ${result.message || 'Failed to execute automation.'}`);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      alert('❌ Failed to connect to server backend.');
    } finally {
      // Reset UI state
      submitBtn.disabled = false;
      submitBtn.innerText = 'Create Task & Run Automations';
    }
  });
});

// Fetch all existing task records from GSheet database
async function fetchTasks() {
  const taskListContainer = document.getElementById('taskList');

  try {
    const response = await fetch(`${API_BASE_URL}/tasks`);
    const data = await response.json();

    if (data.status === 'success' && data.tasks.length > 0) {
      // Render task cards in reverse chronological order (newest top)
      taskListContainer.innerHTML = data.tasks.reverse().map(task => `
        <div class="task-card">
          <div class="task-info">
            <span class="status-badge">${task.status || 'Pending'}</span>
            <h4>${escapeHtml(task.taskName)}</h4>
            <a href="${task.driveUrl}" target="_blank" rel="noopener noreferrer">📁 Open Drive Folder</a>
          </div>
          ${task.qrUrl ? `
            <div class="qr-thumb">
              <a href="${task.qrUrl}" target="_blank">
                <img src="${task.qrUrl}" alt="Form QR Code" title="Click to open full QR" />
              </a>
            </div>
          ` : ''}
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

// Utility function to prevent XSS script injections
function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}