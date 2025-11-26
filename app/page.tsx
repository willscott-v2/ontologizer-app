"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/design-system/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/design-system/card";
import { LoadingSpinner } from "@/components/ui/design-system/loading-spinner";
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
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[var(--dark-blue)] to-[var(--lighter-blue)]">
        <LoadingSpinner size="lg" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-[var(--dark-blue)] to-[var(--lighter-blue)]">
      <div className="max-w-4xl text-center space-y-8">
        <div>
          <h1 className="text-6xl font-extrabold mb-4">
            <span className="text-gradient-orange">Ontologizer</span>
          </h1>
          <p className="text-2xl text-white mb-2">
            Advanced Structured Data Tool
          </p>
          <p className="text-base text-[var(--light-gray)] max-w-2xl mx-auto">
            Generate comprehensive JSON-LD structured data with AI-powered content analysis
          </p>
        </div>

        <div className="flex gap-4 justify-center mt-8">
          <Link href="/login">
            <Button size="lg">Get Started</Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <Card variant="glass" hover="lift" padding="lg">
            <CardHeader>
              <CardTitle className="text-white text-lg">🤖 AI-Powered</CardTitle>
            </CardHeader>
            <CardContent className="mt-2">
              <CardDescription className="text-[var(--light-gray)] text-base">
                GPT-5 and Gemini 2.5 Flash extract entities, topics, and generate structured data with multi-source enrichment
              </CardDescription>
            </CardContent>
          </Card>

          <Card variant="glass" hover="lift" padding="lg">
            <CardHeader>
              <CardTitle className="text-white text-lg">⚡ Fast & Cached</CardTitle>
            </CardHeader>
            <CardContent className="mt-2">
              <CardDescription className="text-[var(--light-gray)] text-base">
                Smart 7-day entity caching and circuit breaker logic reduce costs and speed up analysis
              </CardDescription>
            </CardContent>
          </Card>

          <Card variant="glass" hover="lift" padding="lg">
            <CardHeader>
              <CardTitle className="text-white text-lg">🔗 Easy Sharing</CardTitle>
            </CardHeader>
            <CardContent className="mt-2">
              <CardDescription className="text-[var(--light-gray)] text-base">
                Share your analyses with public links and export structured data instantly
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
