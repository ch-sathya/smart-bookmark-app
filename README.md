# Smart Bookmark App

A real-time bookmark manager built as a standalone web application using Next.js and Supabase.

The app allows users to sign in with Google, manage their personal bookmarks, and see updates in real time across multiple tabs.

---
# Live Demo

👉 https://smart-bookmark.vercel.app
---

# Tech Stack

- Next.js (App Router)
- Supabase
  - Authentication (Google OAuth)
  - PostgreSQL Database
  - Realtime subscriptions
- Tailwind CSS
- Vercel (Deployment)

---

# Features

- Google OAuth login (no email/password)
- Add bookmarks (title + URL)
- Delete bookmarks
- Bookmarks are private per user
- Real-time updates across multiple browser tabs
- Responsive dark UI with basic styling

---

# How It Works

- Authentication is handled by Supabase using Google OAuth
- Each bookmark is linked to a `user_id`
- Row Level Security (RLS) ensures users can only access their own bookmarks
- Supabase Realtime listens for database changes and updates the UI instantly
- The app is deployed on Vercel with environment variables configured securely

---

# Problems Faced & Solutions

### 1. Realtime updates not syncing reliably
Problem: Changes sometimes required a manual refresh.  
Solution: Enabled Supabase Realtime on the table and ensured a single realtime subscription per session.

### 2. Deleted bookmarks reappearing after refresh
Problem: Optimistic UI updates caused mismatch with database state.  
Solution: Synced UI state with the database after delete operations to ensure consistency.

### 3. Google OAuth failing in production
Problem: OAuth worked locally but failed on Vercel.  
Solution: Added correct redirect URLs in Supabase Auth settings and Google Cloud Console, and configured environment variables in Vercel.

### 4. Environment variables not available during build
Problem: Vercel build failed due to missing Supabase keys.  
Solution: Added `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel project settings.

---

# To Run Locally

Create a .env.local file with:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

```bash
npm install
npm run dev
