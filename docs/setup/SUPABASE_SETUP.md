# Supabase Setup Guide

## Step 1: Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub, Google, or email

## Step 2: Create a New Project

1. Click "New Project" in the Supabase dashboard
2. Fill in the project details:
   - **Name:** `theglocal` (or your preferred name)
   - **Database Password:** Generate a strong password and **save it securely**
   - **Region:** Choose the closest region to your users
   - **Pricing Plan:** Start with the Free tier

3. Click "Create new project"
4. Wait 2-3 minutes for the project to initialize

## Step 3: Get Your Project Credentials

Once the project is ready:

1. Go to **Project Settings** (gear icon in sidebar)
2. Navigate to **API** section
3. Copy the following values:
   - **Project URL** - This is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key - This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (click "Reveal" button) - This is your `SUPABASE_SERVICE_ROLE_KEY`

## Step 4: Configure Environment Variables

1. Create a `.env.local` file in the project root
2. Add the credentials you copied:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Other API Keys (to be added later)
GOOGLE_NEWS_API_KEY=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
BOOKMYSHOW_API_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Save the file

## Step 5: Verify Connection

After adding your credentials, run:

```bash
npm run dev
```

The Supabase client will now connect to your project.

## Important Notes

⚠️ **Security:**

- Never commit `.env.local` to git
- The anon key is safe for client-side use
- Keep the service_role key secret (never expose it to clients)

📝 **Next Steps:**

- Database migrations will be created in the next tasks
- We'll set up authentication and database tables
- Row Level Security (RLS) policies will be implemented for privacy

## Troubleshooting

**Connection issues:**

- Verify credentials are correct
- Check that project is not paused (free tier pauses after inactivity)
- Ensure no typos in environment variable names

**Need help?**

- Check Supabase docs: https://supabase.com/docs
- Join Supabase Discord: https://discord.supabase.com
