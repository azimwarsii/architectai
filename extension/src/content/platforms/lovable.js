/**
 * Lovable Integration
 * Detects project info, components, and AI conversations in Lovable
 */

import { BasePlatform } from './base.js'

export class LovablePlatform extends BasePlatform {
  constructor() {
    super('Lovable')
  }

  // Detect if we're on Lovable
  detect() {
    const hostname = window.location.hostname
    return hostname.includes('lovable.dev') || hostname.includes('lovable.app')
  }

  // Get workspace/project information
  getWorkspaceInfo() {
    const info = {
      name: 'Lovable Project',
      url: window.location.href,
      platform: 'Lovable',
      projectId: null,
      projectName: null,
    }

    // Get project ID from URL
    const urlMatch = window.location.pathname.match(/\/projects?\/([^/]+)/)
    if (urlMatch) {
      info.projectId = urlMatch[1]
    }

    // Get project name from header or title
    const projectNameEl = document.querySelector('[data-testid="project-name"]') ||
                          document.querySelector('.project-name') ||
                          document.querySelector('h1') ||
                          document.querySelector('[class*="project-title"]')

    if (projectNameEl) {
      info.projectName = projectNameEl.textContent?.trim()
    }

    // Fallback to title
    if (!info.projectName) {
      const title = document.title
      if (title) {
        info.projectName = title.replace(' | Lovable', '').replace(' - Lovable', '').trim()
      }
    }

    info.name = info.projectName || 'Lovable Project'

    return info
  }

  // Get current component/file information
  getCurrentFile() {
    const file = {
      name: null,
      path: null,
      type: 'component',
      language: 'typescript', // Lovable uses React/TypeScript
    }

    // Look for active component in file tree
    const activeFile = document.querySelector('[data-testid="file-active"]') ||
                       document.querySelector('.file-tree-item.active') ||
                       document.querySelector('[class*="file"][class*="selected"]') ||
                       document.querySelector('[aria-selected="true"][role="treeitem"]')

    if (activeFile) {
      file.name = activeFile.textContent?.trim()
      file.path = activeFile.getAttribute('data-path') || file.name
    }

    // Check for component name in breadcrumb or header
    const breadcrumb = document.querySelector('[class*="breadcrumb"]') ||
                       document.querySelector('.component-path')

    if (breadcrumb && !file.name) {
      file.name = breadcrumb.textContent?.trim().split('/').pop()
    }

    return file
  }

  // Get AI conversations from Lovable's chat
  getConversations() {
    const conversations = []

    // Lovable chat panel selectors
    const chatSelectors = [
      '[data-testid="chat-panel"]',
      '[class*="chat-container"]',
      '[class*="ai-chat"]',
      '.messages-container',
      '[class*="conversation"]',
    ]

    let chatContainer = null
    for (const selector of chatSelectors) {
      chatContainer = document.querySelector(selector)
      if (chatContainer) break
    }

    if (!chatContainer) return conversations

    // Find messages
    const messages = chatContainer.querySelectorAll(
      '[data-testid="message"], [class*="message"], [class*="chat-bubble"]'
    )

    messages.forEach(msg => {
      const isUser = msg.classList.contains('user') ||
                     msg.getAttribute('data-sender') === 'user' ||
                     msg.querySelector('[class*="user-avatar"]') ||
                     msg.closest('[class*="user-message"]')

      const contentEl = msg.querySelector('[class*="content"]') ||
                        msg.querySelector('p') ||
                        msg

      const content = contentEl.textContent?.trim()
      if (content) {
        conversations.push({
          role: isUser ? 'user' : 'assistant',
          content: content.slice(0, 1500),
          timestamp: new Date().toISOString(),
        })
      }
    })

    return conversations.slice(-10)
  }

  // Get selected code or text
  getSelectedCode() {
    const selection = window.getSelection()
    let selectedText = selection ? selection.toString().trim() : ''

    // Also check for code blocks in the selection range
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const container = range.commonAncestorContainer

      // If selection is inside a code block, get the full block
      const codeBlock = container.nodeType === Node.ELEMENT_NODE
        ? container.closest('pre, code, [class*="code-block"]')
        : container.parentElement?.closest('pre, code, [class*="code-block"]')

      if (codeBlock && !selectedText) {
        selectedText = codeBlock.textContent?.trim() || ''
      }
    }

    return selectedText
  }

  // Set up Lovable-specific observers
  setupObservers() {
    // Observe for new AI messages
    const chatObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // New message added - could auto-capture important responses
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const isAssistant = node.classList?.contains('assistant') ||
                                  node.querySelector?.('[class*="assistant"]')
              if (isAssistant) {
                // Could implement auto-capture here
                console.log('[ArchitectAI] New Lovable response detected')
              }
            }
          })
        }
      })
    })

    // Find and observe chat container
    const chatContainer = document.querySelector('[class*="chat"], [class*="conversation"]')
    if (chatContainer) {
      chatObserver.observe(chatContainer, {
        childList: true,
        subtree: true,
      })
      this.observers.push(chatObserver)
    }

    // Observe for preview updates
    const previewObserver = new MutationObserver(() => {
      // Preview updated - component changed
    })

    const previewFrame = document.querySelector('iframe[class*="preview"]') ||
                         document.querySelector('[class*="preview-container"]')
    if (previewFrame) {
      previewObserver.observe(previewFrame.parentElement, {
        childList: true,
        attributes: true,
      })
      this.observers.push(previewObserver)
    }
  }
}
