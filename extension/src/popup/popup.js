/**
 * ArchitectAI Extension Popup Script
 */

// State
let currentUser = null
let projects = []
let selectedNodeType = 'evidence'
let capturedContext = null
let currentTab = 'capture'
let tasks = []
let activeTask = null

// DOM Elements
const views = {
  loading: document.getElementById('loading'),
  login: document.getElementById('login-view'),
  main: document.getElementById('main-view'),
  success: document.getElementById('success-view'),
}

const elements = {
  loginBtn: document.getElementById('login-btn'),
  logoutBtn: document.getElementById('logout-btn'),
  sidePanelBtn: document.getElementById('side-panel-btn'),
  projectSelect: document.getElementById('project-select'),
  nodeTitle: document.getElementById('node-title'),
  nodeBody: document.getElementById('node-body'),
  sendBtn: document.getElementById('send-btn'),
  backBtn: document.getElementById('back-btn'),
  openDashboardBtn: document.getElementById('open-dashboard-btn'),
  userAvatar: document.getElementById('user-avatar'),
  userName: document.getElementById('user-name'),
  userEmail: document.getElementById('user-email'),
  capturedContext: document.getElementById('captured-context'),
  contextTitle: document.getElementById('context-title'),
  contextBody: document.getElementById('context-body'),
  clearContextBtn: document.getElementById('clear-context-btn'),
  successMessage: document.getElementById('success-message'),
  nodeTypeBtns: document.querySelectorAll('.node-type-btn'),
  // Tabs
  tabs: document.querySelectorAll('.tab'),
  captureTab: document.getElementById('capture-tab'),
  tasksTab: document.getElementById('tasks-tab'),
  // Tasks
  noTasks: document.getElementById('no-tasks'),
  tasksList: document.getElementById('tasks-list'),
  activeTaskEl: document.getElementById('active-task'),
  copyContextBtn: document.getElementById('copy-context-btn'),
  completeTaskBtn: document.getElementById('complete-task-btn'),
}

// Initialize popup
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

    // Check for captured context
    await loadCapturedContext()

    // Update UI
    updateUserInfo()
    showView('main')
  } else {
    showView('login')
  }

  // Set up event listeners
  setupEventListeners()
  setupTabListeners()
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

// Update user info display
function updateUserInfo() {
  if (!currentUser) return

  const name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User'
  const email = currentUser.email || ''
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  elements.userAvatar.textContent = initials
  elements.userName.textContent = name
  elements.userEmail.textContent = email
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
      updateSendButton()
      // Also load tasks for the selected project
      await loadTasks(result.architectai_selected_project)
    }
  })
}

// Load captured context from storage
async function loadCapturedContext() {
  const result = await chrome.storage.local.get(['captured_context'])

  if (result.captured_context) {
    capturedContext = result.captured_context
    showCapturedContext()
  }
}

// Show captured context in UI
function showCapturedContext() {
  if (!capturedContext) {
    elements.capturedContext.classList.add('hidden')
    return
  }

  elements.contextTitle.textContent = capturedContext.title || 'Captured content'
  elements.contextBody.textContent = capturedContext.body || capturedContext.text || ''
  elements.capturedContext.classList.remove('hidden')

  // Pre-fill the form
  if (capturedContext.title) {
    elements.nodeTitle.value = capturedContext.title
  }
  if (capturedContext.body || capturedContext.text) {
    elements.nodeBody.value = capturedContext.body || capturedContext.text
  }

  updateSendButton()
}

// Clear captured context
async function clearCapturedContext() {
  await chrome.storage.local.remove(['captured_context'])
  capturedContext = null
  elements.capturedContext.classList.add('hidden')
  elements.nodeTitle.value = ''
  elements.nodeBody.value = ''
  updateSendButton()
}

// Update send button state
function updateSendButton() {
  const hasProject = elements.projectSelect.value !== ''
  const hasTitle = elements.nodeTitle.value.trim() !== ''

  elements.sendBtn.disabled = !hasProject || !hasTitle
}

