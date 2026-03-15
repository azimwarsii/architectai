/**
 * Replit Integration
 * Detects workspace, files, and AI conversations in Replit
 */

import { BasePlatform } from './base.js'

export class ReplitPlatform extends BasePlatform {
  constructor() {
    super('Replit')
  }

  // Detect if we're on Replit
  detect() {
    const hostname = window.location.hostname
    return hostname.includes('replit.com') || hostname.includes('repl.it')
  }

  // Get workspace/project information
  getWorkspaceInfo() {
    const info = {
      name: 'Replit Project',
      url: window.location.href,
      platform: 'Replit',
      replId: null,
      owner: null,
      replName: null,
      language: null,
    }

    // Parse URL for repl info: /@username/replname or /replId
    const pathMatch = window.location.pathname.match(/\/@([^/]+)\/([^/]+)/)
    if (pathMatch) {
      info.owner = pathMatch[1]
      info.replName = pathMatch[2]
      info.name = `${info.owner}/${info.replName}`
    }

    // Get from page elements
    const replTitle = document.querySelector('[data-testid="repl-title"]') ||
                      document.querySelector('.repl-title') ||
                      document.querySelector('[class*="workspace-name"]') ||
                      document.querySelector('h1.title')

    if (replTitle) {
      const titleText = replTitle.textContent?.trim()
      if (titleText) {
        info.replName = titleText
        info.name = titleText
      }
    }

    // Get language from header badge or config
    const langBadge = document.querySelector('[data-testid="language-badge"]') ||
                      document.querySelector('[class*="language"]') ||
                      document.querySelector('.repl-language')

    if (langBadge) {
      info.language = langBadge.textContent?.trim().toLowerCase()
    }

    // Try to get from .replit config indicator
    const replitConfig = document.querySelector('[data-filename=".replit"]')
    if (replitConfig) {
      // Could parse the config file content
    }

    return info
  }

  // Get current file information
  getCurrentFile() {
    const file = {
      name: null,
      path: null,
      language: null,
    }

    // Replit file tab
    const activeTab = document.querySelector('[data-testid="file-tab-active"]') ||
                      document.querySelector('.file-tab.active') ||
                      document.querySelector('[class*="tab"][aria-selected="true"]') ||
                      document.querySelector('.editor-tabs .selected')

    if (activeTab) {
      file.name = activeTab.textContent?.trim()
      // Clean up the name (remove close button text etc)
      file.name = file.name?.replace(/[×✕]$/, '').trim()
    }

    // Try file tree
    const activeFile = document.querySelector('[data-testid="file-active"]') ||
                       document.querySelector('.filetree-node.selected') ||
                       document.querySelector('[class*="file-tree"] [aria-selected="true"]')

    if (activeFile && !file.name) {
      file.name = activeFile.textContent?.trim()
    }

    // Get path from data attribute
    if (activeFile) {
      file.path = activeFile.getAttribute('data-path') ||
                  activeFile.getAttribute('title') ||
                  file.name
    }

    // Detect language from extension
    if (file.name) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      file.language = this.getLanguageFromExtension(ext)
    }

    return file
  }

  // Get AI conversations from Replit AI
  getConversations() {
    const conversations = []

    // Replit AI panel selectors (Ghostwriter / AI)
    const aiPanelSelectors = [
      '[data-testid="ai-panel"]',
      '[class*="ghostwriter"]',
      '[class*="ai-chat"]',
      '[class*="assistant-panel"]',
      '.chat-container',
    ]

    let aiPanel = null
    for (const selector of aiPanelSelectors) {
      aiPanel = document.querySelector(selector)
      if (aiPanel) break
    }

    if (!aiPanel) return conversations

    // Find messages
    const messages = aiPanel.querySelectorAll(
      '[data-testid="ai-message"], [class*="message"], [class*="chat-item"]'
    )

    messages.forEach(msg => {
      const isUser = msg.classList.contains('user') ||
                     msg.getAttribute('data-sender') === 'user' ||
                     msg.getAttribute('data-role') === 'user' ||
                     msg.querySelector('[class*="user-avatar"]')

      const content = msg.textContent?.trim()
      if (content && content.length > 0) {
        conversations.push({
          role: isUser ? 'user' : 'assistant',
          content: content.slice(0, 2000),
          timestamp: new Date().toISOString(),
        })
      }
    })

    return conversations.slice(-10)
  }

  // Get selected code from Monaco editor
  getSelectedCode() {
    const selection = window.getSelection()
    let selectedText = selection ? selection.toString().trim() : ''

    // Replit uses Monaco editor
    if (!selectedText) {
      const monacoEditor = document.querySelector('.monaco-editor')
      if (monacoEditor) {
        // Check for selection highlight
        const selectionLayer = monacoEditor.querySelector('.view-overlays .selected-text')
        if (selectionLayer) {
          // Try to get selected lines
          const activeLines = monacoEditor.querySelectorAll('.view-line')
          // This is a simplified approach - actual selection might need Monaco API
        }
      }
    }

    // Also check for output/console selection
    if (!selectedText) {
      const console = document.querySelector('[class*="console"], [class*="terminal"]')
      if (console && console.contains(document.activeElement)) {
        selectedText = selection ? selection.toString().trim() : ''
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
      c: 'c',
      cpp: 'cpp',
      cs: 'csharp',
      php: 'php',
      swift: 'swift',
      kt: 'kotlin',
      scala: 'scala',
      r: 'r',
      lua: 'lua',
      html: 'html',
      css: 'css',
      sql: 'sql',
      sh: 'bash',
      nix: 'nix',
    }
    return langMap[ext] || ext || 'text'
  }

  // Set up Replit-specific observers
  setupObservers() {
    // Observe AI panel for new messages
    const aiObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const isAIResponse = node.getAttribute?.('data-role') === 'assistant' ||
                                   node.classList?.contains('assistant') ||
                                   node.querySelector?.('[class*="assistant"]')
              if (isAIResponse) {
                console.log('[ArchitectAI] New Replit AI response detected')
              }
            }
          })
        }
      })
    })

    const aiPanel = document.querySelector('[class*="ai-panel"], [class*="ghostwriter"]')
    if (aiPanel) {
      aiObserver.observe(aiPanel, {
        childList: true,
        subtree: true,
      })
      this.observers.push(aiObserver)
    }

    // Observe file tree for changes
    const fileObserver = new MutationObserver(() => {
      this.getCurrentFile()
    })

    const fileTree = document.querySelector('[class*="filetree"], [class*="file-tree"]')
    if (fileTree) {
      fileObserver.observe(fileTree, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'aria-selected'],
      })
      this.observers.push(fileObserver)
    }

    // Observe for console/output updates
    const consoleObserver = new MutationObserver(() => {
      // Could capture console output here
    })

    const consolePanel = document.querySelector('[class*="console"], [class*="terminal"]')
    if (consolePanel) {
      consoleObserver.observe(consolePanel, {
        childList: true,
        subtree: true,
      })
      this.observers.push(consoleObserver)
    }
  }
}
