# Supabase Auth Configuration Fix

## Problem
Production app (taxmatematero.netlify.app) redirects to localhost after login.

## Root Cause
Supabase Dashboard has localhost URLs in the redirect configuration that take precedence.

## Solution Steps

### 1. Update Supabase Dashboard Settings
Go to your Supabase Dashboard → Authentication → URL Configuration:

**Site URL:**
```
https://taxmatematero.netlify.app
```

**Redirect URLs (REMOVE all localhost entries):**
```
https://taxmatematero.netlify.app/auth/callback
https://taxmatematero.netlify.app/
```

**IMPORTANT:** Delete these localhost entries:
- ❌ `http://localhost:3000/auth/callback`
- ❌ `http://localhost:3000/`

### 2. For Development
Add localhost URLs back only when developing locally:
```
http://localhost:3000/auth/callback
http://localhost:3000/
```

### 3. Verification
After updating Supabase config:
1. Clear browser cache/cookies
2. Test login on production URL
3. Should redirect to production domain, not localhost

## Code Changes Made
- Enhanced auth callback with forced `window.location.href` redirects
- Added logging to track redirect behavior
- Prevents Next.js router from interfering with auth flow

## Notes
- Supabase uses the FIRST matching redirect URL from the list
- If localhost is listed first, it will always redirect there
- Production URLs must be listed first for production priority
