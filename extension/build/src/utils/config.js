// Extension configuration
export const CONFIG = {
  // API base URL - change for production
  API_BASE_URL: process.env.NODE_ENV === 'production'
    ? 'https://architectai.app'
    : 'http://localhost:3000',

  // Supabase configuration (same as main app)
  SUPABASE_URL: 'YOUR_SUPABASE_URL',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',

  // Storage keys
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'architectai_access_token',
    REFRESH_TOKEN: 'architectai_refresh_token',
    USER: 'architectai_user',
    SELECTED_PROJECT: 'architectai_selected_project',
  },

  // OAuth configuration
  OAUTH: {
    REDIRECT_URL: chrome.identity.getRedirectURL(),
    AUTH_URL: 'YOUR_SUPABASE_URL/auth/v1/authorize',
    TOKEN_URL: 'YOUR_SUPABASE_URL/auth/v1/token',
  },
}
