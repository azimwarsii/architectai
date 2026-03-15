# ArchitectAI Browser Extension

Chrome extension for capturing context from AI coding tools (Cursor, Lovable, Bolt, v0, Replit) directly to your ArchitectAI canvas.

## Features

- **Context Capture**: Select text on supported websites and send it to your canvas
- **Quick Access**: Popup interface for managing captured content
- **Project Selection**: Choose which project to send captured context to
- **Node Types**: Select the appropriate node type (Evidence, Feature, Pain Point, Dev Task)
- **Task Context**: View active tasks with acceptance criteria and related context
- **Prompt Suggestions**: Get AI-ready prompts based on your current task
- **Side Panel**: Persistent side panel for task context while coding
- **OAuth Authentication**: Secure authentication with your ArchitectAI account

## Supported Platforms

Each platform has custom integration to capture context:

### Cursor
- Detects workspace name and git branch
- Captures active file and language
- Extracts AI chat conversations
- Monaco editor selection support

### Lovable
- Detects project ID and name
- Captures active component
- Extracts AI conversation history
- Code block selection support

### Bolt
- Detects project and template
- Captures active file and language
- Extracts prompt/response history
- CodeMirror selection support

### Replit
- Detects repl owner and name
- Captures active file and language
- Extracts Ghostwriter/AI conversations
- Console output capture

### v0
- Basic selection capture
- URL-based context detection

## Installation

### Development

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `extension` folder from this repository

### Configuration

Before using the extension, you need to configure it:

1. Copy `src/utils/config.js` and update the following values:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `API_BASE_URL`: Your ArchitectAI app URL (e.g., `http://localhost:3000` for development)

2. In `manifest.json`, update:
   - `oauth2.client_id`: Your OAuth client ID (if using Google OAuth)

## Usage

### Capturing Context

1. Navigate to a supported website (Cursor, Lovable, etc.)
2. Select some text you want to capture
3. Click the "Send to ArchitectAI" button that appears
4. The content is captured and stored locally

### Sending to Canvas

1. Click the ArchitectAI extension icon in your browser toolbar
2. Sign in with your ArchitectAI account (first time only)
3. Select the project you want to send to
4. Choose the node type
5. Edit the title and description if needed
6. Click "Send to Canvas"

### Using the Side Panel

1. Click the side panel icon in the popup header
2. The side panel opens alongside your AI coding tool
3. View your active tasks and their acceptance criteria
4. Copy prompt suggestions directly to your AI tool
5. Mark tasks as complete when done

### Using Task Context

1. Switch to the "Tasks" tab in the popup or side panel
2. Select a project to load its tasks
3. Click on a task to view details:
   - Acceptance criteria
   - Related context from your spec
   - AI-ready prompt suggestions
4. Click a prompt suggestion to copy it
5. Use "Copy Context" to copy the full task context

### Keyboard Shortcut

- `Ctrl/Cmd + Shift + A`: Capture selected text directly

## Project Structure

```
extension/
├── manifest.json           # Extension manifest (MV3)
├── assets/                 # Icons and images
├── src/
│   ├── background/
│   │   └── service-worker.js   # Background service worker
│   ├── content/
│   │   ├── content.js      # Content script for capture
│   │   ├── content.css     # Content script styles
│   │   └── platforms/      # Platform-specific integrations
│   │       ├── base.js     # Base capture class
│   │       ├── cursor.js   # Cursor integration
│   │       ├── lovable.js  # Lovable integration
│   │       ├── bolt.js     # Bolt integration
│   │       └── replit.js   # Replit integration
│   ├── popup/
│   │   ├── popup.html      # Popup UI
│   │   ├── popup.css       # Popup styles
│   │   └── popup.js        # Popup logic
│   ├── sidepanel/
│   │   ├── sidepanel.html  # Side panel UI
│   │   ├── sidepanel.css   # Side panel styles
│   │   └── sidepanel.js    # Side panel logic
│   └── utils/
│       ├── auth.js         # Authentication utilities
│       └── config.js       # Configuration
└── dist/                   # Build output (for production)
```

## Building for Production

For production deployment:

1. Update `config.js` with production URLs:
   ```javascript
   export const CONFIG = {
     SUPABASE_URL: 'https://your-project.supabase.co',
     SUPABASE_ANON_KEY: 'your-production-key',
     API_BASE_URL: 'https://architectai.app',
   }
   ```

2. Generate icon files:
   - Open `assets/generate-icons.html` in a browser
   - Click "Download All Icons"
   - Save icons to `assets/` folder

3. Update `manifest.json`:
   - Set `oauth2.client_id` to your production OAuth client ID

4. Build the package:
   ```bash
   ./build.sh
   ```

5. Submit to Chrome Web Store:
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Upload the generated `.zip` file
   - Fill in store listing details (see `STORE_LISTING.md`)
   - Submit for review

## Chrome Web Store Submission Checklist

- [ ] Production API URLs configured
- [ ] OAuth client ID updated
- [ ] All icon sizes present (16, 32, 48, 128)
- [ ] Store listing screenshots prepared
- [ ] Privacy policy URL ready
- [ ] Tested with production backend

## API Endpoints

The extension uses the following API endpoints from the main app:

- `GET /api/auth/extension` - Initiate OAuth flow
- `GET /api/auth/callback` - Handle OAuth callback
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/projects` - List user's projects
- `POST /api/nodes` - Create a new canvas node

## Security

- Tokens are stored securely in Chrome's extension storage
- All API requests use Bearer token authentication
- Refresh tokens are used to maintain sessions
- OAuth flow uses Chrome's identity API for secure authentication
