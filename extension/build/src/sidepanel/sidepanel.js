/**
 * ArchitectAI Side Panel Script
 */

// State
let currentUser = null
let projects = []
let tasks = []
let activeTask = null
let capturedContext = null

// DOM Elements
const views = {
  loading: document.getElementById('loading'),
  login: document.getElementById('login-view'),
  main: document.getElementById('main-view'),
}

const elements = {
  openPopupBtn: document.getElementById('open-popup-btn'),
  refreshBtn: document.getElementById('refresh-btn'),
  openDashboardBtn: document.getElementById('open-dashboard-btn'),
  projectSelect: document.getElementById('project-select'),
  taskCount: document.getElementById('task-count'),
  noTasks: document.getElementById('no-tasks'),
  tasksList: document.getElementById('tasks-list'),
  activeTaskSection: document.getElementById('active-task-section'),
  activeTaskEl: document.getElementById('active-task'),
  minimizeTaskBtn: document.getElementById('minimize-task-btn'),
  copyFullContextBtn: document.getElementById('copy-full-context-btn'),
  completeTaskBtn: document.getElementById('complete-task-btn'),
  recentCapture: document.getElementById('recent-capture'),
  clearCaptureBtn: document.getElementById('clear-capture-btn'),
  sendCaptureBtn: document.getElementById('send-capture-btn'),
}

// Initialize side panel
async function init() {
  showView('loading')

  // Check authentication status
  const authResult = await sendMessage({ action: 'checkAuth' })

  if (authResult.authenticated) {
    // Get user info
    const userResult = await sendMessage({ action: 'getUser' })
    currentUser = userResult.user

    // Load projects
    await loadProjects()

    // Load captured context
    await loadCapturedContext()

    showView('main')
  } else {
    showView('login')
  }

  setupEventListeners()
}

// Send message to background script
function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, resolve)
  })
}

// Show a specific view
function showView(viewName) {
  Object.keys(views).forEach(key => {
    views[key].classList.toggle('hidden', key !== viewName)
  })
}

// Load projects
async function loadProjects() {
  const result = await sendMessage({ action: 'getProjects' })

  if (result.success) {
    projects = result.projects || []
    populateProjectSelect()
  }
}

// Populate project dropdown
function populateProjectSelect() {
  elements.projectSelect.innerHTML = '<option value="">Select a project...</option>'

  projects.forEach(project => {
    const option = document.createElement('option')
    option.value = project.id
    option.textContent = project.name
    elements.projectSelect.appendChild(option)
  })

  // Restore last selected project
  chrome.storage.local.get(['architectai_selected_project'], async (result) => {
    if (result.architectai_selected_project) {
      elements.projectSelect.value = result.architectai_selected_project
      await loadTasks(result.architectai_selected_project)
    }
  })
}

// Load tasks for a project
async function loadTasks(projectId) {
  if (!projectId) {
    tasks = []
    activeTask = null
    updateTasksUI()
    return
  }

  try {
    const result = await sendMessage({
      action: 'getTasks',
      projectId,
    })

    if (result.success) {
      tasks = result.tasks || []
      // Auto-select first pending or in-progress task
      const activeTaskData = tasks.find(t => t.status === 'in_progress') ||
                             tasks.find(t => t.status === 'pending')
      if (activeTaskData) {
        await selectTask(activeTaskData)
      } else {
        activeTask = null
      }
      updateTasksUI()
    }
  } catch (error) {
    console.error('Failed to load tasks:', error)
    tasks = []
    updateTasksUI()
  }
}

// Select a task and load its context
async function selectTask(task) {
  activeTask = task

  // Load full task context
  try {
    const result = await sendMessage({
      action: 'getTaskContext',
      taskId: task.id,
    })

    if (result.success && result.context) {
      activeTask = { ...task, ...result.context }
    }
  } catch (error) {
    console.error('Failed to load task context:', error)
  }

  updateTasksUI()
}

