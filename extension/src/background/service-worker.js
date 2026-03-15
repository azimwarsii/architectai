import { login, logout, isAuthenticated, getCurrentUser, authenticatedFetch } from '../utils/auth.js'
import { CONFIG } from '../utils/config.js'

/**
 * Background service worker for ArchitectAI extension
 * Handles messages from popup and content scripts
 */

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ error: error.message }))

  // Return true to indicate we'll respond asynchronously
  return true
})

async function handleMessage(request, sender) {
  switch (request.action) {
    case 'login':
      return await handleLogin()

    case 'logout':
      return await handleLogout()

    case 'checkAuth':
      return await handleCheckAuth()

    case 'getUser':
      return await handleGetUser()

    case 'getProjects':
      return await handleGetProjects()

    case 'captureContext':
      return await handleCaptureContext(request.data)

    case 'sendToCanvas':
      return await handleSendToCanvas(request.data)

    case 'getTasks':
      return await handleGetTasks(request.projectId)

    case 'getTaskContext':
      return await handleGetTaskContext(request.taskId)

    case 'completeTask':
      return await handleCompleteTask(request.taskId)

    case 'savePrompt':
      return await handleSavePrompt(request.data)

    case 'interceptPrompt':
      return await handleInterceptPrompt(request.data)

    default:
      throw new Error(`Unknown action: ${request.action}`)
  }
}

async function handleLogin() {
  try {
    const result = await login()
    return { success: true, user: result.user }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function handleLogout() {
  await logout()
  return { success: true }
}

async function handleCheckAuth() {
  const authenticated = await isAuthenticated()
  return { authenticated }
}

async function handleGetUser() {
  const user = await getCurrentUser()
  return { user }
}

async function handleGetProjects() {
  try {
    const response = await authenticatedFetch(`${CONFIG.API_BASE_URL}/api/projects`)

    if (!response.ok) {
      throw new Error('Failed to fetch projects')
    }

    const projects = await response.json()
    return { success: true, projects }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function handleCaptureContext(data) {
  // Store captured context temporarily
  await chrome.storage.local.set({
    captured_context: {
      ...data,
      capturedAt: new Date().toISOString(),
    },
  })

  return { success: true }
}

async function handleSendToCanvas(data) {
  const { projectId, nodeType, title, body, evidence } = data

  try {
    // Create a new node on the canvas
    const response = await authenticatedFetch(`${CONFIG.API_BASE_URL}/api/nodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        type: nodeType || 'evidence',
        title: title,
        body: body,
        evidence: evidence || [],
        status: 'open',
        position: { x: 100, y: 100 }, // Default position
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create node')
    }

    const node = await response.json()
    return { success: true, node }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function handleGetTasks(projectId) {
  if (!projectId) {
    return { success: false, error: 'Project ID required' }
  }

  try {
    const response = await authenticatedFetch(
      `${CONFIG.API_BASE_URL}/api/extension/project/${projectId}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch project data')
    }

    const data = await response.json()
    // Return tasks sorted by priority and status
    const tasks = (data.tasks || []).sort((a, b) => {
      const statusOrder = { in_progress: 0, pending: 1, done: 2 }
      const priorityOrder = { high: 0, medium: 1, low: 2 }

      const statusDiff = (statusOrder[a.status] || 1) - (statusOrder[b.status] || 1)
      if (statusDiff !== 0) return statusDiff

      return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1)
    })

    return { success: true, tasks }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function handleGetTaskContext(taskId) {
  if (!taskId) {
    return { success: false, error: 'Task ID required' }
  }

  try {
    const response = await authenticatedFetch(
      `${CONFIG.API_BASE_URL}/api/extension/tasks/${taskId}/context`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch task context')
    }

    const context = await response.json()
    return { success: true, context }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function handleCompleteTask(taskId) {
  if (!taskId) {
    return { success: false, error: 'Task ID required' }
  }

  try {
    const response = await authenticatedFetch(
      `${CONFIG.API_BASE_URL}/api/extension/tasks/${taskId}/complete`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to complete task')
    }

    const result = await response.json()
    return { success: true, ...result }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function handleSavePrompt(data) {
  const { projectId, taskId, nodeId, prompt, response, source, url } = data

  if (!projectId || !prompt) {
    return { success: false, error: 'Project ID and prompt are required' }
  }

  try {
    const apiResponse = await authenticatedFetch(
      `${CONFIG.API_BASE_URL}/api/extension/prompts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          task_id: taskId,
          node_id: nodeId,
          prompt,
          response,
          source,
          url,
        }),
      }
    )

    if (!apiResponse.ok) {
      throw new Error('Failed to save prompt')
    }

    const result = await apiResponse.json()
    return { success: true, ...result }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function handleInterceptPrompt(data) {
  const { prompt, response, source, url, metadata } = data

  // Get the currently selected project
  const storage = await chrome.storage.local.get(['architectai_selected_project', 'architectai_active_task'])
  const projectId = storage.architectai_selected_project
  const taskId = storage.architectai_active_task

  if (!projectId) {
    // Store for later if no project selected
    await chrome.storage.local.set({
      pending_prompt: {
        prompt,
        response,
        source,
        url,
        metadata,
        capturedAt: new Date().toISOString(),
      },
    })
    return { success: true, action: 'stored_pending' }
  }

  // Save the prompt to the project
  return await handleSavePrompt({
    projectId,
    taskId,
    prompt,
    response,
    source,
    url,
  })
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('ArchitectAI extension installed')
  } else if (details.reason === 'update') {
    console.log('ArchitectAI extension updated')
  }
})

// Handle extension icon click when popup is not available
chrome.action.onClicked.addListener((tab) => {
  // Open popup programmatically if needed
  chrome.action.openPopup()
})
