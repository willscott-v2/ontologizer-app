# Supabase Database Migration Guide

This guide will walk you through setting up the Ontologizer database schema in Supabase.

## Prerequisites

- Supabase project created
- Environment variables configured in `.env.local`

## Migration Files

We have two migration files in the `supabase/migrations/` directory:

1. **20241124_initial_schema.sql** - Creates all tables, indexes, functions, and triggers
2. **20241124_rls_policies.sql** - Sets up Row Level Security policies and permissions

## How to Run the Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open your Supabase Project:**
   - Go to https://supabase.com/dashboard
   - Select your "ontologizer" project

2. **Navigate to SQL Editor:**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Initial Schema:**
   - Open `supabase/migrations/20241124_initial_schema.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" (or press Cmd/Ctrl + Enter)
   - Wait for success message

4. **Run the RLS Policies:**
   - Open `supabase/migrations/20241124_rls_policies.sql`
   - Copy the entire contents
   - Paste into the SQL Editor (new query or clear previous)
   - Click "Run"
   - Wait for success message

### Option 2: Using Supabase CLI (Advanced)

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref ukwxaubrlvlubttofonv

# Apply migrations
supabase db push
```

## What Gets Created

### Tables

1. **profiles** - Extended user profile information
   - Links to auth.users
   - Tracks usage statistics (analyses_count, total_tokens_used)

2. **analyses** - URL analysis results
   - Stores URL content and metadata
   - AI-extracted entities, topics, sentiment
   - JSON-LD structured data output
   - Token usage tracking
   - Public sharing capability

3. **entity_cache** - Caches extracted entities (7-day TTL)
   - Reduces API calls to OpenAI
   - Content hash-based deduplication

4. **url_cache** - Caches fetched URL content (1-hour TTL)
   - Reduces HTTP requests
   - Stores raw and cleaned content

5. **feedback** - User feedback and ratings
   - Links to analyses
   - Rating (1-5) and text feedback

6. **templates** - Pre-built schema templates
   - For future template library feature

### Functions

- `handle_updated_at()` - Auto-updates timestamps
- `clean_expired_cache()` - Removes expired cache entries
- `generate_share_token()` - Generates unique share tokens
- `increment_analyses_count()` - Tracks user analysis count
- `update_token_usage()` - Tracks OpenAI token usage
- `handle_new_user()` - Auto-creates profile on signup

### Triggers

- Auto-update timestamps on UPDATE
- Auto-increment user stats
- Auto-create profile when user signs up

### Indexes

- Optimized for common queries
- GIN indexes for JSONB searches
- Indexes on foreign keys and commonly filtered columns

### Row Level Security (RLS)

All tables have RLS enabled with policies:
- Users can only see/modify their own data
- Public analyses are viewable by anyone (via share_token)
- Cache tables are read-only for users
- Service role has full access for server-side operations

## Verify the Migration

After running the migrations, verify everything is set up correctly:

1. **Check Tables:**
   - In Supabase Dashboard, go to "Table Editor"
   - You should see all 6 tables listed

2. **Check RLS Policies:**
   - Click on any table
   - Go to "Policies" tab
   - You should see the policies listed

3. **Test Connection (Next Step):**
   - We'll create a test script to verify the connection

## Troubleshooting

### Error: "relation already exists"
- Some tables might already exist
- You can drop them and re-run, or modify the migration to use `CREATE TABLE IF NOT EXISTS`

### Error: "permission denied"
- Make sure you're logged in as the project owner
- Try using the service_role key for CLI operations

### Error: "function already exists"
- Use `CREATE OR REPLACE FUNCTION` (already done in our migrations)
- Or drop the existing functions first

## Next Steps

After running the migrations:

1. Verify the database structure in Supabase Dashboard
2. Test the Supabase connection from the Next.js app
3. Create seed data (templates) if needed
4. Set up authentication flows

## Database Diagram

```
auth.users (Supabase Auth)
    │
    ├─> profiles (1:1)
    │       │
    │       └─> analyses (1:many)
    │               │
    │               ├─> feedback (1:many)
    │               └─> share via share_token
    │
    ├─> feedback (1:many)
    │
    └─> analyses (1:many)

entity_cache (shared cache)
url_cache (shared cache)
templates (shared resources)
```

## Schema Overview

### Data Flow

1. User enters URL
2. Check `url_cache` for cached content
3. If not cached, fetch URL and cache
4. Extract entities from content
5. Check `entity_cache` for cached entities
6. If not cached, call GPT-5 and cache results
7. Generate JSON-LD structured data
8. Save to `analyses` table
9. Update user `profiles` stats

### Caching Strategy

- **URL Cache:** 1-hour TTL
  - Reduces HTTP requests to external websites
  - Useful for repeated analyses of same URL

- **Entity Cache:** 7-day TTL
  - Reduces OpenAI API calls
  - Based on content hash (same content = cache hit)
  - Significant cost savings for similar content

### Token Tracking

Every analysis tracks:
- `prompt_tokens` - Tokens sent to GPT-5
- `completion_tokens` - Tokens received from GPT-5
- `total_tokens` - Sum of both
- User's `total_tokens_used` is auto-updated

This enables:
- Cost tracking per user
- Usage analytics
- Potential usage-based pricing

## Security Features

1. **Row Level Security (RLS)**
   - Users can only access their own data
   - Public sharing via share_token

2. **Service Role Operations**
   - Cache management
   - Background jobs
   - Admin operations

3. **Auto-profile Creation**
   - Profile created automatically on signup
   - Uses Supabase Auth trigger

4. **Email Whitelist** (Future)
   - Can be implemented in auth policies
   - Restrict access to specific email domains

---

**Ready?** Go ahead and run the migrations in your Supabase SQL Editor!
