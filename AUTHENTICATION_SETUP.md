# API Authentication Setup Guide

## Resolving 401 Authentication Errors

If you're seeing 401 errors when accessing the API endpoints, follow these steps to configure authentication:

### Quick Setup

1. **Generate an API Key**
   ```bash
   npx tsx scripts/generate-api-key.ts
   ```
   This will create a new API key for your tenant and display it in the console.
   **Important:** Save the API key immediately as it won't be shown again!

2. **Configure the API Key in the Application**
   
   **Option A: Through the UI (Recommended)**
   - Navigate to `/settings/api-keys` in your browser
   - Paste your API key in the input field
   - Click "Save"
   - Test the connection to verify it works

   **Option B: Environment Variable**
   - Create a `.env.local` file in the root directory
   - Add your API key:
     ```
     NEXT_PUBLIC_API_KEY=muralla_live_your_key_here
     ```
   - Restart your development server

### Understanding the Authentication System

The application uses API key authentication for all API endpoints:

- **Format:** `Authorization: Bearer YOUR_API_KEY`
- **Key Pattern:** Keys start with `muralla_live_` (production) or `muralla_test_` (test)
- **Storage:** Keys are hashed in the database for security

### API Client Usage

The application now uses a centralized API client (`/src/lib/api-client.ts`) that:
- Automatically includes the API key in all requests
- Handles authentication errors gracefully
- Stores the API key securely in localStorage

### Troubleshooting

**Still getting 401 errors?**
1. Verify your API key is correctly formatted
2. Check that the key exists in the database (ApiKey table)
3. Ensure the key is active and not expired
4. Clear browser cache and localStorage, then reconfigure

**Need to generate a new key?**
Run the generate script again - you can have multiple active keys.

**API key compromised?**
1. Generate a new key immediately
2. Update the key in all applications
3. Deactivate the old key in the database

### Security Best Practices

1. **Never commit API keys to version control**
2. Use environment variables for production deployments
3. Rotate keys regularly
4. Use different keys for different environments (dev/staging/prod)
5. Monitor API key usage for suspicious activity

### Updated Pages

The following pages have been updated to use the new authentication system:
- `/products` - Product listing
- `/products/categories` - Category management
- `/settings/api-keys` - API key configuration

All other pages that make API calls should be updated similarly.
