/**
 * Cursor Integration
 * Detects workspace, files, and AI conversations in Cursor IDE web interface
 */

import { BasePlatform } from './base.js'

export class CursorPlatform extends BasePlatform {
  constructor() {
    super('Cursor')
    this.lastDetectedFile = null
  }

  // Detect if we're on Cursor
  detect() {
    const hostname = window.location.hostname
    return hostname.includes('cursor.sh') || hostname.includes('cursor.so')
  }

  // Get workspace information
  getWorkspaceInfo() {
    const info = {
      name: 'Cursor Workspace',
      url: window.location.href,
      platform: 'Cursor',
      projectName: null,
      branch: null,
    }

    // Try to get project name from title or breadcrumb
    const title = document.title
    if (title && title !== 'Cursor') {
      // Title often contains "filename - projectname - Cursor"
      const parts = title.split(' - ')
      if (parts.length >= 2) {
        info.projectName = parts[parts.length - 2]
      }
    }

    // Look for workspace name in the sidebar
    const workspaceEl = document.querySelector('[data-testid="workspace-name"]') ||
                        document.querySelector('.workspace-name') ||
                        document.querySelector('[class*="workspace"] [class*="title"]')
    if (workspaceEl) {
      info.projectName = workspaceEl.textContent?.trim()
    }

    // Try to find git branch
    const branchEl = document.querySelector('[data-testid="branch-name"]') ||
                     document.querySelector('[class*="branch"]') ||
                     document.querySelector('[class*="git"] [class*="name"]')
    if (branchEl) {
      info.branch = branchEl.textContent?.trim()
    }

    info.name = info.projectName || 'Cursor Workspace'

    return info
  }

  // Get current file information
  getCurrentFile() {
    const file = {
      name: null,
      path: null,
      language: null,
      content: null,
    }

    // Try to get from active tab
    const activeTab = document.querySelector('[data-testid="tab-active"]') ||
                      document.querySelector('.tab.active') ||
                      document.querySelector('[class*="tab"][class*="active"]') ||
                      document.querySelector('[aria-selected="true"][role="tab"]')

    if (activeTab) {
      file.name = activeTab.textContent?.trim()
      file.path = activeTab.getAttribute('data-path') || activeTab.getAttribute('title') || file.name
    }

    // Fallback to title
    if (!file.name) {
      const title = document.title
      if (title && title !== 'Cursor') {
        const parts = title.split(' - ')
        if (parts.length > 0) {
          file.name = parts[0].trim()
        }
      }
    }

    // Detect language from file extension
    if (file.name) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      file.language = this.getLanguageFromExtension(ext)
    }

    // Try to get file content from editor
    const editor = document.querySelector('.monaco-editor') ||
                   document.querySelector('[data-testid="editor"]') ||
                   document.querySelector('[class*="editor-container"]')

    if (editor) {
      // Monaco editor stores content in model
      const lines = editor.querySelectorAll('.view-line')
      if (lines.length > 0) {
        file.content = Array.from(lines)
          .map(line => line.textContent)
          .join('\n')
          .slice(0, 5000) // Limit size
      }
    }

    this.lastDetectedFile = file
    return file
  }

  // Get AI conversations from Cursor's AI panel
  getConversations() {
    const conversations = []

    // Cursor AI chat panel selectors
    const chatContainers = [
      '[data-testid="ai-chat"]',
      '[class*="chat-container"]',
      '[class*="ai-panel"]',
      '[class*="composer"]',
      '.chat-messages',
    ]

    let chatContainer = null
    for (const selector of chatContainers) {
      chatContainer = document.querySelector(selector)
      if (chatContainer) break
    }

    if (!chatContainer) return conversations

    // Find message elements
    const messageSelectors = [
      '[data-testid="chat-message"]',
      '[class*="message"]',
      '[class*="chat-item"]',
    ]

    let messages = []
    for (const selector of messageSelectors) {
      messages = chatContainer.querySelectorAll(selector)
      if (messages.length > 0) break
    }

    messages.forEach(msg => {
      const isUser = msg.classList.contains('user') ||
                     msg.getAttribute('data-role') === 'user' ||
                     msg.querySelector('[class*="user"]')

      const content = msg.textContent?.trim()
      if (content) {
        conversations.push({
          role: isUser ? 'user' : 'assistant',
          content: content.slice(0, 1000),
          timestamp: new Date().toISOString(),
        })
      }
    })

    return conversations.slice(-10) // Last 10 messages
  }

  // Get selected code with Monaco editor awareness
  getSelectedCode() {
    // First try native selection
    const selection = window.getSelection()
    let selectedText = selection ? selection.toString().trim() : ''

    // If in Monaco editor, try to get from editor selection
    if (!selectedText) {
      const monacoEditor = document.querySelector('.monaco-editor')
      if (monacoEditor) {
        // Monaco stores selection in a specific element
        const selectedLines = monacoEditor.querySelectorAll('.selected-text, .view-line.selected')
        if (selectedLines.length > 0) {
          selectedText = Array.from(selectedLines)
            .map(line => line.textContent)
            .join('\n')
            .trim()
        }
      }
    }

    return selectedText
  }

  // Get language from file extension
  getLanguageFromExtension(ext) {
    const langMap = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      swift: 'swift',
      kt: 'kotlin',
      sql: 'sql',
      html: 'html',
      css: 'css',
      scss: 'scss',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      sh: 'bash',
      bash: 'bash',
    }
    return langMap[ext] || ext || 'text'
  }

  // Cursor-specific chat input selector
  getChatInputSelector() {
    return '[data-testid="chat-input"], [class*="chat-input"], [class*="composer"] textarea, [class*="ai-input"]'
  }

  // Cursor-specific submit button selector
  getSubmitButtonSelector() {
    return '[data-testid="chat-submit"], [class*="chat-send"], [class*="submit-button"], [aria-label*="Send"]'
  }

  // Cursor-specific response selector
  getResponseSelector() {
    return '[data-testid="assistant-message"], [data-role="assistant"], [class*="assistant"], [class*="ai-response"]'
  }

  // Set up Cursor-specific observers
  setupObservers() {
    // Observe for AI chat updates
    const chatObserver = new MutationObserver((mutations) => {
      // Could trigger auto-capture of AI responses here
    })

    const chatPanel = document.querySelector('[class*="chat"], [class*="ai-panel"]')
    if (chatPanel) {
      chatObserver.observe(chatPanel, {
        childList: true,
        subtree: true,
      })
      this.observers.push(chatObserver)
    }

    // Observe for tab changes
    const tabObserver = new MutationObserver(() => {
      this.getCurrentFile()
    })

    const tabContainer = document.querySelector('[class*="tabs"], [role="tablist"]')
    if (tabContainer) {
      tabObserver.observe(tabContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'aria-selected'],
      })
      this.observers.push(tabObserver)
    }
  }
}
