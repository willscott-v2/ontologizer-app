#!/bin/bash

# Simple shell script to run the Supabase test
# Makes it easier to run without remembering the npx command

echo "🧪 Running Supabase Connection Test..."
echo ""

# Load environment variables from .env.local
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Run the test script
npx tsx scripts/test-supabase.ts
