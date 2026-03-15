/**
 * ArchitectAI Content Script
 * Main entry point that loads platform-specific integrations
 */

import { CursorPlatform } from './platforms/cursor.js'
import { LovablePlatform } from './platforms/lovable.js'
import { BoltPlatform } from './platforms/bolt.js'
import { ReplitPlatform } from './platforms/replit.js'
import { BasePlatform } from './platforms/base.js'

// All supported platforms
const PLATFORMS = [
  CursorPlatform,
  LovablePlatform,
  BoltPlatform,
  ReplitPlatform,
]

// Active platform instance
let activePlatform = null

/**
 * Initialize the content script
 * Detects which platform we're on and loads the appropriate integration
 */
function initialize() {
  // Try each platform to find which one we're on
  for (const PlatformClass of PLATFORMS) {
    const platform = new PlatformClass()
    if (platform.detect()) {
      activePlatform = platform
      break
    }
  }

  // If no specific platform detected, use base functionality
  if (!activePlatform) {
    activePlatform = new BasePlatform('Generic')
    activePlatform.detect = () => true // Force active
  }

  // Initialize the platform
  activePlatform.init()

  // Log for debugging
  console.log(`[ArchitectAI] Initialized on ${activePlatform.name}`)

  // Set up message listener for communication with popup/background
  setupMessageListener()
}

/**
 * Set up message listener for communication with extension
 */
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'getPageInfo':
        sendResponse({
          platform: activePlatform?.name || 'Unknown',
          workspace: activePlatform?.getWorkspaceInfo() || null,
          file: activePlatform?.getCurrentFile() || null,
          url: window.location.href,
        })
        break

      case 'getConversations':
        sendResponse({
          conversations: activePlatform?.getConversations() || [],
        })
        break

      case 'getSelectedCode':
        sendResponse({
          code: activePlatform?.getSelectedCode() || '',
        })
        break

      case 'captureCurrentContext':
        const workspace = activePlatform?.getWorkspaceInfo()
        const file = activePlatform?.getCurrentFile()
        const conversations = activePlatform?.getConversations()
        const selectedCode = activePlatform?.getSelectedCode()

        const context = {
          platform: activePlatform?.name,
          workspace,
          file,
          conversations,
          selectedCode,
          url: window.location.href,
          capturedAt: new Date().toISOString(),
        }

        // Send to background for storage
        chrome.runtime.sendMessage({
          action: 'captureContext',
          data: context,
        })

        sendResponse({ success: true, context })
        break

      case 'ping':
        sendResponse({ active: true, platform: activePlatform?.name })
        break

      default:
        sendResponse({ error: 'Unknown action' })
    }

    return true // Keep channel open for async response
  })
}

/**
 * Handle cleanup when navigating away
 */
function cleanup() {
  if (activePlatform) {
    activePlatform.destroy()
    activePlatform = null
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize)
} else {
  initialize()
}

// Clean up on page unload
window.addEventListener('beforeunload', cleanup)

// Re-initialize on SPA navigation (for platforms that use client-side routing)
let lastUrl = window.location.href
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href
    console.log('[ArchitectAI] URL changed, re-initializing...')
    cleanup()
    setTimeout(initialize, 500) // Delay to let new page render
  }
})

urlObserver.observe(document.body, {
  childList: true,
  subtree: true,
})
