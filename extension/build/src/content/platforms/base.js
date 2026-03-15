/**
 * Base Platform Integration
 * Common functionality shared by all platform integrations
 */

export class BasePlatform {
  constructor(name) {
    this.name = name
    this.isActive = false
    this.captureButton = null
    this.observers = []
    this.promptHistory = []
    this.lastPrompt = null
    this.interceptEnabled = true
  }

  // Override in subclass - detect if this platform is active
  detect() {
    return false
  }

  // Override in subclass - get workspace/project info
  getWorkspaceInfo() {
    return {
      name: document.title,
      url: window.location.href,
      platform: this.name,
    }
  }

  // Override in subclass - get current file info
  getCurrentFile() {
    return null
  }

  // Override in subclass - get AI conversations
  getConversations() {
    return []
  }

  // Override in subclass - get selected code
  getSelectedCode() {
    const selection = window.getSelection()
    return selection ? selection.toString().trim() : ''
  }

  // Initialize the platform integration
  init() {
    if (!this.detect()) {
      return false
    }

    this.isActive = true
    this.setupCapture()
    this.setupObservers()
    this.setupPromptInterception()
    console.log(`[ArchitectAI] ${this.name} integration initialized`)
    return true
  }

  // Set up prompt interception
  setupPromptInterception() {
    // Monitor for chat input submissions
    this.setupInputMonitoring()
    // Monitor for response elements
    this.setupResponseMonitoring()
  }

  // Override in subclass - get the chat input selector
  getChatInputSelector() {
    return 'textarea[placeholder*="message"], textarea[placeholder*="prompt"], input[type="text"][placeholder*="Ask"]'
  }

  // Override in subclass - get the submit button selector
  getSubmitButtonSelector() {
    return 'button[type="submit"], button[aria-label*="Send"], button[aria-label*="Submit"]'
  }

  // Override in subclass - get the response container selector
  getResponseSelector() {
    return '[class*="response"], [class*="assistant"], [class*="ai-message"]'
  }

