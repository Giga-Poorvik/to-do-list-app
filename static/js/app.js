/**
 * Smart To-Do Manager — Client-Side Application Logic
 *
 * Communicates with a Flask REST API and drives three dashboard columns:
 *   • To Do   – pending tasks, sortable by priority or due date
 *   • Done    – completed tasks
 *   • Streak  – GitHub-style contribution grid + statistics
 */

// ---------------------------------------------------------------------------
// 1. State Management
// ---------------------------------------------------------------------------

/** Master list of all task objects returned from the API. */
let allTasks = [];

/** Current sort mode for the To-Do column: 'priority' | 'date'. */
let currentSort = 'priority';

/** Handle returned by the search debounce timer. */
let searchTimer = null;

// ---------------------------------------------------------------------------
// 2. DOM References (cached once on DOMContentLoaded)
// ---------------------------------------------------------------------------

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ---------------------------------------------------------------------------
// 3. API Helpers
// ---------------------------------------------------------------------------

/**
 * Generic fetch wrapper that returns parsed JSON.
 * Throws on non-OK responses so callers can catch uniformly.
 */
async function api(endpoint, options = {}) {
  const res = await fetch(endpoint, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${options.method || 'GET'} ${endpoint} → ${res.status}`);
  // DELETE may return 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

/** Fetch all tasks from the server and re-render the UI. */
async function fetchTasks() {
  try {
    allTasks = await api('/api/tasks');
    renderTasks();
    renderStreakGrid();
    updateStreakStats();
  } catch (err) {
    console.error('Failed to fetch tasks:', err);
  }
}

/** Create a new task via POST. */
async function createTask(data) {
  try {
    await api('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await fetchTasks();
  } catch (err) {
    console.error('Failed to create task:', err);
  }
}

/** Update an existing task via PUT. */
async function updateTask(id, data) {
  try {
    await api(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    await fetchTasks();
  } catch (err) {
    console.error('Failed to update task:', err);
  }
}

/** Delete a task via DELETE. */
async function deleteTask(id) {
  try {
    await api(`/api/tasks/${id}`, { method: 'DELETE' });
    await fetchTasks();
  } catch (err) {
    console.error('Failed to delete task:', err);
  }
}

// ---------------------------------------------------------------------------
// 4. Rendering
// ---------------------------------------------------------------------------

/**
 * Main render pipeline:
 *   1. Partition allTasks into pending / completed.
 *   2. Filter by search query (client-side).
 *   3. Sort pending tasks by the active sort mode.
 *   4. Build DOM cards and inject into the two list containers.
 *   5. Update counts.
 */
function renderTasks() {
  const searchQuery = ($('#search-input')?.value || '').trim().toLowerCase();

  // Partition
  let pending = allTasks.filter((t) => !t.completed);
  let completed = allTasks.filter((t) => t.completed);

  // Client-side search filter (by title, case-insensitive)
  if (searchQuery) {
    pending = pending.filter((t) => t.title.toLowerCase().includes(searchQuery));
    completed = completed.filter((t) => t.title.toLowerCase().includes(searchQuery));
  }

  // Sort pending tasks
  pending = sortTasks(pending, currentSort);

  // Render To-Do column
  const todoList = $('#todo-list');
  todoList.innerHTML = '';
  if (pending.length === 0) {
    todoList.innerHTML =
      "<div class='empty-state'>📋<br>No tasks yet.<br>Click + to add your first task!</div>";
  } else {
    pending.forEach((task, i) => {
      const card = createTaskCard(task);
      // Stagger animation: slight delay per card
      card.style.animationDelay = `${i * 60}ms`;
      card.classList.add('animate-in');
      todoList.appendChild(card);
    });
  }

  // Render Completed column
  const completedList = $('#completed-list');
  completedList.innerHTML = '';
  if (completed.length === 0) {
    completedList.innerHTML =
      "<div class='empty-state'>🎯<br>Complete a task to see it here!</div>";
  } else {
    completed.forEach((task, i) => {
      const card = createTaskCard(task);
      card.style.animationDelay = `${i * 60}ms`;
      card.classList.add('animate-in');
      completedList.appendChild(card);
    });
  }

  // Update counts
  $('#todo-count').textContent = pending.length;
  $('#completed-count').textContent = completed.length;
  
  const pendingStat = $('#total-pending');
  if (pendingStat) pendingStat.textContent = pending.length;
}

/**
 * Sort an array of tasks in place (returns a new sorted copy).
 * @param {'priority'|'date'} mode
 */
function sortTasks(tasks, mode) {
  const priorityWeight = { high: 0, medium: 1, low: 2 };
  const sorted = [...tasks];

  if (mode === 'priority') {
    sorted.sort((a, b) => (priorityWeight[a.priority] ?? 1) - (priorityWeight[b.priority] ?? 1));
  } else {
    // Sort by due_date ascending (earliest first)
    sorted.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  }
  return sorted;
}

/**
 * Build a single task-card DOM element.
 *
 * Status classes applied to the outer div:
 *   • completed – task is done
 *   • overdue   – past due and not completed
 *   • nearing   – due within 2 days and not completed
 *   • normal    – everything else
 */
function createTaskCard(task) {
  const card = document.createElement('div');

  // --- Determine status class ---
  let status = 'normal';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (task.completed) {
    status = 'completed';
  } else {
    const due = new Date(task.due_date);
    due.setHours(0, 0, 0, 0);
    const diffDays = (due - today) / (1000 * 60 * 60 * 24);

    if (diffDays < 0) {
      status = 'overdue';
    } else if (diffDays <= 2) {
      status = 'nearing';
    }
  }

  card.className = `task-card ${status}`;

  // --- Calculate deadline and progress ---
  const deadlineStr = task.due_date + 'T' + (task.due_time || '23:59') + ':00';
  const deadline = new Date(deadlineStr);
  const created = new Date(task.created_date + 'T00:00:00');
  const now = new Date();
  const totalMs = deadline - created;
  const elapsedMs = now - created;
  let progress = totalMs > 0 ? Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100))) : 100;
  if (task.completed) progress = 100;

  // Countdown display
  let countdownHTML;
  if (task.completed) {
    countdownHTML = `
      <span class="countdown-value completed-text">DONE ✓</span>
      <span class="countdown-label">COMPLETED</span>`;
  } else {
    countdownHTML = `
      <span class="countdown-value" data-deadline="${deadlineStr}">--:--:--</span>
      <span class="countdown-label">REMAINING</span>`;
  }

  const isOverdueProgress = !task.completed && progress >= 100;

  // --- Inner HTML with two-column layout ---
  card.innerHTML = `
    <div class="task-card-body">
      <div class="task-card-left">
        <div class="task-header">
          <div style="display:flex;align-items:center;gap:10px">
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            <span class="task-title">${escapeHTML(task.title)}</span>
          </div>
          <div class="task-actions">
            <button class="action-btn edit-btn" title="Edit">✏️</button>
            <button class="action-btn delete-btn" title="Delete">🗑️</button>
          </div>
        </div>
        <p class="task-description">${escapeHTML(task.description)}</p>
        <div class="task-meta">
          <span class="priority-badge priority-${task.priority}">${task.priority.toUpperCase()}</span>
          <span class="due-date">📅 ${formatDate(task.due_date)}${task.due_time ? ' ' + formatTime(task.due_time) : ''}</span>
        </div>
      </div>
      <div class="task-card-right">
        <div class="countdown-timer">
          ${countdownHTML}
        </div>
        <div class="progress-wrapper">
          <div class="progress-bar-track">
            <div class="progress-bar-fill ${isOverdueProgress ? 'overdue-fill' : ''}" style="width: ${progress}%">
              <span class="progress-diamond">✦</span>
            </div>
          </div>
          <span class="progress-text">Progress: ${progress}% Complete</span>
        </div>
      </div>
    </div>
  `;

  // --- Event listeners ---

  // Toggle completed
  card.querySelector('.task-checkbox').addEventListener('change', () => {
    const nowCompleted = !task.completed;
    const updates = { completed: nowCompleted };
    if (nowCompleted) {
      updates.completed_date = todayISO();
    } else {
      updates.completed_date = null;
    }
    updateTask(task.id, updates);
  });

  // Edit
  card.querySelector('.edit-btn').addEventListener('click', () => openEditModal(task));

  // Delete (with confirmation)
  card.querySelector('.delete-btn').addEventListener('click', () => {
    if (confirm(`Delete "${task.title}"?`)) {
      deleteTask(task.id);
    }
  });

  return card;
}

// ---------------------------------------------------------------------------
// 5. Modals
// ---------------------------------------------------------------------------

/** Show the Add Task modal and reset the form. */
function openAddModal() {
  const modal = $('#task-modal');
  $('#task-form').reset();
  // Default the due-date picker to today
  $('#task-due-date').value = todayISO();
  modal.removeAttribute('hidden');
  modal.classList.add('active');
}

/** Close a modal by removing the 'active' class. */
function closeModal(modal) {
  modal.classList.remove('active');
  modal.setAttribute('hidden', '');
}

/** Open the Edit modal pre-filled with the given task's data. */
function openEditModal(task) {
  const modal = $('#edit-modal');
  $('#edit-task-id').value = task.id;
  $('#edit-task-title').value = task.title;
  $('#edit-task-description').value = task.description;
  $('#edit-task-priority').value = task.priority;
  $('#edit-task-due-date').value = task.due_date;
  $('#edit-task-due-time').value = task.due_time || '';
  modal.removeAttribute('hidden');
  modal.classList.add('active');
}

// ---------------------------------------------------------------------------
// 6. Search (debounced client-side filtering)
// ---------------------------------------------------------------------------

function handleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    renderTasks();
  }, 200);
}

// ---------------------------------------------------------------------------
// 7. Sorting
// ---------------------------------------------------------------------------

/** Switch the sort mode and update the active button styling. */
function setSort(mode) {
  currentSort = mode;

  // Toggle active class on sort buttons
  $('#sort-priority-btn').classList.toggle('active', mode === 'priority');
  $('#sort-date-btn').classList.toggle('active', mode === 'date');

  renderTasks();
}

// ---------------------------------------------------------------------------
// 8. Streak Grid (GitHub-style contribution graph)
// ---------------------------------------------------------------------------

/**
 * Build a 7-row × ~26-column grid covering the last 26 weeks.
 * Each cell represents one day; colour intensity reflects the number
 * of tasks completed on that day.
 */
function renderStreakGrid() {
  const grid = $('#streak-grid');
  const monthLabels = $('#month-labels');
  if (!grid || !monthLabels) return;

  grid.innerHTML = '';
  monthLabels.innerHTML = '';

  // ---- Build completion count map ----
  const countMap = {};
  allTasks
    .filter((t) => t.completed && t.completed_date)
    .forEach((t) => {
      const d = t.completed_date; // "YYYY-MM-DD"
      countMap[d] = (countMap[d] || 0) + 1;
    });

  // ---- Determine date range: last 26 full weeks ending on the current week's Saturday ----
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // End on the last day of the current week (Sunday = 0 in JS, we use Mon-Sun layout)
  // We'll end on today and compute 26*7 days back
  const totalDays = 26 * 7;

  // Start date: go back so the grid fills 26 complete columns.
  // Each column = 1 week (Mon index 0 … Sun index 6).
  // Find the Monday on or before (today - totalDays + 1)
  const rawStart = new Date(today);
  rawStart.setDate(rawStart.getDate() - totalDays + 1);
  // Adjust to previous Monday (getDay(): 0=Sun,1=Mon…6=Sat)
  const dayOfWeek = rawStart.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startDate = new Date(rawStart);
  startDate.setDate(startDate.getDate() + mondayOffset);

  // Build flat day list from startDate up to today
  const days = [];
  const cursor = new Date(startDate);
  while (cursor <= today) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  // Organize into weeks (columns)
  // Row index = (day-of-week starting Monday) 0-6
  const weeks = [];
  days.forEach((d) => {
    const weekIdx = Math.floor((d - startDate) / (7 * 24 * 60 * 60 * 1000));
    if (!weeks[weekIdx]) weeks[weekIdx] = [];
    weeks[weekIdx].push(d);
  });

  // ---- Render cells ----
  // CSS Grid: 7 rows, auto columns (each week is a column)
  grid.style.gridTemplateRows = 'repeat(7, 1fr)';
  grid.style.gridTemplateColumns = `repeat(${weeks.length}, 1fr)`;

  weeks.forEach((week, colIdx) => {
    week.forEach((day) => {
      const iso = toISO(day);
      const count = countMap[iso] || 0;
      const level = count >= 4 ? 4 : count; // 0-4

      const cell = document.createElement('div');
      cell.className = `streak-cell level-${level}`;
      cell.title = `${count} task${count !== 1 ? 's' : ''} completed on ${iso}`;

      // Position in CSS grid: row = day-of-week (Mon=1), col = week index+1
      const row = ((day.getDay() + 6) % 7) + 1; // Mon=1 … Sun=7
      cell.style.gridRow = row;
      cell.style.gridColumn = colIdx + 1;

      grid.appendChild(cell);
    });
  });

  // ---- Month labels ----
  // Place a label at the first week that starts a new month
  const labeledMonths = new Set();
  weeks.forEach((week, colIdx) => {
    const firstDay = week[0];
    const monthKey = `${firstDay.getFullYear()}-${firstDay.getMonth()}`;
    if (!labeledMonths.has(monthKey)) {
      labeledMonths.add(monthKey);
      const label = document.createElement('span');
      label.textContent = firstDay.toLocaleDateString('en-US', { month: 'short' });
      // Align label to the column
      label.style.gridColumn = colIdx + 1;
      monthLabels.appendChild(label);
    }
  });

  // Match month-labels grid columns to streak-grid
  monthLabels.style.display = 'grid';
  monthLabels.style.gridTemplateColumns = `repeat(${weeks.length}, 1fr)`;
}

// ---------------------------------------------------------------------------
// 9. Streak Statistics
// ---------------------------------------------------------------------------

function updateStreakStats() {
  const completed = allTasks.filter((t) => t.completed && t.completed_date);

  // Total completed
  const totalEl = $('#total-completed');
  if (totalEl) totalEl.textContent = completed.length;

  // Build sorted set of unique completion dates
  const dateSet = new Set(completed.map((t) => t.completed_date));
  const sortedDates = [...dateSet].sort(); // ascending ISO strings sort correctly

  if (sortedDates.length === 0) {
    if ($('#current-streak')) $('#current-streak').textContent = 0;
    if ($('#longest-streak')) $('#longest-streak').textContent = 0;
    return;
  }

  // Convert to day-index (days since epoch) for easy consecutive check
  const toDayIndex = (iso) => Math.floor(new Date(iso).getTime() / (1000 * 60 * 60 * 24));
  const dayIndices = sortedDates.map(toDayIndex);

  // Longest streak
  let longest = 1;
  let run = 1;
  for (let i = 1; i < dayIndices.length; i++) {
    if (dayIndices[i] === dayIndices[i - 1] + 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // Current streak: must include today or yesterday
  const todayIdx = toDayIndex(todayISO());
  let current = 0;
  const lastIdx = dayIndices[dayIndices.length - 1];
  if (lastIdx === todayIdx || lastIdx === todayIdx - 1) {
    current = 1;
    for (let i = dayIndices.length - 2; i >= 0; i--) {
      if (dayIndices[i + 1] - dayIndices[i] === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  if ($('#current-streak')) $('#current-streak').textContent = current;
  if ($('#longest-streak')) $('#longest-streak').textContent = longest;
}

// ---------------------------------------------------------------------------
// 10. Utility Functions
// ---------------------------------------------------------------------------

/** Format a YYYY-MM-DD string into a human-friendly form like "Jul 15, 2026". */
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00'); // force local timezone parse
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Return today's date as an ISO YYYY-MM-DD string. */
function todayISO() {
  return toISO(new Date());
}

/** Convert a Date object to YYYY-MM-DD. */
function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Basic HTML escaping to prevent XSS when injecting user text. */
function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** Format a time string like '14:30' to '2:30 PM'. */
function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ---------------------------------------------------------------------------
// 12. Live Countdown Timer
// ---------------------------------------------------------------------------

/** Update all visible countdown timers every second. */
function startCountdownTimers() {
  setInterval(() => {
    document.querySelectorAll('.countdown-value[data-deadline]').forEach((el) => {
      const deadline = new Date(el.dataset.deadline);
      const now = new Date();
      const diff = deadline - now;

      if (diff <= 0) {
        el.textContent = '00:00:00';
        el.classList.add('overdue-text');
        const label = el.nextElementSibling;
        if (label) label.textContent = 'OVERDUE';
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        el.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
    });
  }, 1000);
}

// ---------------------------------------------------------------------------
// 11. Initialization
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // ---- Fetch initial data ----
  fetchTasks();

  // ---- Add Task button ----
  $('#add-task-btn').addEventListener('click', openAddModal);

  // ---- Add Task form submission ----
  $('#task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      title: $('#task-title').value.trim(),
      description: $('#task-description').value.trim(),
      priority: $('#task-priority').value,
      due_date: $('#task-due-date').value,
      due_time: $('#task-due-time').value || '',
    };
    if (!data.title) return;
    await createTask(data);
    closeModal($('#task-modal'));
  });

  // ---- Edit Task form submission ----
  $('#edit-task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#edit-task-id').value;
    const data = {
      title: $('#edit-task-title').value.trim(),
      description: $('#edit-task-description').value.trim(),
      priority: $('#edit-task-priority').value,
      due_date: $('#edit-task-due-date').value,
      due_time: $('#edit-task-due-time').value || '',
    };
    if (!data.title) return;
    await updateTask(id, data);
    closeModal($('#edit-modal'));
  });

  // ---- Modal close buttons ----
  $$('.modal-close').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) closeModal(modal);
    });
  });

  // ---- Click on overlay to close ----
  $$('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      // Only close if the click is directly on the overlay, not its children
      const modal = overlay.closest('.modal');
      if (e.target === overlay && modal) closeModal(modal);
    });
  });

  // ---- Search input (debounced) ----
  $('#search-input').addEventListener('input', handleSearch);

  // ---- Sort buttons ----
  $('#sort-priority-btn').addEventListener('click', () => setSort('priority'));
  $('#sort-date-btn').addEventListener('click', () => setSort('date'));

  // ---- Set default sort to 'priority' ----
  setSort('priority');

  // ---- Set default due date in add form to today ----
  $('#task-due-date').value = todayISO();

  // ---- Start live countdown timers ----
  startCountdownTimers();
});