// Set up event listeners
function setupEventListeners() {
  // Login button
  elements.loginBtn.addEventListener('click', async () => {
    elements.loginBtn.disabled = true
    elements.loginBtn.textContent = 'Signing in...'

    const result = await sendMessage({ action: 'login' })

    if (result.success) {
      currentUser = result.user
      await loadProjects()
      updateUserInfo()
      showView('main')
    } else {
      alert(result.error || 'Login failed')
    }

    elements.loginBtn.disabled = false
    elements.loginBtn.textContent = 'Sign in with ArchitectAI'
  })

  // Logout button
  elements.logoutBtn.addEventListener('click', async () => {
    await sendMessage({ action: 'logout' })
    currentUser = null
    projects = []
    showView('login')
  })

  // Project selection
  elements.projectSelect.addEventListener('change', async () => {
    const projectId = elements.projectSelect.value
    // Save selection
    chrome.storage.local.set({
      architectai_selected_project: projectId
    })
    updateSendButton()

    // Load tasks for selected project
    if (projectId) {
      await loadTasks(projectId)
    } else {
      tasks = []
      activeTask = null
      updateTasksUI()
    }
  })

  // Node type buttons
  elements.nodeTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.nodeTypeBtns.forEach(b => b.classList.remove('selected'))
      btn.classList.add('selected')
      selectedNodeType = btn.dataset.type
    })
  })

  // Title input
  elements.nodeTitle.addEventListener('input', updateSendButton)

  // Clear context button
  elements.clearContextBtn.addEventListener('click', clearCapturedContext)

  // Send button
  elements.sendBtn.addEventListener('click', async () => {
    elements.sendBtn.disabled = true
    elements.sendBtn.textContent = 'Sending...'

    const evidence = capturedContext?.source ? [{
      quote: capturedContext.text || capturedContext.body || '',
      source: capturedContext.source,
      url: capturedContext.url,
    }] : []

    const result = await sendMessage({
      action: 'sendToCanvas',
      data: {
        projectId: elements.projectSelect.value,
        nodeType: selectedNodeType,
        title: elements.nodeTitle.value.trim(),
        body: elements.nodeBody.value.trim(),
        evidence,
      },
    })

    if (result.success) {
      // Clear form
      await clearCapturedContext()

      // Show success
      elements.successMessage.textContent = `Created "${result.node.title}" on canvas`
      showView('success')
    } else {
      alert(result.error || 'Failed to send to canvas')
    }

    elements.sendBtn.disabled = false
    elements.sendBtn.textContent = 'Send to Canvas'
    updateSendButton()
  })

  // Back button (from success view)
  elements.backBtn.addEventListener('click', () => {
    showView('main')
  })

  // Open dashboard
  elements.openDashboardBtn.addEventListener('click', (e) => {
    e.preventDefault()
    chrome.tabs.create({ url: 'http://localhost:3000/dashboard' })
  })
}

// Set up tab switching
function setupTabListeners() {
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab
      switchTab(tabName)
    })
  })

  // Side panel button
  if (elements.sidePanelBtn) {
    elements.sidePanelBtn.addEventListener('click', () => {
      // Open side panel (if supported)
      if (chrome.sidePanel) {
        chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT })
      } else {
        // Fallback: open in new tab
        const projectId = elements.projectSelect.value
        if (projectId) {
          chrome.tabs.create({ url: `http://localhost:3000/canvas/${projectId}` })
        }
      }
    })
  }

  // Copy context button
  if (elements.copyContextBtn) {
    elements.copyContextBtn.addEventListener('click', copyTaskContext)
  }

  // Complete task button
  if (elements.completeTaskBtn) {
    elements.completeTaskBtn.addEventListener('click', completeTask)
  }
}

// Switch between tabs
function switchTab(tabName) {
  currentTab = tabName

  // Update tab button states
  elements.tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName)
  })

  // Show/hide tab content
  elements.captureTab.classList.toggle('hidden', tabName !== 'capture')
  elements.tasksTab.classList.toggle('hidden', tabName !== 'tasks')
}

// Load tasks for a project
async function loadTasks(projectId) {
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

  // Save active task ID for content script interception
  chrome.storage.local.set({ architectai_active_task: task.id })

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

  if (!projectId) {
    elements.noTasks.classList.remove('hidden')
    elements.tasksList.classList.add('hidden')
    elements.activeTaskEl.classList.add('hidden')
    elements.noTasks.querySelector('p').textContent = 'Select a project to view tasks'
    return
  }

  if (tasks.length === 0) {
    elements.noTasks.classList.remove('hidden')
    elements.tasksList.classList.add('hidden')
    elements.activeTaskEl.classList.add('hidden')
    elements.noTasks.querySelector('p').textContent = 'No tasks found for this project'
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
        <span class="task-meta">${getStatusLabel(task.status)} • ${task.priority || 'medium'}</span>
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
    elements.activeTaskEl.classList.remove('hidden')
    renderActiveTask()
  } else {
    elements.activeTaskEl.classList.add('hidden')
  }
}

// Render active task details
function renderActiveTask() {
  if (!activeTask) return

  const taskHeader = elements.activeTaskEl.querySelector('.task-header')
  const taskDescription = elements.activeTaskEl.querySelector('.task-description')
  const criteriaList = elements.activeTaskEl.querySelector('.criteria-list')
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
    elements.activeTaskEl.querySelector('.task-criteria').classList.remove('hidden')
  } else {
    elements.activeTaskEl.querySelector('.task-criteria').classList.add('hidden')
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
      item.addEventListener('click', (e) => {
        const prompt = item.dataset.prompt
        copyToClipboard(prompt, true) // Log prompt to project memory
        showToast('Prompt copied & logged!')
      })
    })

    elements.activeTaskEl.querySelector('.prompt-suggestions').classList.remove('hidden')
  } else {
    elements.activeTaskEl.querySelector('.prompt-suggestions').classList.add('hidden')
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

// Copy task context to clipboard
async function copyTaskContext() {
  if (!activeTask) return

  const context = formatTaskContext(activeTask)
  await copyToClipboard(context)
  showToast('Context copied!')
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
      parts.push(`- **${node.title}**: ${node.body || ''}`)
    })
    parts.push('')
  }

  return parts.join('\n')
}

// Mark task as complete
async function completeTask() {
  if (!activeTask) return

  elements.completeTaskBtn.disabled = true
  elements.completeTaskBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
      <circle cx="12" cy="12" r="10"></circle>
    </svg>
    Completing...
  `

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
    Mark Complete
  `
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

// Helper: Copy to clipboard and log prompt
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
  const existingToast = document.querySelector('.copy-toast')
  if (existingToast) {
    existingToast.remove()
  }

  const toast = document.createElement('div')
  toast.className = 'copy-toast'
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