// Update tasks UI
function updateTasksUI() {
  const projectId = elements.projectSelect.value

  // Update task count
  const activeTasks = tasks.filter(t => t.status !== 'done')
  elements.taskCount.textContent = activeTasks.length

  if (!projectId || tasks.length === 0) {
    elements.noTasks.classList.remove('hidden')
    elements.tasksList.classList.add('hidden')
    elements.activeTaskSection.classList.add('hidden')
    elements.noTasks.querySelector('p').textContent = !projectId
      ? 'Select a project to view tasks'
      : 'No tasks found'
    return
  }

  elements.noTasks.classList.add('hidden')
  elements.tasksList.classList.remove('hidden')

  // Render task list
  elements.tasksList.innerHTML = tasks.map(task => `
    <div class="task-item ${activeTask?.id === task.id ? 'active' : ''}" data-task-id="${task.id}">
      <span class="task-status ${getStatusClass(task.status)}"></span>
      <div class="task-info">
        <span class="task-title">${escapeHtml(task.title)}</span>
        <span class="task-meta">${getStatusLabel(task.status)} ${task.priority ? `• ${task.priority}` : ''}</span>
      </div>
    </div>
  `).join('')

  // Add click handlers to task items
  elements.tasksList.querySelectorAll('.task-item').forEach(item => {
    item.addEventListener('click', () => {
      const taskId = item.dataset.taskId
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        selectTask(task)
      }
    })
  })

  // Show active task details
  if (activeTask) {
    elements.activeTaskSection.classList.remove('hidden')
    renderActiveTask()
  } else {
    elements.activeTaskSection.classList.add('hidden')
  }
}

// Render active task details
function renderActiveTask() {
  if (!activeTask) return

  const taskHeader = elements.activeTaskEl.querySelector('.task-header')
  const taskDescription = elements.activeTaskEl.querySelector('.task-description')
  const taskCriteria = elements.activeTaskEl.querySelector('.task-criteria')
  const criteriaList = elements.activeTaskEl.querySelector('.criteria-list')
  const linkedContext = elements.activeTaskEl.querySelector('.linked-context')
  const contextList = elements.activeTaskEl.querySelector('.context-list')
  const promptSuggestions = elements.activeTaskEl.querySelector('.prompt-suggestions')
  const suggestionsList = elements.activeTaskEl.querySelector('.suggestions-list')

  // Update header
  taskHeader.querySelector('.task-status').className = `task-status ${getStatusClass(activeTask.status)}`
  taskHeader.querySelector('.task-title').textContent = activeTask.title

  // Update description
  taskDescription.textContent = activeTask.description || 'No description'

  // Update acceptance criteria
  const criteria = activeTask.acceptance_criteria || activeTask.acceptanceCriteria || []
  if (criteria.length > 0) {
    criteriaList.innerHTML = criteria.map(c => `<li>${escapeHtml(c)}</li>`).join('')
    taskCriteria.classList.remove('hidden')
  } else {
    taskCriteria.classList.add('hidden')
  }

  // Update linked context
  const linkedNodes = activeTask.linkedNodes || []
  if (linkedNodes.length > 0) {
    contextList.innerHTML = linkedNodes.map(node => `
      <div class="context-item">
        <span class="context-type">${node.type || 'Node'}</span>
        <span class="context-title">${escapeHtml(node.title)}</span>
        ${node.body ? `<p class="context-body">${escapeHtml(node.body)}</p>` : ''}
      </div>
    `).join('')
    linkedContext.classList.remove('hidden')
  } else {
    linkedContext.classList.add('hidden')
  }

  // Generate and render prompt suggestions
  const suggestions = generatePromptSuggestions(activeTask)
  if (suggestions.length > 0) {
    suggestionsList.innerHTML = suggestions.map(s => `
      <div class="suggestion-item" data-prompt="${escapeHtml(s.prompt)}">
        <span class="suggestion-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polygon points="10 8 16 12 10 16 10 8"></polygon>
          </svg>
        </span>
        <span class="suggestion-text">${escapeHtml(s.label)}</span>
        <button class="copy-btn" title="Copy prompt">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>
    `).join('')

    // Add click handlers for suggestions
    suggestionsList.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        const prompt = item.dataset.prompt
        copyToClipboard(prompt, true) // Log prompt to project memory
        showToast('Prompt copied & logged!')
      })
    })

    promptSuggestions.classList.remove('hidden')
  } else {
    promptSuggestions.classList.add('hidden')
  }
}

