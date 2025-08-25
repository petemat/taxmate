# TaxMate Deployment Guide

## Supabase Auth Configuration

### Redirect URLs Setup
In your Supabase dashboard, configure these redirect URLs:

**Site URL:**
```
https://taxmatematero.netlify.app
```

**Redirect URLs:**
```
https://taxmatematero.netlify.app/auth/callback
https://taxmatematero.netlify.app/
https://taxmatematero.netlify.app/dashboard
http://localhost:3000/auth/callback  (for development)
http://localhost:3000/  (for development)
```

### Environment Variables
Set these in your deployment platform (Netlify/Vercel):

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

## Troubleshooting Auth Redirects

### Issue: Redirected to localhost after login
**Cause:** Browser has cached auth session from local development

**Solutions:**
1. **Clear browser data** for the production domain
2. **Sign out completely** using the logout button in the app
3. **Use incognito/private browsing** to test fresh sessions
4. **Check Supabase Auth logs** in dashboard for redirect URLs being used

### Issue: "Invalid redirect URL" error
**Cause:** Production domain not added to Supabase redirect URLs

**Solution:** Add your production domain to the redirect URLs list in Supabase dashboard

## Production Checklist

- [ ] Environment variables set in deployment platform
- [ ] Supabase redirect URLs configured for production domain
- [ ] Test auth flow in incognito browser
- [ ] Verify OCR API works with production OpenAI key
- [ ] Check Supabase RLS policies are active
- [ ] Test file upload with production storage bucket

## Notes

- The app uses `window.location.origin` for dynamic redirect URLs
- Auth redirects should work automatically for any domain
- Always test in fresh browser session to avoid cached auth state
