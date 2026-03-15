/**
 * ArchitectAI Content Script Bundle
 * Auto-generated - combines all platform integrations with prompt interception
 */

(function() {
  'use strict';

  // ============================================
  // Base Platform Class
  // ============================================

  class BasePlatform {
    constructor(name) {
      this.name = name;
      this.isActive = false;
      this.captureButton = null;
      this.observers = [];
      this.promptHistory = [];
      this.lastPrompt = null;
      this.interceptEnabled = true;
    }

    detect() {
      return false;
    }

    getWorkspaceInfo() {
      return {
        name: document.title,
        url: window.location.href,
        platform: this.name,
      };
    }

    getCurrentFile() {
      return null;
    }

    getConversations() {
      return [];
    }

    getSelectedCode() {
      const selection = window.getSelection();
      return selection ? selection.toString().trim() : '';
    }

    init() {
      if (!this.detect()) {
        return false;
      }

      this.isActive = true;
      this.setupCapture();
      this.setupObservers();
      this.setupPromptInterception();
      console.log(`[ArchitectAI] ${this.name} integration initialized`);
      return true;
    }

    setupPromptInterception() {
      this.setupInputMonitoring();
      this.setupResponseMonitoring();
    }

    getChatInputSelector() {
      return 'textarea[placeholder*="message"], textarea[placeholder*="prompt"], input[type="text"][placeholder*="Ask"]';
    }

    getSubmitButtonSelector() {
      return 'button[type="submit"], button[aria-label*="Send"], button[aria-label*="Submit"]';
    }

    getResponseSelector() {
      return '[class*="response"], [class*="assistant"], [class*="ai-message"]';
    }

    setupInputMonitoring() {
      const self = this;
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          const input = self.findChatInput();
          if (input && document.activeElement === input) {
            const prompt = input.value || input.textContent;
            if (prompt && prompt.trim().length > 10) {
              self.interceptPrompt(prompt.trim());
            }
          }
        }
      }, true);

      document.addEventListener('click', (e) => {
        const button = e.target.closest(self.getSubmitButtonSelector());
        if (button) {
          const input = self.findChatInput();
          if (input) {
            const prompt = input.value || input.textContent;
            if (prompt && prompt.trim().length > 10) {
              self.interceptPrompt(prompt.trim());
            }
          }
        }
      }, true);
    }

    findChatInput() {
      const selectors = [
        this.getChatInputSelector(),
        'textarea',
        '[contenteditable="true"]',
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          if (el.offsetParent !== null) {
            const value = el.value || el.textContent;
            if (value && value.trim().length > 0) {
              return el;
            }
          }
        }
      }
      return null;
    }

    setupResponseMonitoring() {
      const self = this;
      const observer = new MutationObserver((mutations) => {
        if (!self.lastPrompt) return;

        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            const response = self.extractResponse(mutation.addedNodes);
            if (response && response.length > 50) {
              self.handlePromptResponse(response);
            }
          }
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      this.observers.push(observer);
    }

    extractResponse(nodes) {
      for (const node of nodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        const responseEl = node.matches && node.matches(this.getResponseSelector())
          ? node
          : node.querySelector && node.querySelector(this.getResponseSelector());

        if (responseEl) {
          return responseEl.textContent ? responseEl.textContent.trim() : '';
        }

        const codeBlock = node.querySelector && node.querySelector('pre code, [class*="code"]');
        if (codeBlock) {
          return codeBlock.textContent ? codeBlock.textContent.trim() : '';
        }
      }
      return null;
    }

    interceptPrompt(prompt) {
      if (!this.interceptEnabled) return;

      this.lastPrompt = {
        text: prompt,
        timestamp: new Date().toISOString(),
      };

      this.promptHistory.push(this.lastPrompt);

      if (this.promptHistory.length > 10) {
        this.promptHistory.shift();
      }

      console.log(`[ArchitectAI] Intercepted prompt: ${prompt.slice(0, 50)}...`);
    }

    handlePromptResponse(response) {
      if (!this.lastPrompt) return;

      const promptData = {
        prompt: this.lastPrompt.text,
        response: response.slice(0, 2000),
        source: this.name,
        url: window.location.href,
        metadata: {
          workspace: this.getWorkspaceInfo(),
          file: this.getCurrentFile(),
          timestamp: this.lastPrompt.timestamp,
        },
      };

      chrome.runtime.sendMessage({
        action: 'interceptPrompt',
        data: promptData,
      });

      console.log(`[ArchitectAI] Logged prompt-response pair to project`);
      this.lastPrompt = null;
    }

    logPrompt(prompt, taskId) {
      chrome.runtime.sendMessage({
        action: 'interceptPrompt',
        data: {
          prompt: prompt,
          source: 'manual_copy',
          url: window.location.href,
          metadata: {
            taskId: taskId,
            workspace: this.getWorkspaceInfo(),
          },
        },
      });
    }

    setupCapture() {
      this.createCaptureButton();
      document.addEventListener('mouseup', this.handleMouseUp.bind(this));
      document.addEventListener('mousedown', this.handleMouseDown.bind(this));
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    createCaptureButton() {
      if (this.captureButton) return;

      const button = document.createElement('div');
      button.id = 'architectai-capture-btn';
      button.className = 'architectai-capture-btn';
      button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span>ArchitectAI</span>
      `;
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
        align-items: center;
        gap: 5px;
        transition: transform 0.15s, opacity 0.15s;
        user-select: none;
      `;

      const self = this;
      button.addEventListener('click', () => self.captureSelection());
      button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.05)';
      });
      button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
      });

      document.body.appendChild(button);
      this.captureButton = button;
    }

    showCaptureButton(x, y) {
      if (!this.captureButton) return;
      this.captureButton.style.display = 'flex';
      this.captureButton.style.left = Math.min(x, window.innerWidth - 120) + 'px';
      this.captureButton.style.top = Math.max(y - 35, 10) + 'px';
    }

    hideCaptureButton() {
      if (!this.captureButton) return;
      this.captureButton.style.display = 'none';
    }

    handleMouseUp(e) {
      const self = this;
      setTimeout(() => {
        const selectedText = self.getSelectedCode();
        if (selectedText && selectedText.length > 5) {
          self.showCaptureButton(e.clientX, e.clientY);
        } else {
          self.hideCaptureButton();
        }
      }, 10);
    }

    handleMouseDown(e) {
      if (this.captureButton && !this.captureButton.contains(e.target)) {
        this.hideCaptureButton();
      }
    }

    handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        this.captureSelection();
      }
    }

    captureSelection() {
      const selectedText = this.getSelectedCode();
      if (!selectedText) {
        this.hideCaptureButton();
        return;
      }

      const workspace = this.getWorkspaceInfo();
      const file = this.getCurrentFile();
      const conversations = this.getConversations();

      const captureData = {
        text: selectedText,
        title: this.generateTitle(selectedText),
        body: selectedText,
        platform: this.name,
        source: this.name,
        url: window.location.href,
        workspace: workspace,
        file: file,
        conversations: conversations.slice(0, 5),
        capturedAt: new Date().toISOString(),
      };

      chrome.runtime.sendMessage({
        action: 'captureContext',
        data: captureData,
      });

      this.showFeedback();
      this.hideCaptureButton();
      if (window.getSelection()) {
        window.getSelection().removeAllRanges();
      }
    }

    generateTitle(text) {
      const firstLine = text.split('\n')[0].trim();
      return firstLine.length <= 60 ? firstLine : firstLine.slice(0, 57) + '...';
    }

    showFeedback() {
      const feedback = document.createElement('div');
      feedback.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>Captured! Open extension to send.</span>
      `;
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
      `;

      const style = document.createElement('style');
      style.textContent = `
        @keyframes architectai-slide-in {
          from { transform: translateY(16px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(feedback);

      setTimeout(() => {
        feedback.style.opacity = '0';
        feedback.style.transform = 'translateY(16px)';
        feedback.style.transition = 'all 0.2s ease-out';
        setTimeout(() => feedback.remove(), 200);
      }, 2000);
    }

    setupObservers() {
      // Override in subclass
    }

    destroy() {
      this.observers.forEach(obs => obs.disconnect());
      if (this.captureButton) {
        this.captureButton.remove();
      }
      this.isActive = false;
    }
  }

  // ============================================
  // Cursor Platform
  // ============================================

  class CursorPlatform extends BasePlatform {
    constructor() {
      super('Cursor');
      this.lastDetectedFile = null;
    }

    detect() {
      const hostname = window.location.hostname;
      return hostname.includes('cursor.sh') || hostname.includes('cursor.so');
    }

    getWorkspaceInfo() {
      const info = {
        name: 'Cursor Workspace',
        url: window.location.href,
        platform: 'Cursor',
        projectName: null,
        branch: null,
      };

      const title = document.title;
      if (title && title !== 'Cursor') {
        const parts = title.split(' - ');
        if (parts.length >= 2) {
          info.projectName = parts[parts.length - 2];
        }
      }

      const workspaceEl = document.querySelector('[data-testid="workspace-name"]') ||
                          document.querySelector('.workspace-name') ||
                          document.querySelector('[class*="workspace"] [class*="title"]');
      if (workspaceEl) {
        info.projectName = workspaceEl.textContent ? workspaceEl.textContent.trim() : null;
      }

      const branchEl = document.querySelector('[data-testid="branch-name"]') ||
                       document.querySelector('[class*="branch"]') ||
                       document.querySelector('[class*="git"] [class*="name"]');
      if (branchEl) {
        info.branch = branchEl.textContent ? branchEl.textContent.trim() : null;
      }

      info.name = info.projectName || 'Cursor Workspace';
      return info;
    }

    getCurrentFile() {
      const file = {
        name: null,
        path: null,
        language: null,
        content: null,
      };

      const activeTab = document.querySelector('[data-testid="tab-active"]') ||
                        document.querySelector('.tab.active') ||
                        document.querySelector('[class*="tab"][class*="active"]') ||
                        document.querySelector('[aria-selected="true"][role="tab"]');

      if (activeTab) {
        file.name = activeTab.textContent ? activeTab.textContent.trim() : null;
        file.path = activeTab.getAttribute('data-path') || activeTab.getAttribute('title') || file.name;
      }

      if (!file.name) {
        const title = document.title;
        if (title && title !== 'Cursor') {
          const parts = title.split(' - ');
          if (parts.length > 0) {
            file.name = parts[0].trim();
          }
        }
      }

      if (file.name) {
        const ext = file.name.split('.').pop();
        if (ext) {
          file.language = this.getLanguageFromExtension(ext.toLowerCase());
        }
      }

      this.lastDetectedFile = file;
      return file;
    }

    getConversations() {
      const conversations = [];

      const chatContainers = [
        '[data-testid="ai-chat"]',
        '[class*="chat-container"]',
        '[class*="ai-panel"]',
        '[class*="composer"]',
        '.chat-messages',
      ];

      let chatContainer = null;
      for (const selector of chatContainers) {
        chatContainer = document.querySelector(selector);
        if (chatContainer) break;
      }

      if (!chatContainer) return conversations;

      const messageSelectors = [
        '[data-testid="chat-message"]',
        '[class*="message"]',
        '[class*="chat-item"]',
      ];

      let messages = [];
      for (const selector of messageSelectors) {
        messages = chatContainer.querySelectorAll(selector);
        if (messages.length > 0) break;
      }

      messages.forEach(msg => {
        const isUser = msg.classList.contains('user') ||
                       msg.getAttribute('data-role') === 'user' ||
                       msg.querySelector('[class*="user"]');

        const content = msg.textContent ? msg.textContent.trim() : '';
        if (content) {
          conversations.push({
            role: isUser ? 'user' : 'assistant',
            content: content.slice(0, 1000),
            timestamp: new Date().toISOString(),
          });
        }
      });

      return conversations.slice(-10);
    }

    getSelectedCode() {
      const selection = window.getSelection();
      let selectedText = selection ? selection.toString().trim() : '';

      if (!selectedText) {
        const monacoEditor = document.querySelector('.monaco-editor');
        if (monacoEditor) {
          const selectedLines = monacoEditor.querySelectorAll('.selected-text, .view-line.selected');
          if (selectedLines.length > 0) {
            selectedText = Array.from(selectedLines)
              .map(line => line.textContent)
              .join('\n')
              .trim();
          }
        }
      }

      return selectedText;
    }

    getLanguageFromExtension(ext) {
      const langMap = {
        js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
        py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
        cpp: 'cpp', c: 'c', cs: 'csharp', php: 'php', swift: 'swift',
        kt: 'kotlin', sql: 'sql', html: 'html', css: 'css', scss: 'scss',
        json: 'json', yaml: 'yaml', yml: 'yaml', md: 'markdown', sh: 'bash', bash: 'bash',
      };
      return langMap[ext] || ext || 'text';
    }

    getChatInputSelector() {
      return '[data-testid="chat-input"], [class*="chat-input"], [class*="composer"] textarea, [class*="ai-input"]';
    }

    getSubmitButtonSelector() {
      return '[data-testid="chat-submit"], [class*="chat-send"], [class*="submit-button"], [aria-label*="Send"]';
    }

    getResponseSelector() {
      return '[data-testid="assistant-message"], [data-role="assistant"], [class*="assistant"], [class*="ai-response"]';
    }

    setupObservers() {
      const self = this;
      const chatObserver = new MutationObserver(() => {});

      const chatPanel = document.querySelector('[class*="chat"], [class*="ai-panel"]');
      if (chatPanel) {
        chatObserver.observe(chatPanel, { childList: true, subtree: true });
        this.observers.push(chatObserver);
      }

      const tabObserver = new MutationObserver(() => { self.getCurrentFile(); });
      const tabContainer = document.querySelector('[class*="tabs"], [role="tablist"]');
      if (tabContainer) {
        tabObserver.observe(tabContainer, {
          childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-selected'],
        });
        this.observers.push(tabObserver);
      }
    }
  }

  // ============================================
  // Lovable Platform
  // ============================================

  class LovablePlatform extends BasePlatform {
    constructor() {
      super('Lovable');
    }

    detect() {
      const hostname = window.location.hostname;
      return hostname.includes('lovable.dev') || hostname.includes('lovable.app');
    }

    getWorkspaceInfo() {
      const info = {
        name: 'Lovable Project',
        url: window.location.href,
        platform: 'Lovable',
        projectId: null,
        projectName: null,
      };

      const urlMatch = window.location.pathname.match(/\/projects?\/([^/]+)/);
      if (urlMatch) {
        info.projectId = urlMatch[1];
      }

      const projectNameEl = document.querySelector('[data-testid="project-name"]') ||
                            document.querySelector('.project-name') ||
                            document.querySelector('h1') ||
                            document.querySelector('[class*="project-title"]');

      if (projectNameEl) {
        info.projectName = projectNameEl.textContent ? projectNameEl.textContent.trim() : null;
      }

      if (!info.projectName) {
        const title = document.title;
        if (title) {
          info.projectName = title.replace(' | Lovable', '').replace(' - Lovable', '').trim();
        }
      }

      info.name = info.projectName || 'Lovable Project';
      return info;
    }

    getCurrentFile() {
      const file = {
        name: null,
        path: null,
        type: 'component',
        language: 'typescript',
      };

      const activeFile = document.querySelector('[data-testid="file-active"]') ||
                         document.querySelector('.file-tree-item.active') ||
                         document.querySelector('[class*="file"][class*="selected"]') ||
                         document.querySelector('[aria-selected="true"][role="treeitem"]');

      if (activeFile) {
        file.name = activeFile.textContent ? activeFile.textContent.trim() : null;
        file.path = activeFile.getAttribute('data-path') || file.name;
      }

      return file;
    }

    getConversations() {
      const conversations = [];

      const chatSelectors = [
        '[data-testid="chat-panel"]',
        '[class*="chat-container"]',
        '[class*="ai-chat"]',
        '.messages-container',
        '[class*="conversation"]',
      ];

      let chatContainer = null;
      for (const selector of chatSelectors) {
        chatContainer = document.querySelector(selector);
        if (chatContainer) break;
      }

      if (!chatContainer) return conversations;

      const messages = chatContainer.querySelectorAll(
        '[data-testid="message"], [class*="message"], [class*="chat-bubble"]'
      );

      messages.forEach(msg => {
        const isUser = msg.classList.contains('user') ||
                       msg.getAttribute('data-sender') === 'user' ||
                       msg.querySelector('[class*="user-avatar"]') ||
                       msg.closest('[class*="user-message"]');

        const contentEl = msg.querySelector('[class*="content"]') || msg.querySelector('p') || msg;
        const content = contentEl.textContent ? contentEl.textContent.trim() : '';
        if (content) {
          conversations.push({
            role: isUser ? 'user' : 'assistant',
            content: content.slice(0, 1500),
            timestamp: new Date().toISOString(),
          });
        }
      });

      return conversations.slice(-10);
    }

    getSelectedCode() {
      const selection = window.getSelection();
      let selectedText = selection ? selection.toString().trim() : '';

      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;

        const codeBlock = container.nodeType === Node.ELEMENT_NODE
          ? container.closest('pre, code, [class*="code-block"]')
          : (container.parentElement ? container.parentElement.closest('pre, code, [class*="code-block"]') : null);

        if (codeBlock && !selectedText) {
          selectedText = codeBlock.textContent ? codeBlock.textContent.trim() : '';
        }
      }

      return selectedText;
    }

    setupObservers() {
      const chatObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const isAssistant = (node.classList && node.classList.contains('assistant')) ||
                                    (node.querySelector && node.querySelector('[class*="assistant"]'));
                if (isAssistant) {
                  console.log('[ArchitectAI] New Lovable response detected');
                }
              }
            });
          }
        });
      });

      const chatContainer = document.querySelector('[class*="chat"], [class*="conversation"]');
      if (chatContainer) {
        chatObserver.observe(chatContainer, { childList: true, subtree: true });
        this.observers.push(chatObserver);
      }
    }
  }

  // ============================================
  // Bolt Platform
  // ============================================

  class BoltPlatform extends BasePlatform {
    constructor() {
      super('Bolt');
    }

    detect() {
      const hostname = window.location.hostname;
      return hostname.includes('bolt.new') || hostname.includes('bolt.diy');
    }

    getWorkspaceInfo() {
      const info = {
        name: 'Bolt Project',
        url: window.location.href,
        platform: 'Bolt',
        projectId: null,
        template: null,
      };

      const urlMatch = window.location.pathname.match(/\/([^/]+)$/);
      if (urlMatch && urlMatch[1] !== '' && urlMatch[1] !== 'new') {
        info.projectId = urlMatch[1];
      }

      const headerEl = document.querySelector('[class*="project-name"]') ||
                       document.querySelector('.header h1') ||
                       document.querySelector('[class*="workspace-title"]');

      if (headerEl) {
        info.name = headerEl.textContent ? headerEl.textContent.trim() : info.name;
      }

      const templateMatch = window.location.search.match(/template=([^&]+)/);
      if (templateMatch) {
        info.template = templateMatch[1];
      }

      return info;
    }

    getCurrentFile() {
      const file = {
        name: null,
        path: null,
        language: null,
      };

      const activeFile = document.querySelector('[data-testid="file-selected"]') ||
                         document.querySelector('.file-tree [class*="active"]') ||
                         document.querySelector('[class*="file-item"][class*="selected"]') ||
                         document.querySelector('[aria-current="true"]');

      if (activeFile) {
        file.name = activeFile.textContent ? activeFile.textContent.trim() : null;
        file.path = activeFile.getAttribute('data-path') || file.name;
      }

      if (file.name) {
        const ext = file.name.split('.').pop();
        if (ext) {
          file.language = this.getLanguageFromExtension(ext.toLowerCase());
        }
      }

      return file;
    }

    getConversations() {
      const conversations = [];

      const chatSelectors = [
        '[data-testid="chat"]',
        '[class*="chat-panel"]',
        '[class*="ai-messages"]',
        '.prompt-container',
        '[class*="conversation"]',
      ];

      let chatContainer = null;
      for (const selector of chatSelectors) {
        chatContainer = document.querySelector(selector);
        if (chatContainer) break;
      }

      if (!chatContainer) return conversations;

      const messageSelectors = [
        '[class*="message"]',
        '[class*="prompt-item"]',
        '[class*="response"]',
        '[data-role]',
      ];

      let messages = null;
      for (const selector of messageSelectors) {
        messages = chatContainer.querySelectorAll(selector);
        if (messages.length > 0) break;
      }

      if (messages) {
        messages.forEach(msg => {
          const role = msg.getAttribute('data-role');
          const isUser = role === 'user' ||
                         msg.classList.contains('user') ||
                         msg.classList.contains('prompt') ||
                         msg.querySelector('[class*="user"]');

          const content = msg.textContent ? msg.textContent.trim() : '';
          if (content && content.length > 0) {
            conversations.push({
              role: isUser ? 'user' : 'assistant',
              content: content.slice(0, 2000),
              timestamp: new Date().toISOString(),
            });
          }
        });
      }

      return conversations.slice(-10);
    }

    getSelectedCode() {
      const selection = window.getSelection();
      let selectedText = selection ? selection.toString().trim() : '';

      if (!selectedText) {
        const editorEl = document.querySelector('.cm-editor, .monaco-editor');
        if (editorEl) {
          const cmSelection = editorEl.querySelector('.cm-selectionBackground');
          if (cmSelection) {
            const selectionLines = editorEl.querySelectorAll('.cm-line.cm-activeLine, .cm-selectionMatch');
            selectedText = Array.from(selectionLines)
              .map(line => line.textContent)
              .join('\n')
              .trim();
          }
        }
      }

      return selectedText;
    }

    getLanguageFromExtension(ext) {
      const langMap = {
        js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
        vue: 'vue', svelte: 'svelte', py: 'python', html: 'html',
        css: 'css', scss: 'scss', json: 'json', md: 'markdown',
      };
      return langMap[ext] || ext || 'text';
    }

    setupObservers() {
      const self = this;
      const responseObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const isResponse = (node.classList && node.classList.contains('response')) ||
                                   (node.querySelector && node.querySelector('[class*="response"]')) ||
                                   (node.getAttribute && node.getAttribute('data-role') === 'assistant');
                if (isResponse) {
                  console.log('[ArchitectAI] New Bolt response detected');
                }
              }
            });
          }
        });
      });

      const chatArea = document.querySelector('[class*="chat"], [class*="prompt"]');
      if (chatArea) {
        responseObserver.observe(chatArea, { childList: true, subtree: true });
        this.observers.push(responseObserver);
      }

      const fileTreeObserver = new MutationObserver(() => { self.getCurrentFile(); });
      const fileTree = document.querySelector('[class*="file-tree"], [class*="explorer"]');
      if (fileTree) {
        fileTreeObserver.observe(fileTree, {
          childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-selected'],
        });
        this.observers.push(fileTreeObserver);
      }
    }
  }

  // ============================================
  // Replit Platform
  // ============================================

  class ReplitPlatform extends BasePlatform {
    constructor() {
      super('Replit');
    }

    detect() {
      const hostname = window.location.hostname;
      return hostname.includes('replit.com') || hostname.includes('repl.it');
    }

    getWorkspaceInfo() {
      const info = {
        name: 'Replit Project',
        url: window.location.href,
        platform: 'Replit',
        replId: null,
        owner: null,
        replName: null,
        language: null,
      };

      const pathMatch = window.location.pathname.match(/\/@([^/]+)\/([^/]+)/);
      if (pathMatch) {
        info.owner = pathMatch[1];
        info.replName = pathMatch[2];
        info.name = info.owner + '/' + info.replName;
      }

      const replTitle = document.querySelector('[data-testid="repl-title"]') ||
                        document.querySelector('.repl-title') ||
                        document.querySelector('[class*="workspace-name"]') ||
                        document.querySelector('h1.title');

      if (replTitle) {
        const titleText = replTitle.textContent ? replTitle.textContent.trim() : null;
        if (titleText) {
          info.replName = titleText;
          info.name = titleText;
        }
      }

      const langBadge = document.querySelector('[data-testid="language-badge"]') ||
                        document.querySelector('[class*="language"]') ||
                        document.querySelector('.repl-language');

      if (langBadge) {
        info.language = langBadge.textContent ? langBadge.textContent.trim().toLowerCase() : null;
      }

      return info;
    }

    getCurrentFile() {
      const file = {
        name: null,
        path: null,
        language: null,
      };

      const activeTab = document.querySelector('[data-testid="file-tab-active"]') ||
                        document.querySelector('.file-tab.active') ||
                        document.querySelector('[class*="tab"][aria-selected="true"]') ||
                        document.querySelector('.editor-tabs .selected');

      if (activeTab) {
        file.name = activeTab.textContent ? activeTab.textContent.trim() : null;
        if (file.name) {
          file.name = file.name.replace(/[×✕]$/, '').trim();
        }
      }

      const activeFile = document.querySelector('[data-testid="file-active"]') ||
                         document.querySelector('.filetree-node.selected') ||
                         document.querySelector('[class*="file-tree"] [aria-selected="true"]');

      if (activeFile && !file.name) {
        file.name = activeFile.textContent ? activeFile.textContent.trim() : null;
      }

      if (activeFile) {
        file.path = activeFile.getAttribute('data-path') ||
                    activeFile.getAttribute('title') ||
                    file.name;
      }

      if (file.name) {
        const ext = file.name.split('.').pop();
        if (ext) {
          file.language = this.getLanguageFromExtension(ext.toLowerCase());
        }
      }

      return file;
    }

    getConversations() {
      const conversations = [];

      const aiPanelSelectors = [
        '[data-testid="ai-panel"]',
        '[class*="ghostwriter"]',
        '[class*="ai-chat"]',
        '[class*="assistant-panel"]',
        '.chat-container',
      ];

      let aiPanel = null;
      for (const selector of aiPanelSelectors) {
        aiPanel = document.querySelector(selector);
        if (aiPanel) break;
      }

      if (!aiPanel) return conversations;

      const messages = aiPanel.querySelectorAll(
        '[data-testid="ai-message"], [class*="message"], [class*="chat-item"]'
      );

      messages.forEach(msg => {
        const isUser = msg.classList.contains('user') ||
                       msg.getAttribute('data-sender') === 'user' ||
                       msg.getAttribute('data-role') === 'user' ||
                       msg.querySelector('[class*="user-avatar"]');

        const content = msg.textContent ? msg.textContent.trim() : '';
        if (content && content.length > 0) {
          conversations.push({
            role: isUser ? 'user' : 'assistant',
            content: content.slice(0, 2000),
            timestamp: new Date().toISOString(),
          });
        }
      });

      return conversations.slice(-10);
    }

    getSelectedCode() {
      const selection = window.getSelection();
      let selectedText = selection ? selection.toString().trim() : '';

      if (!selectedText) {
        const consoleEl = document.querySelector('[class*="console"], [class*="terminal"]');
        if (consoleEl && consoleEl.contains(document.activeElement)) {
          selectedText = selection ? selection.toString().trim() : '';
        }
      }

      return selectedText;
    }

    getLanguageFromExtension(ext) {
      const langMap = {
        js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
        py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
        c: 'c', cpp: 'cpp', cs: 'csharp', php: 'php', swift: 'swift',
        kt: 'kotlin', scala: 'scala', r: 'r', lua: 'lua', html: 'html',
        css: 'css', sql: 'sql', sh: 'bash', nix: 'nix',
      };
      return langMap[ext] || ext || 'text';
    }

    setupObservers() {
      const self = this;
      const aiObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const isAIResponse = (node.getAttribute && node.getAttribute('data-role') === 'assistant') ||
                                     (node.classList && node.classList.contains('assistant')) ||
                                     (node.querySelector && node.querySelector('[class*="assistant"]'));
                if (isAIResponse) {
                  console.log('[ArchitectAI] New Replit AI response detected');
                }
              }
            });
          }
        });
      });

      const aiPanel = document.querySelector('[class*="ai-panel"], [class*="ghostwriter"]');
      if (aiPanel) {
        aiObserver.observe(aiPanel, { childList: true, subtree: true });
        this.observers.push(aiObserver);
      }

      const fileObserver = new MutationObserver(() => { self.getCurrentFile(); });
      const fileTree = document.querySelector('[class*="filetree"], [class*="file-tree"]');
      if (fileTree) {
        fileObserver.observe(fileTree, {
          childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-selected'],
        });
        this.observers.push(fileObserver);
      }
    }
  }

  // ============================================
  // Main Content Script
  // ============================================

  const PLATFORMS = [
    CursorPlatform,
    LovablePlatform,
    BoltPlatform,
    ReplitPlatform,
  ];

  let activePlatform = null;

  function initialize() {
    for (let i = 0; i < PLATFORMS.length; i++) {
      const PlatformClass = PLATFORMS[i];
      const platform = new PlatformClass();
      if (platform.detect()) {
        activePlatform = platform;
        break;
      }
    }

    if (!activePlatform) {
      activePlatform = new BasePlatform('Generic');
      activePlatform.detect = function() { return true; };
    }

    activePlatform.init();
    console.log('[ArchitectAI] Initialized on ' + activePlatform.name);
    setupMessageListener();
  }

  function setupMessageListener() {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      switch (request.action) {
        case 'getPageInfo':
          sendResponse({
            platform: activePlatform ? activePlatform.name : 'Unknown',
            workspace: activePlatform ? activePlatform.getWorkspaceInfo() : null,
            file: activePlatform ? activePlatform.getCurrentFile() : null,
            url: window.location.href,
          });
          break;

        case 'getConversations':
          sendResponse({
            conversations: activePlatform ? activePlatform.getConversations() : [],
          });
          break;

        case 'getSelectedCode':
          sendResponse({
            code: activePlatform ? activePlatform.getSelectedCode() : '',
          });
          break;

        case 'captureCurrentContext':
          var workspace = activePlatform ? activePlatform.getWorkspaceInfo() : null;
          var file = activePlatform ? activePlatform.getCurrentFile() : null;
          var conversations = activePlatform ? activePlatform.getConversations() : [];
          var selectedCode = activePlatform ? activePlatform.getSelectedCode() : '';

          var context = {
            platform: activePlatform ? activePlatform.name : 'Unknown',
            workspace: workspace,
            file: file,
            conversations: conversations,
            selectedCode: selectedCode,
            url: window.location.href,
            capturedAt: new Date().toISOString(),
          };

          chrome.runtime.sendMessage({
            action: 'captureContext',
            data: context,
          });

          sendResponse({ success: true, context: context });
          break;

        case 'ping':
          sendResponse({ active: true, platform: activePlatform ? activePlatform.name : null });
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }

      return true;
    });
  }

  function cleanup() {
    if (activePlatform) {
      activePlatform.destroy();
      activePlatform = null;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  window.addEventListener('beforeunload', cleanup);

  var lastUrl = window.location.href;
  var urlObserver = new MutationObserver(function() {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log('[ArchitectAI] URL changed, re-initializing...');
      cleanup();
      setTimeout(initialize, 500);
    }
  });

  urlObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

})();