  // Monitor input fields for prompt submission
  setupInputMonitoring() {
    // Intercept Enter key submissions
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const input = this.findChatInput()
        if (input && document.activeElement === input) {
          const prompt = input.value || input.textContent
          if (prompt && prompt.trim().length > 10) {
            this.interceptPrompt(prompt.trim())
          }
        }
      }
    }, true)

    // Intercept button clicks
    document.addEventListener('click', (e) => {
      const button = e.target.closest(this.getSubmitButtonSelector())
      if (button) {
        const input = this.findChatInput()
        if (input) {
          const prompt = input.value || input.textContent
          if (prompt && prompt.trim().length > 10) {
            this.interceptPrompt(prompt.trim())
          }
        }
      }
    }, true)
  }

  // Find the active chat input
  findChatInput() {
    const selectors = [
      this.getChatInputSelector(),
      'textarea',
      '[contenteditable="true"]',
    ]

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector)
      for (const el of elements) {
        if (el.offsetParent !== null) { // visible
          const value = el.value || el.textContent
          if (value && value.trim().length > 0) {
            return el
          }
        }
      }
    }
    return null
  }

  // Monitor for AI responses
  setupResponseMonitoring() {
    const observer = new MutationObserver((mutations) => {
      if (!this.lastPrompt) return

      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          const response = this.extractResponse(mutation.addedNodes)
          if (response && response.length > 50) {
            this.handlePromptResponse(response)
          }
        }
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    this.observers.push(observer)
  }

  // Extract response text from added nodes
  extractResponse(nodes) {
    for (const node of nodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue

      // Check if this is a response container
      const responseEl = node.matches?.(this.getResponseSelector())
        ? node
        : node.querySelector?.(this.getResponseSelector())

      if (responseEl) {
        return responseEl.textContent?.trim()
      }

      // Also check for code blocks
      const codeBlock = node.querySelector?.('pre code, [class*="code"]')
      if (codeBlock) {
        return codeBlock.textContent?.trim()
      }
    }
    return null
  }

  // Intercept a prompt before submission
  interceptPrompt(prompt) {
    if (!this.interceptEnabled) return

    this.lastPrompt = {
      text: prompt,
      timestamp: new Date().toISOString(),
    }

    this.promptHistory.push(this.lastPrompt)

    // Keep only last 10 prompts
    if (this.promptHistory.length > 10) {
      this.promptHistory.shift()
    }

    console.log(`[ArchitectAI] Intercepted prompt: ${prompt.slice(0, 50)}...`)
  }

  // Handle when we receive a response to a prompt
  handlePromptResponse(response) {
    if (!this.lastPrompt) return

    const promptData = {
      prompt: this.lastPrompt.text,
      response: response.slice(0, 2000), // Limit response size
      source: this.name,
      url: window.location.href,
      metadata: {
        workspace: this.getWorkspaceInfo(),
        file: this.getCurrentFile(),
        timestamp: this.lastPrompt.timestamp,
      },
    }

    // Send to background for saving
    chrome.runtime.sendMessage({
      action: 'interceptPrompt',
      data: promptData,
    })

    console.log(`[ArchitectAI] Logged prompt-response pair to project`)

    // Clear last prompt after processing
    this.lastPrompt = null
  }

  // Manually log a prompt (e.g., from copy action)
  logPrompt(prompt, taskId = null) {
    chrome.runtime.sendMessage({
      action: 'interceptPrompt',
      data: {
        prompt,
        source: 'manual_copy',
        url: window.location.href,
        metadata: {
          taskId,
          workspace: this.getWorkspaceInfo(),
        },
      },
    })
  }

  // Set up capture button and selection handling
  setupCapture() {
    this.createCaptureButton()
    document.addEventListener('mouseup', this.handleMouseUp.bind(this))
    document.addEventListener('mousedown', this.handleMouseDown.bind(this))
    document.addEventListener('keydown', this.handleKeyDown.bind(this))
  }

  // Create the floating capture button
  createCaptureButton() {
    if (this.captureButton) return

    const button = document.createElement('div')
    button.id = 'architectai-capture-btn'
    button.className = 'architectai-capture-btn'
    button.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      <span>ArchitectAI</span>
    `
    button.style.cssText = `
      display: none;
      position: fixed;
      z-index: 2147483647;
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      color: white;
      padding: 6px 10px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
      display: none;
      align-items: center;
      gap: 5px;
      transition: transform 0.15s, opacity 0.15s;
      user-select: none;
    `

    button.addEventListener('click', () => this.captureSelection())
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.05)'
    })
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)'
    })

    document.body.appendChild(button)
    this.captureButton = button
  }

  // Show capture button near selection
  showCaptureButton(x, y) {
    if (!this.captureButton) return
    this.captureButton.style.display = 'flex'
    this.captureButton.style.left = `${Math.min(x, window.innerWidth - 120)}px`
    this.captureButton.style.top = `${Math.max(y - 35, 10)}px`
  }

  // Hide capture button
  hideCaptureButton() {
    if (!this.captureButton) return
    this.captureButton.style.display = 'none'
  }

  // Handle mouse up - check for selection
  handleMouseUp(e) {
    setTimeout(() => {
      const selectedText = this.getSelectedCode()
      if (selectedText && selectedText.length > 5) {
        this.showCaptureButton(e.clientX, e.clientY)
      } else {
        this.hideCaptureButton()
      }
    }, 10)
  }

  // Handle mouse down - hide button if clicking elsewhere
  handleMouseDown(e) {
    if (this.captureButton && !this.captureButton.contains(e.target)) {
      this.hideCaptureButton()
    }
  }

  // Handle keyboard shortcut
  handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
      e.preventDefault()
      this.captureSelection()
    }
  }

  // Capture the current selection
  captureSelection() {
    const selectedText = this.getSelectedCode()
    if (!selectedText) {
      this.hideCaptureButton()
      return
    }

    const workspace = this.getWorkspaceInfo()
    const file = this.getCurrentFile()
    const conversations = this.getConversations()

    const captureData = {
      text: selectedText,
      title: this.generateTitle(selectedText),
      body: selectedText,
      platform: this.name,
      source: this.name,
      url: window.location.href,
      workspace,
      file,
      conversations: conversations.slice(0, 5), // Last 5 conversations
      capturedAt: new Date().toISOString(),
    }

    // Send to background script
    chrome.runtime.sendMessage({
      action: 'captureContext',
      data: captureData,
    })

    this.showFeedback()
    this.hideCaptureButton()
    window.getSelection()?.removeAllRanges()
  }

  // Generate a title from text
  generateTitle(text) {
    const firstLine = text.split('\n')[0].trim()
    return firstLine.length <= 60 ? firstLine : firstLine.slice(0, 57) + '...'
  }

  // Show capture feedback
  showFeedback() {
    const feedback = document.createElement('div')
    feedback.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>Captured! Open extension to send.</span>
    `
    feedback.style.cssText = `
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 2147483647;
      background: #0f1018;
      color: #34d399;
      padding: 10px 14px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      gap: 6px;
      border: 1px solid rgba(52, 211, 153, 0.3);
      animation: architectai-slide-in 0.25s ease-out;
    `

    // Add animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes architectai-slide-in {
        from { transform: translateY(16px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `
    document.head.appendChild(style)
    document.body.appendChild(feedback)

    setTimeout(() => {
      feedback.style.opacity = '0'
      feedback.style.transform = 'translateY(16px)'
      feedback.style.transition = 'all 0.2s ease-out'
      setTimeout(() => feedback.remove(), 200)
    }, 2000)
  }

  // Set up mutation observers for dynamic content
  setupObservers() {
    // Override in subclass for platform-specific observers
  }

  // Clean up
  destroy() {
    this.observers.forEach(obs => obs.disconnect())
    this.captureButton?.remove()
    this.isActive = false
  }
}
