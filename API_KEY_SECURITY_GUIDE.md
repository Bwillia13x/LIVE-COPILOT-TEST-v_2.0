# 🔒 Secure API Key Setup Guide

## Current Security Status
✅ **SECURE**: Your API key is NOT in the public repository
✅ **SECURE**: Environment variables are properly configured
✅ **SECURE**: Production build excludes sensitive data

## Option 1: Netlify Dashboard (Recommended)

### Step 1: Access Netlify Environment Variables
1. Go to: https://app.netlify.com/projects/voice-notes-pro-v2
2. Click "Site settings"
3. Click "Environment variables"
4. Click "Add variable"

### Step 2: Add Your API Key
- **Key**: `VITE_GEMINI_API_KEY`
- **Value**: `your_actual_gemini_api_key`
- **Scope**: `All contexts` (or Production only)

### Step 3: Redeploy
After adding the environment variable, redeploy your site:
```bash
netlify deploy --prod
```

## Option 2: Netlify CLI (Command Line)

```bash
# Set the API key (replace with your actual key)
netlify env:set VITE_GEMINI_API_KEY "your_actual_gemini_api_key"

# Verify it's set
netlify env:list

# Redeploy with new environment variable
netlify deploy --prod
```

## Option 3: Local Development (.env.local)

For local development, create a `.env.local` file (already gitignored):

```bash
# Create local environment file
echo "VITE_GEMINI_API_KEY=your_actual_api_key" > .env.local
```

## Security Best Practices ✅

### What We're Doing Right:
1. **No API keys in git**: ✅ Keys are not committed to repository
2. **Environment variables**: ✅ Using proper environment variable system
3. **Production separation**: ✅ Different configs for dev/prod
4. **Gitignore protection**: ✅ `.env.local` and sensitive files excluded

### File Security Status:
```
✅ .env.production     → Public template (no real keys)
✅ .env.local          → Private, gitignored
✅ netlify.toml        → Public config (no secrets)
✅ Source code         → No hardcoded keys
```

## Verification Commands

### Check if API key is set in Netlify:
```bash
netlify env:list
```

### Test the deployed app with your API key:
```bash
curl https://voice-notes-pro-v2.netlify.app/api/health
```

### Check local environment:
```bash
echo $VITE_GEMINI_API_KEY
```

## Emergency: Rotate API Key

If you accidentally expose your API key:

1. **Immediately revoke** the old key in Google AI Studio
2. **Generate a new key**
3. **Update environment variables**:
   ```bash
   netlify env:set VITE_GEMINI_API_KEY "new_api_key_here"
   netlify deploy --prod
   ```

## Current Deployment Status

Your app is currently deployed at:
🌐 **Live URL**: https://voice-notes-pro-v2.netlify.app

To add your API key securely:
1. Go to Netlify dashboard
2. Add `VITE_GEMINI_API_KEY` environment variable
3. Redeploy the site

**The app will work fully once you add your API key to Netlify's environment variables!**
