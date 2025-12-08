"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/design-system/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/design-system/card";
import { LoadingSpinner } from "@/components/ui/design-system/loading-spinner";
import { FeedbackButton, FeedbackModal } from "@/components/ui/design-system/feedback-modal";
import Image from "next/image";

interface Analysis {
  id: string;
  url: string;
  title: string;
  entities: any[];
  topics: any[];
  sentiment: { score: string; confidence: number };
  content_structure: { mainTopic: string; summary: string };
  total_cost_usd: number;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(true);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch recent analyses
  useEffect(() => {
    async function fetchAnalyses() {
      if (!user) return;

      try {
        const response = await fetch("/api/analyses?limit=10");
        if (response.ok) {
          const data = await response.json();
          setAnalyses(data.analyses || []);
        }
      } catch (error) {
        console.error("Failed to fetch analyses:", error);
      } finally {
        setLoadingAnalyses(false);
      }
    }

    if (user) {
      fetchAnalyses();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--dark-blue)] to-[var(--lighter-blue)]">
        <LoadingSpinner size="xl" label="Loading your dashboard..." />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="logo-section">
              <div className="logo-container">
                <a href="https://www.searchinfluence.com" target="_blank" rel="noopener noreferrer">
                  <Image src="/search-influence-logo.png" alt="Search Influence" className="si-logo" width={200} height={60} />
                </a>
              </div>
              <h1>The Ontologizer</h1>
              <div className="tagline">Dashboard</div>
            </div>
            <div className="header-description">
              <p>
                Welcome back, {user.email}
              </p>
              <p style={{ marginTop: '20px', fontSize: '1rem', color: 'var(--orange-accent)' }}>
                <a href="https://www.searchinfluence.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--orange-accent)', textDecoration: 'underline' }}>
                  Powered by Search Influence - AI SEO Experts
                </a>
              </p>
              <div style={{ marginTop: '20px' }}>
                <Button variant="secondary" onClick={signOut}>
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-gradient-to-br from-[var(--dark-blue)] to-[var(--lighter-blue)] p-8">
        <div className="max-w-7xl mx-auto">
          {/* Stats Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <Card variant="glass" hover="lift" padding="lg">
              <CardHeader>
                <CardTitle className="text-white">Analyses</CardTitle>
                <CardDescription className="text-[var(--light-gray)] text-base mt-1">
                  Total URL analyses
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-2">
                <p className="text-5xl font-extrabold text-gradient-orange">
                  {profile?.analyses_count || 0}
                </p>
              </CardContent>
            </Card>

            <Card variant="glass" hover="lift" padding="lg">
              <CardHeader>
                <CardTitle className="text-white">AI Usage & Cost</CardTitle>
                <CardDescription className="text-[var(--light-gray)] text-base mt-1">
                  Combined OpenAI + Gemini
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-2">
                <div className="space-y-3">
                  <div>
                    <p className="text-5xl font-extrabold text-gradient-orange">
                      {profile?.total_tokens_used?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-[var(--medium-gray)] mt-1">
                      Total tokens
                    </p>
                  </div>
                  <div className="pt-3 border-t border-white/10">
                    <p className="text-2xl font-bold text-[var(--success-green)]">
                      ${(profile?.total_cost_usd || 0).toFixed(4)}
                    </p>
                    <p className="text-sm text-[var(--medium-gray)] mt-1">
                      Estimated cost
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
                    <div>
                      <p className="text-[var(--light-gray)] font-medium">
                        {profile?.openai_tokens_used?.toLocaleString() || 0}
                      </p>
                      <p className="text-[var(--medium-gray)] text-xs">GPT-5</p>
                    </div>
                    <div>
                      <p className="text-[var(--light-gray)] font-medium">
                        {profile?.gemini_tokens_used?.toLocaleString() || 0}
                      </p>
                      <p className="text-[var(--medium-gray)] text-xs">Gemini</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass" hover="scale" padding="lg" className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-white">Quick Start</CardTitle>
                <CardDescription className="text-[var(--light-gray)] text-base mt-1">
                  Analyze a new URL
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-6">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => router.push("/analyze")}
                >
                  New Analysis
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Analyses */}
          <Card variant="glass" padding="lg">
            <CardHeader>
              <CardTitle className="text-white text-2xl">Recent Analyses</CardTitle>
              <CardDescription className="text-[var(--light-gray)] text-base mt-1">
                Your latest URL analyses
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-4">
              {loadingAnalyses ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : analyses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-6">
                    <svg
                      className="w-8 h-8 text-[var(--orange-accent)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-[var(--light-gray)] text-xl mb-3 font-semibold">
                    No analyses yet
                  </p>
                  <p className="text-[var(--medium-gray)] text-base mb-8 max-w-md mx-auto">
                    Start by analyzing your first URL to unlock insights!
                  </p>
                  <Button onClick={() => router.push("/analyze")}>
                    Start Analyzing
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {analyses.map((analysis) => (
                    <div
                      key={analysis.id}
                      className="group p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[var(--orange-accent)]/30 transition-all cursor-pointer"
                      onClick={() => router.push(`/analysis/${analysis.id}`)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold truncate group-hover:text-[var(--orange-accent)] transition-colors">
                            {analysis.title || "Untitled"}
                          </h3>
                          <p className="text-[var(--medium-gray)] text-sm truncate mt-1">
                            {analysis.url}
                          </p>
                          {analysis.content_structure?.mainTopic && (
                            <p className="text-[var(--light-gray)] text-sm mt-2">
                              <span className="text-[var(--orange-accent)] font-medium">Topic:</span>{" "}
                              {analysis.content_structure.mainTopic}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            analysis.sentiment?.score === "positive"
                              ? "bg-green-500/20 text-green-400"
                              : analysis.sentiment?.score === "negative"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-gray-500/20 text-gray-400"
                          }`}>
                            {analysis.sentiment?.score || "neutral"}
                          </span>
                          <span className="text-[var(--medium-gray)] text-xs">
                            {new Date(analysis.created_at).toLocaleDateString()}
                          </span>
                          {analysis.total_cost_usd != null && (
                            <span className="text-[var(--success-green)] text-xs">
                              ${analysis.total_cost_usd.toFixed(4)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
                        <span className="text-[var(--medium-gray)] text-xs">
                          {analysis.entities?.length || 0} entities
                        </span>
                        <span className="text-[var(--medium-gray)] text-xs">
                          {analysis.topics?.length || 0} topics
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="text-center">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <div className="logo-container" style={{ margin: '0 15px 0 0' }}>
                <a href="https://www.searchinfluence.com" target="_blank" rel="noopener noreferrer">
                  <Image src="/search-influence-logo.png" alt="Search Influence" className="si-logo" width={200} height={60} />
                </a>
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--white)', margin: '0 0 5px 0' }}>Search Influence</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--medium-gray)', margin: 0 }}>AI SEO Experts</p>
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--dark-gray)', margin: '0 0 20px 0', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
              Helping higher education institutions and healthcare organizations
              increase visibility and drive measurable growth through AI-powered SEO strategies.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', fontSize: '0.8rem', color: 'var(--dark-gray)' }}>
              <span>•</span>
              <a href="https://www.searchinfluence.com" target="_blank" rel="noopener noreferrer">
                Visit Search Influence
              </a>
              <span>•</span>
              <a href="#" style={{ color: 'var(--orange-accent)', textDecoration: 'none' }}>
                The Ontologizer v1.0.0
              </a>
              <span>•</span>
              <a href="https://ai-grader.searchinfluence.com" target="_blank" rel="noopener noreferrer">
                AI Website Grader
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Feedback Button & Modal */}
      <FeedbackButton onClick={() => setFeedbackOpen(true)} />
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </div>
  );
}
