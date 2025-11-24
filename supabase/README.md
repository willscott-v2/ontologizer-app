# Supabase Setup for Ontologizer

## Quick Start

Follow these steps to set up your Supabase database:

### Step 1: Run the SQL Migrations

1. **Open Supabase Dashboard:**
   - Go to https://supabase.com/dashboard
   - Open your project: https://supabase.com/dashboard/project/ukwxaubrlvlubttofonv

2. **Open SQL Editor:**
   - Click "SQL Editor" in the left sidebar
   - Click "+ New query"

3. **Run Initial Schema Migration:**
   - Open the file: `supabase/migrations/20241124_initial_schema.sql`
   - Copy all contents (Cmd+A, Cmd+C)
   - Paste into SQL Editor
   - Click "Run" (or Cmd+Enter)
   - ✅ Wait for "Success" message

4. **Run RLS Policies Migration:**
   - Open the file: `supabase/migrations/20241124_rls_policies.sql`
   - Copy all contents
   - Paste into SQL Editor (clear previous or new query)
   - Click "Run"
   - ✅ Wait for "Success" message

### Step 2: Verify the Setup

Run the connection test from your terminal:

```bash
npm run test:db
```

You should see:
- ✅ Connection successful
- ✅ All 6 tables exist
- ✅ Functions work
- ✅ RLS policies active
- ✅ Insert/delete operations work

## What Was Created

### 📊 Tables (6)

1. **profiles** - User profiles
   - Links to Supabase auth.users
   - Tracks usage stats

2. **analyses** - URL analysis results
   - Stores AI-extracted data
   - JSON-LD structured data
   - Public sharing capability

3. **entity_cache** - Entity extraction cache (7-day TTL)
   - Reduces OpenAI API costs
   - Content hash-based

4. **url_cache** - URL fetch cache (1-hour TTL)
   - Reduces HTTP requests
   - Stores raw HTML and cleaned text

5. **feedback** - User feedback
   - Ratings and comments
   - Links to analyses

6. **templates** - Schema templates
   - Pre-built JSON-LD templates
   - For future template library

### 🔐 Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Public sharing via share tokens
- Service role for admin operations

### ⚡ Performance

- Indexes on all foreign keys
- GIN indexes for JSONB searches
- Automatic cache cleanup
- Optimized for common queries

### 🤖 Automation

- Auto-create profile on signup
- Auto-update timestamps
- Auto-increment usage stats
- Auto-track token usage

## Database Schema

```
┌─────────────────┐
│  auth.users     │ (Supabase Auth)
└────────┬────────┘
         │
         ├──────────────┐
         │              │
    ┌────▼─────┐   ┌───▼────────┐
    │ profiles │   │  analyses  │
    └──────────┘   └─────┬──────┘
                         │
                    ┌────▼────────┐
                    │  feedback   │
                    └─────────────┘

    ┌─────────────────┐
    │  entity_cache   │ (shared)
    └─────────────────┘

    ┌─────────────────┐
    │   url_cache     │ (shared)
    └─────────────────┘

    ┌─────────────────┐
    │   templates     │ (shared)
    └─────────────────┘
```

## Troubleshooting

### Tables not showing up?
- Make sure you ran both migration files
- Check for SQL errors in the editor
- Verify you're in the correct project

### Connection test failing?
- Verify `.env.local` has correct credentials
- Check your Supabase project is active
- Try regenerating the service role key

### RLS errors?
- This is normal during development
- Use service role key for server-side operations
- Check policies in Table Editor > Policies tab

## Next Steps

After successful setup:

1. ✅ Migrations run successfully
2. ✅ Connection test passes
3. 🚀 Start building authentication
4. 🚀 Create first URL analysis
5. 🚀 Build the frontend

---

**Need help?** Check `supabase/MIGRATION_GUIDE.md` for detailed explanations.