// Generate prompt suggestions based on task
function generatePromptSuggestions(task) {
  const suggestions = []
  const title = task.title || ''
  const description = task.description || ''
  const criteria = task.acceptance_criteria || task.acceptanceCriteria || []

  // Basic implementation prompt
  suggestions.push({
    label: `Implement: ${title}`,
    prompt: `I need to implement the following task:\n\nTask: ${title}\n\nDescription: ${description}\n\n${criteria.length > 0 ? 'Acceptance Criteria:\n' + criteria.map((c, i) => `${i + 1}. ${c}`).join('\n') : ''}\n\nPlease help me implement this.`,
  })

  // Architecture/planning prompt
  if (description.length > 50 || criteria.length > 2) {
    suggestions.push({
      label: 'Plan implementation approach',
      prompt: `Before implementing, I'd like to plan my approach for:\n\nTask: ${title}\n\nDescription: ${description}\n\nPlease suggest:\n1. Key components/files to modify\n2. Step-by-step implementation plan\n3. Potential edge cases to handle`,
    })
  }

  // Testing prompt
  suggestions.push({
    label: 'Write tests for this task',
    prompt: `I need to write tests for:\n\nTask: ${title}\n\nDescription: ${description}\n\n${criteria.length > 0 ? 'The tests should verify:\n' + criteria.map((c, i) => `${i + 1}. ${c}`).join('\n') : ''}\n\nPlease help me write comprehensive tests.`,
  })

  // If task has linked nodes, add context-aware prompts
  if (task.linkedNodes?.length > 0) {
    suggestions.push({
      label: 'Review related context',
      prompt: `I'm working on: ${title}\n\nThis task is related to the following context from our spec:\n${task.linkedNodes.map(n => `- ${n.title}: ${n.body || ''}`).join('\n')}\n\nHow should I incorporate this context into my implementation?`,
    })
  }

  return suggestions.slice(0, 4) // Limit to 4 suggestions
}

// Load captured context
async function loadCapturedContext() {
  const result = await chrome.storage.local.get(['captured_context'])

  if (result.captured_context) {
    capturedContext = result.captured_context
    showCapturedContext()
  } else {
    elements.recentCapture.classList.add('hidden')
  }
}

// Show captured context
function showCapturedContext() {
  if (!capturedContext) {
    elements.recentCapture.classList.add('hidden')
    return
  }

  const preview = elements.recentCapture.querySelector('.capture-preview')
  preview.textContent = capturedContext.text || capturedContext.body || capturedContext.title || ''
  elements.recentCapture.classList.remove('hidden')
}

