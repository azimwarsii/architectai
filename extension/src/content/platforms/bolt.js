/**
 * Bolt Integration
 * Detects project info, files, and AI conversations in Bolt.new
 */

import { BasePlatform } from './base.js'

export class BoltPlatform extends BasePlatform {
  constructor() {
    super('Bolt')
  }

  // Detect if we're on Bolt
  detect() {
    const hostname = window.location.hostname
    return hostname.includes('bolt.new') || hostname.includes('bolt.diy')
  }

  // Get workspace/project information
  getWorkspaceInfo() {
    const info = {
      name: 'Bolt Project',
      url: window.location.href,
      platform: 'Bolt',
      projectId: null,
      template: null,
    }

    // Get project ID from URL
    const urlMatch = window.location.pathname.match(/\/([^/]+)$/)
    if (urlMatch && urlMatch[1] !== '' && urlMatch[1] !== 'new') {
      info.projectId = urlMatch[1]
    }

    // Get project name from header
    const headerEl = document.querySelector('[class*="project-name"]') ||
                     document.querySelector('.header h1') ||
                     document.querySelector('[class*="workspace-title"]')

    if (headerEl) {
      info.name = headerEl.textContent?.trim()
    }

    // Detect template from URL or UI
    const templateMatch = window.location.search.match(/template=([^&]+)/)
    if (templateMatch) {
      info.template = templateMatch[1]
    }

    // Check for framework indicators in the page
    const stackIndicators = document.querySelectorAll('[class*="stack"], [class*="framework"]')
    if (stackIndicators.length > 0) {
      info.template = Array.from(stackIndicators)
        .map(el => el.textContent?.trim())
        .filter(Boolean)
        .join(', ')
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

    // Bolt uses a file tree - look for active file
    const activeFile = document.querySelector('[data-testid="file-selected"]') ||
                       document.querySelector('.file-tree [class*="active"]') ||
                       document.querySelector('[class*="file-item"][class*="selected"]') ||
                       document.querySelector('[aria-current="true"]')

    if (activeFile) {
      file.name = activeFile.textContent?.trim()
      file.path = activeFile.getAttribute('data-path') || file.name
    }

    // Try to get from editor tab
    const activeTab = document.querySelector('[class*="tab"][class*="active"]') ||
                      document.querySelector('.editor-tabs .selected')

    if (activeTab && !file.name) {
      file.name = activeTab.textContent?.trim()
    }

    // Detect language from extension
    if (file.name) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      file.language = this.getLanguageFromExtension(ext)
    }

    return file
  }

  // Get AI conversations from Bolt's chat
  getConversations() {
    const conversations = []

    // Bolt chat panel selectors
    const chatSelectors = [
      '[data-testid="chat"]',
      '[class*="chat-panel"]',
      '[class*="ai-messages"]',
      '.prompt-container',
      '[class*="conversation"]',
    ]

    let chatContainer = null
    for (const selector of chatSelectors) {
      chatContainer = document.querySelector(selector)
      if (chatContainer) break
    }

    if (!chatContainer) return conversations

    // Find messages - Bolt typically shows prompt and response
    const messageSelectors = [
      '[class*="message"]',
      '[class*="prompt-item"]',
      '[class*="response"]',
      '[data-role]',
    ]

    let messages = null
    for (const selector of messageSelectors) {
      messages = chatContainer.querySelectorAll(selector)
      if (messages.length > 0) break
    }

    if (messages) {
      messages.forEach(msg => {
        const role = msg.getAttribute('data-role')
        const isUser = role === 'user' ||
                       msg.classList.contains('user') ||
                       msg.classList.contains('prompt') ||
                       msg.querySelector('[class*="user"]')

        const content = msg.textContent?.trim()
        if (content && content.length > 0) {
          conversations.push({
            role: isUser ? 'user' : 'assistant',
            content: content.slice(0, 2000),
            timestamp: new Date().toISOString(),
          })
        }
      })
    }

    return conversations.slice(-10)
  }

  // Get selected code
  getSelectedCode() {
    const selection = window.getSelection()
    let selectedText = selection ? selection.toString().trim() : ''

    // Check if we're in the code editor
    if (!selectedText) {
      // Bolt uses CodeMirror or Monaco - try to get selection from there
      const editorEl = document.querySelector('.cm-editor, .monaco-editor')
      if (editorEl) {
        // Check for CodeMirror selection
        const cmSelection = editorEl.querySelector('.cm-selectionBackground')
        if (cmSelection) {
          const selectionLines = editorEl.querySelectorAll('.cm-line.cm-activeLine, .cm-selectionMatch')
          selectedText = Array.from(selectionLines)
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
      vue: 'vue',
      svelte: 'svelte',
      py: 'python',
      html: 'html',
      css: 'css',
      scss: 'scss',
      json: 'json',
      md: 'markdown',
    }
    return langMap[ext] || ext || 'text'
  }

  // Set up Bolt-specific observers
  setupObservers() {
    // Observe for AI response updates
    const responseObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          // Check for new response content
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const isResponse = node.classList?.contains('response') ||
                                 node.querySelector?.('[class*="response"]') ||
                                 node.getAttribute?.('data-role') === 'assistant'
              if (isResponse) {
                console.log('[ArchitectAI] New Bolt response detected')
              }
            }
          })
        }
      })
    })

    const chatArea = document.querySelector('[class*="chat"], [class*="prompt"]')
    if (chatArea) {
      responseObserver.observe(chatArea, {
        childList: true,
        subtree: true,
      })
      this.observers.push(responseObserver)
    }

    // Observe file tree for changes
    const fileTreeObserver = new MutationObserver(() => {
      this.getCurrentFile()
    })

    const fileTree = document.querySelector('[class*="file-tree"], [class*="explorer"]')
    if (fileTree) {
      fileTreeObserver.observe(fileTree, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'aria-selected'],
      })
      this.observers.push(fileTreeObserver)
    }
  }
}
