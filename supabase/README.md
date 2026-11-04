# Supabase Setup Guide - CSI Operations

## Your SQL Files (run in this order)

| # | File | What it does |
|---|------|-------------|
| 1 | `01_schema.sql` | Creates `members`, `events`, `event_coordinators` tables with indexes |
| 2 | `02_seed_members.sql` | Inserts all 23 CSI members |
| 3 | `03_seed_events.sql` | Inserts all 13 events + assigns coordinators to each |
| 4 | `04_rls_policies.sql` | Row Level Security — public read, authenticated write |
| 5 | `05_auto_count_trigger.sql` | Auto-updates `events_coordinated_count` when you assign/unassign |
| 6 | `06_useful_views.sql` | Convenience views for events-with-coordinators, member workload, domain stats |

---

## Step-by-Step Setup

### STEP 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) → Sign up / Log in
2. Click **"New Project"**
3. Fill in:
   - **Name**: `CSI-Operations`
   - **Database Password**: save this somewhere safe
   - **Region**: pick the closest (e.g., Mumbai `ap-south-1`)
4. Wait for it to provision (~2 minutes)

### STEP 2: Run the SQL Files
1. In your Supabase dashboard → **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy-paste each file **one by one in order** (01 → 02 → 03 → 04 → 05 → 06)
4. Click **"Run"** after each one
5. Verify in **Table Editor** that `members` has 23 rows, `events` has 13 rows

### STEP 3: Get Your API Keys
1. Go to **Project Settings** → **API** (left sidebar)
2. Copy these two values — you'll need them later for your app:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon (public) key**: `eyJhbGci...` (long JWT string)
3. **Never expose the `service_role` key** in frontend code

### STEP 4: Add Team Members (GitHub)
1. Go to your GitHub repo → **Settings** → **Collaborators**
2. Click **"Add people"** → Enter their GitHub username or email
3. They get an invite → Accept → They can now push code
4. Vercel auto-deploys on every push to `main`

### STEP 5: Add Team Members (Supabase - Optional)
If others need direct database access:
1. Supabase Dashboard → **Project Settings** → **Team**
2. Click **"Invite"** → Enter their email
3. Choose role:
   - **Owner**: Full access (only you)
   - **Developer**: Can edit tables, run SQL, manage API
   - **Read-only**: Can view but not modify

---

## Important Notes

> ⚠️ The `anon` key is safe to use in frontend — RLS policies protect your data. But never expose `service_role` key.

> 🔄 When you assign a coordinator via the junction table, the trigger automatically updates the count. No manual counting needed.
