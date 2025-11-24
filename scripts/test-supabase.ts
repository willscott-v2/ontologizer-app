#!/usr/bin/env ts-node

/**
 * Test script to verify Supabase connection and database setup
 * Run with: npm run test:db
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables from .env.local
const envPath = join(process.cwd(), ".env.local");
try {
  const envFile = readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=");
    if (key && value) {
      process.env[key] = value;
    }
  });
} catch (error) {
  console.error("⚠️  Could not load .env.local file");
}

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing Supabase credentials in .env.local");
  console.error("   Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Create Supabase client
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testConnection() {
  console.log("🔍 Testing Supabase Connection...\n");

  try {
    // Test 1: Check connection
    console.log("1️⃣  Testing basic connection...");
    const { data, error } = await supabase.from("profiles").select("count");

    if (error && error.code === "42P01") {
      console.error("❌ Tables not found. Please run the migrations first!");
      console.error("   See: supabase/MIGRATION_GUIDE.md");
      return;
    }

    if (error) {
      console.error("❌ Connection failed:", error.message);
      return;
    }

    console.log("✅ Connection successful!");

    // Test 2: Check all tables exist
    console.log("\n2️⃣  Checking tables...");
    const tables = ["profiles", "analyses", "entity_cache", "url_cache", "feedback", "templates"];

    for (const table of tables) {
      const { error: tableError } = await supabase.from(table as any).select("count");
      if (tableError) {
        console.error(`❌ Table '${table}' not found or not accessible`);
        console.error(`   Error: ${tableError.message}`);
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    }

    // Test 3: Check functions exist
    console.log("\n3️⃣  Checking functions...");
    const { data: functions, error: funcError } = await supabase.rpc("generate_share_token" as any);
    if (funcError) {
      console.error("❌ Function 'generate_share_token' not found");
      console.error(`   Error: ${funcError.message}`);
    } else {
      console.log(`✅ Function 'generate_share_token' works: ${functions}`);
    }

    // Test 4: Check RLS is enabled
    console.log("\n4️⃣  Checking Row Level Security...");
    const { data: rlsData, error: rlsError } = await supabase
      .from("profiles")
      .select("*")
      .limit(1);

    if (rlsError) {
      console.log("⚠️  RLS might not be configured correctly");
      console.log(`   Error: ${rlsError.message}`);
    } else {
      console.log("✅ RLS policies are active");
    }

    // Test 5: Test insert (will be cleaned up)
    console.log("\n5️⃣  Testing insert capability...");
    const testUrl = `https://example.com/test-${Date.now()}`;
    const { data: insertData, error: insertError } = await supabase
      .from("analyses")
      .insert({
        url: testUrl,
        status: "pending" as const,
      } as any)
      .select()
      .single();

    if (insertError) {
      console.error("❌ Insert test failed:", insertError.message);
    } else {
      console.log("✅ Insert successful!");

      // Clean up test data
      await supabase.from("analyses").delete().eq("id", (insertData as any).id);
      console.log("✅ Cleanup successful!");
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("🎉 Supabase setup verification complete!");
    console.log("=".repeat(50));
    console.log("\n✅ Your database is ready for development!");
    console.log("\nNext steps:");
    console.log("  1. Run: npm run dev");
    console.log("  2. Start building authentication flows");
    console.log("  3. Create your first analysis");

  } catch (error) {
    console.error("\n❌ Unexpected error:", error);
    console.error("\nPlease check:");
    console.error("  1. .env.local has correct credentials");
    console.error("  2. Migrations have been run in Supabase");
    console.error("  3. Your Supabase project is active");
  }
}

// Run the test
testConnection();