// Set up event listeners
function setupEventListeners() {
  // Open popup button (for login view)
  elements.openPopupBtn?.addEventListener('click', () => {
    chrome.action.openPopup()
  })

  // Refresh button
  elements.refreshBtn?.addEventListener('click', async () => {
    const projectId = elements.projectSelect.value
    if (projectId) {
      await loadTasks(projectId)
    }
    await loadCapturedContext()
    showToast('Refreshed!')
  })

  // Open dashboard button
  elements.openDashboardBtn?.addEventListener('click', () => {
    const projectId = elements.projectSelect.value
    const url = projectId
      ? `http://localhost:3000/canvas/${projectId}`
      : 'http://localhost:3000/dashboard'
    chrome.tabs.create({ url })
  })

  // Project selection
  elements.projectSelect?.addEventListener('change', async () => {
    const projectId = elements.projectSelect.value
    chrome.storage.local.set({ architectai_selected_project: projectId })
    await loadTasks(projectId)
  })

  // Minimize task button
  elements.minimizeTaskBtn?.addEventListener('click', () => {
    elements.activeTaskSection.classList.add('hidden')
    activeTask = null
    // Deselect from list
    elements.tasksList.querySelectorAll('.task-item').forEach(item => {
      item.classList.remove('active')
    })
  })

  // Copy full context button
  elements.copyFullContextBtn?.addEventListener('click', async () => {
    if (!activeTask) return

    const context = formatTaskContext(activeTask)
    await copyToClipboard(context)
    showToast('Full context copied!')
  })

  // Complete task button
  elements.completeTaskBtn?.addEventListener('click', async () => {
    if (!activeTask) return

    elements.completeTaskBtn.disabled = true
    elements.completeTaskBtn.textContent = 'Completing...'

    try {
      const result = await sendMessage({
        action: 'completeTask',
        taskId: activeTask.id,
      })

      if (result.success) {
        // Update local task status
        activeTask.status = 'done'
        const taskIndex = tasks.findIndex(t => t.id === activeTask.id)
        if (taskIndex >= 0) {
          tasks[taskIndex].status = 'done'
        }
        updateTasksUI()
        showToast('Task completed!')
      } else {
        alert(result.error || 'Failed to complete task')
      }
    } catch (error) {
      console.error('Failed to complete task:', error)
      alert('Failed to complete task')
    }

    elements.completeTaskBtn.disabled = false
    elements.completeTaskBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Complete
    `
  })

  // Clear capture button
  elements.clearCaptureBtn?.addEventListener('click', async () => {
    await chrome.storage.local.remove(['captured_context'])
    capturedContext = null
    elements.recentCapture.classList.add('hidden')
  })

  // Send capture button
  elements.sendCaptureBtn?.addEventListener('click', () => {
    // Open popup for full capture flow
    chrome.action.openPopup()
  })

  // Listen for storage changes (e.g., new captures)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.captured_context) {
      capturedContext = changes.captured_context.newValue
      showCapturedContext()
    }
  })
}

// Format task context for copying
function formatTaskContext(task) {
  const parts = [
    `## Task: ${task.title}`,
    '',
    task.description || '',
    '',
  ]

  const criteria = task.acceptance_criteria || task.acceptanceCriteria || []
  if (criteria.length > 0) {
    parts.push('### Acceptance Criteria')
    criteria.forEach((c, i) => {
      parts.push(`${i + 1}. ${c}`)
    })
    parts.push('')
  }

  if (task.linkedNodes?.length > 0) {
    parts.push('### Related Context')
    task.linkedNodes.forEach(node => {
      parts.push(`- **${node.type || 'Node'}**: ${node.title}`)
      if (node.body) {
        parts.push(`  ${node.body}`)
      }
    })
    parts.push('')
  }

  return parts.join('\n')
}

// Helper: Get status CSS class
function getStatusClass(status) {
  switch (status) {
    case 'done': return 'done'
    case 'in_progress': return 'in-progress'
    default: return 'pending'
  }
}

// Helper: Get status label
function getStatusLabel(status) {
  switch (status) {
    case 'done': return 'Done'
    case 'in_progress': return 'In Progress'
    default: return 'Pending'
  }
}

// Helper: Copy to clipboard and optionally log prompt
async function copyToClipboard(text, logAsPrompt = false) {
  try {
    await navigator.clipboard.writeText(text)

    // Log the prompt to project memory if it's a prompt suggestion
    if (logAsPrompt) {
      const projectId = elements.projectSelect.value
      const taskId = activeTask?.id
      if (projectId) {
        sendMessage({
          action: 'savePrompt',
          data: {
            projectId,
            taskId,
            prompt: text,
            source: 'extension_suggestion',
          },
        })
      }
    }

    return true
  } catch (error) {
    console.error('Failed to copy:', error)
    return false
  }
}

// Helper: Show toast notification
function showToast(message) {
  // Remove existing toast
  const existingToast = document.querySelector('.toast')
  if (existingToast) {
    existingToast.remove()
  }

  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.textContent = message
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.remove()
  }, 2000)
}

// Helper: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text || ''
  return div.innerHTML
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init)
