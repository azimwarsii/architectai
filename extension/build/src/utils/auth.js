import { CONFIG } from './config.js'

/**
 * Authentication utilities for the ArchitectAI extension
 * Handles OAuth flow and token storage using Chrome's identity API
 */

// Store tokens in Chrome extension storage
export async function storeTokens(accessToken, refreshToken, user) {
  await chrome.storage.local.set({
    [CONFIG.STORAGE_KEYS.ACCESS_TOKEN]: accessToken,
    [CONFIG.STORAGE_KEYS.REFRESH_TOKEN]: refreshToken,
    [CONFIG.STORAGE_KEYS.USER]: user,
  })
}

// Get stored tokens
export async function getTokens() {
  const result = await chrome.storage.local.get([
    CONFIG.STORAGE_KEYS.ACCESS_TOKEN,
    CONFIG.STORAGE_KEYS.REFRESH_TOKEN,
    CONFIG.STORAGE_KEYS.USER,
  ])

  return {
    accessToken: result[CONFIG.STORAGE_KEYS.ACCESS_TOKEN] || null,
    refreshToken: result[CONFIG.STORAGE_KEYS.REFRESH_TOKEN] || null,
    user: result[CONFIG.STORAGE_KEYS.USER] || null,
  }
}

// Clear stored tokens (logout)
export async function clearTokens() {
  await chrome.storage.local.remove([
    CONFIG.STORAGE_KEYS.ACCESS_TOKEN,
    CONFIG.STORAGE_KEYS.REFRESH_TOKEN,
    CONFIG.STORAGE_KEYS.USER,
    CONFIG.STORAGE_KEYS.SELECTED_PROJECT,
  ])
}

// Check if user is authenticated
export async function isAuthenticated() {
  const { accessToken } = await getTokens()
  return !!accessToken
}

// Get current user
export async function getCurrentUser() {
  const { user } = await getTokens()
  return user
}

/**
 * Initiate OAuth login flow using Chrome Identity API
 * This opens a popup window for the user to authenticate with Supabase
 */
export async function login() {
  return new Promise((resolve, reject) => {
    // Build the OAuth authorization URL
    const authUrl = new URL(`${CONFIG.API_BASE_URL}/api/auth/extension`)
    authUrl.searchParams.set('redirect_url', CONFIG.OAUTH.REDIRECT_URL)

    // Launch the auth flow
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl.toString(),
        interactive: true,
      },
      async (redirectUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }

        if (!redirectUrl) {
          reject(new Error('No redirect URL received'))
          return
        }

        try {
          // Parse the tokens from the redirect URL
          const url = new URL(redirectUrl)
          const hashParams = new URLSearchParams(url.hash.substring(1))
          const queryParams = new URLSearchParams(url.search)

          // Try to get tokens from hash (implicit flow) or query (code flow)
          const accessToken = hashParams.get('access_token') || queryParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token')

          if (!accessToken) {
            // Check if there's an error
            const error = hashParams.get('error') || queryParams.get('error')
            const errorDescription = hashParams.get('error_description') || queryParams.get('error_description')
            reject(new Error(errorDescription || error || 'Authentication failed'))
            return
          }

          // Fetch user info
          const userResponse = await fetch(`${CONFIG.API_BASE_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          })

          if (!userResponse.ok) {
            reject(new Error('Failed to fetch user info'))
            return
          }

          const user = await userResponse.json()

          // Store tokens
          await storeTokens(accessToken, refreshToken, user)

          resolve({ accessToken, refreshToken, user })
        } catch (error) {
          reject(error)
        }
      }
    )
  })
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken() {
  const { refreshToken } = await getTokens()

  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!response.ok) {
    // Clear tokens if refresh fails
    await clearTokens()
    throw new Error('Failed to refresh token')
  }

  const data = await response.json()

  // Store new tokens
  await storeTokens(data.access_token, data.refresh_token, data.user)

  return data
}

/**
 * Logout the user
 */
export async function logout() {
  await clearTokens()
}

/**
 * Make an authenticated API request
 */
export async function authenticatedFetch(url, options = {}) {
  let { accessToken } = await getTokens()

  if (!accessToken) {
    throw new Error('Not authenticated')
  }

  // Try the request with the current token
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  // If unauthorized, try to refresh the token
  if (response.status === 401) {
    try {
      const refreshed = await refreshAccessToken()
      accessToken = refreshed.access_token

      // Retry the request with the new token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`,
        },
      })
    } catch {
      throw new Error('Session expired. Please log in again.')
    }
  }

  return response
}
