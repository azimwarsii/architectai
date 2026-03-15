# GitHub Integration Setup Guide

This guide explains how to set up the GitHub OAuth integration for ArchitectAI.

## 1. Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"** (or "Register a new application")
3. Fill in the application details:

   | Field | Value |
   |-------|-------|
   | **Application name** | ArchitectAI |
   | **Homepage URL** | `https://your-domain.com` (or `http://localhost:3000` for development) |
   | **Application description** | Export development tasks as GitHub issues |
   | **Authorization callback URL** | `https://your-domain.com/api/integrations/github/callback` |

4. Click **"Register application"**
5. Copy the **Client ID**
6. Click **"Generate a new client secret"** and copy the secret

## 2. Configure Environment Variables

Add these variables to your `.env.local` file:

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here

# App URL (used for OAuth redirect)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, update `NEXT_PUBLIC_APP_URL` to your production domain.

## 3. Run Database Migration

Apply the migration to add the `github_integrations` table:

```bash
# Using Supabase CLI
supabase db push

# Or run the SQL directly in Supabase Dashboard
# Copy contents of supabase/migrations/004_github_integrations.sql
```

## 4. Required OAuth Scopes

The integration requests the following GitHub OAuth scope:

- `repo` - Full control of private repositories (needed to create issues)

If you only need public repo access, you can modify the scope in `/api/integrations/github/connect/route.ts`:

```typescript
// Change scope=repo to scope=public_repo for public repos only
`scope=public_repo&`
```

## 5. How It Works

### OAuth Flow

1. User clicks "Connect GitHub" in Settings
2. User is redirected to GitHub authorization page
3. After authorization, GitHub redirects to `/api/integrations/github/callback`
4. We exchange the code for an access token
5. Token is stored in `github_integrations` table

### Exporting Tasks

1. User opens Task Export panel
2. Selects a GitHub repository
3. Clicks "Create Issues"
4. Each task becomes a GitHub issue with:
   - Title from task title
   - Body with description, acceptance criteria, and evidence
   - Labels: `architectai`, `task`

## 6. Security Considerations

- Access tokens are stored in the database (consider encryption for production)
- OAuth state token prevents CSRF attacks
- RLS policies ensure users can only access their own integrations
- Tokens are not exposed to the frontend

## 7. Troubleshooting

### "GitHub token expired"
- User needs to reconnect GitHub from Settings

### "Failed to fetch repositories"
- Check if the OAuth scope includes `repo`
- Verify the access token is valid

### "Failed to create issue"
- User may not have write access to the repository
- Repository may have issue creation disabled

## 8. Future Improvements

- [ ] Webhook integration for two-way sync
- [ ] Link GitHub issues back to ArchitectAI tasks
- [ ] Support for GitHub Projects
- [ ] Milestone assignment
- [ ] Assignee mapping
