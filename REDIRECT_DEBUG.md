# Redirect Problem Debug Guide

## Current Status
- ✅ Google Console: Correctly configured with production URLs
- ❌ Supabase Dashboard: Still needs localhost URLs removed

## Next Steps

### 1. Check Supabase Dashboard
Go to: https://supabase.com/dashboard/project/[your-project]/auth/url-configuration

**Current Problem:** Localhost URLs are likely still in the redirect list

**Required Configuration:**
```
Site URL: https://taxmatematero.netlify.app

Redirect URLs (in this exact order):
1. https://taxmatematero.netlify.app/auth/callback
2. https://taxmatematero.netlify.app/
```

**Remove these if present:**
- http://localhost:3000/auth/callback
- http://localhost:3000/

### 2. Debug Console Logs
After fixing Supabase config, check browser console during login:
- Look for "Auth callback - current origin"
- Look for "Auth callback - full URL" 
- Check URL parameters for redirect hints

### 3. Test Sequence
1. Clear browser cache/cookies
2. Go to https://taxmatematero.netlify.app
3. Login with Google
4. Check console logs
5. Verify redirect stays on production domain

## Why This Happens
- Supabase uses the FIRST matching redirect URL from the configured list
- If localhost is listed first, it always redirects there
- Google Console settings are separate from Supabase redirect settings
- Both must be configured correctly for proper flow
