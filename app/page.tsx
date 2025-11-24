"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-3xl text-center space-y-8">
        <div>
          <h1 className="text-5xl font-bold mb-4">
            Ontologizer
          </h1>
          <p className="text-xl text-muted-foreground mb-2">
            Advanced Structured Data Tool
          </p>
          <p className="text-muted-foreground">
            Generate comprehensive JSON-LD structured data with AI-powered content analysis
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg">Get Started</Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="space-y-2">
            <h3 className="font-semibold">AI-Powered</h3>
            <p className="text-sm text-muted-foreground">
              GPT-5 extracts entities, topics, and generates structured data
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Fast & Cached</h3>
            <p className="text-sm text-muted-foreground">
              Smart caching reduces costs and speeds up analysis
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Easy Sharing</h3>
            <p className="text-sm text-muted-foreground">
              Share your analyses with public links
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
