# Supabase Setup Guide for Matero Abrechnung

## Step 1: Create Supabase Project

Since your organization is Vercel-managed, you need to create the project through the Supabase dashboard:

1. **Go to [Supabase Dashboard](https://supabase.com/dashboard)**
2. **Click "New Project"**
3. **Choose your organization**: `petemat's projects`
4. **Project Details**:
   - **Name**: `matero-abrechnung`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: `Europe (Central)` - eu-central-1
   - **Pricing Plan**: Start with Free tier

## Step 2: Get Project Credentials

Once your project is created (takes ~2 minutes):

1. **Go to Project Settings** → **API**
2. **Copy the following values**:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Anon (public) key**: `eyJ...` (long string)
   - **Service role key**: `eyJ...` (different long string)

## Step 3: Configure Environment Variables

1. **Copy the template**:
   ```bash
   cp env.template .env.local
   ```

2. **Edit `.env.local`** and replace the placeholder values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here
   ```

## Step 4: Link Local Project to Remote

```bash
# Link to your remote project
supabase link --project-ref your-project-id

# Push the database schema
supabase db push
```

## Step 5: Configure Authentication

In your Supabase dashboard:

1. **Go to Authentication** → **Settings**
2. **Configure Auth Providers**:
   - **Email**: Enable (for Magic Link login)
   - **Google**: Optional (for OAuth)
3. **Site URL**: Set to `http://localhost:3000` for development
4. **Redirect URLs**: Add `http://localhost:3000/auth/callback`

## Step 6: Configure Storage

1. **Go to Storage** → **Buckets**
2. **The `receipts` bucket** should be automatically created by our migration
3. **Verify the bucket policies** are in place for user-only access

## Step 7: Test the Setup

```bash
# Start the development server
npm run dev

# In another terminal, test the database connection
supabase db reset --linked
```

## Step 8: OCR API Setup (Choose One)

### Option A: OpenAI GPT-4 Vision (Recommended)
1. **Get API key** from [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Add to `.env.local`**:
   ```env
   OPENAI_API_KEY=sk-your-openai-key-here
   ```

### Option B: Google Cloud Vision
1. **Enable Vision API** in Google Cloud Console
2. **Create service account** and download JSON key
3. **Add to `.env.local`**:
   ```env
   GOOGLE_CLOUD_VISION_API_KEY=your-google-key-here
   ```

## Troubleshooting

### Common Issues:

1. **"Invalid API key"**: Double-check your Supabase credentials
2. **"Project not found"**: Ensure you're using the correct project ID
3. **RLS Policy errors**: Make sure you're authenticated when testing
4. **Storage upload fails**: Check bucket policies and file size limits

### Useful Commands:

```bash
# Check Supabase status
supabase status

# View logs
supabase logs

# Reset database (careful!)
supabase db reset --linked

# Generate TypeScript types
supabase gen types typescript --linked > src/types/supabase.ts
```

## Next Steps

Once Supabase is configured:

1. **Test authentication** with magic link
2. **Upload a test receipt** to verify storage
3. **Run the OCR extraction** pipeline
4. **View data** in the receipts table

## Security Notes

- ✅ **RLS policies** are enabled for all tables
- ✅ **Storage bucket** is private with user-only access
- ✅ **Service role key** is only used server-side
- ✅ **Audit logging** tracks all changes for GoBD compliance

## GDPR Compliance

- ✅ **Data minimization**: Only necessary fields collected
- ✅ **User consent**: Required for OCR processing
- ✅ **Right to deletion**: Users can delete their data
- ✅ **Data portability**: CSV export functionality
- ✅ **Audit trail**: All changes are logged
