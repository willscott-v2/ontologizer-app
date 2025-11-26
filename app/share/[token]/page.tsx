"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/design-system/card";
import { LoadingSpinner } from "@/components/ui/design-system/loading-spinner";
import Link from "next/link";

interface SharedAnalysis {
  id: string;
  url: string;
  title: string;
  entities: any[];
  topics: any[];
  sentiment: { score: string; confidence: number };
  content_structure: {
    mainTopic: string;
    summary: string;
    keyPoints: string[];
    queryFanout?: {
      relatedQueries: string[];
      topicalGaps: string[];
      competitorQueries: string[];
      longtailQueries: string[];
    };
    contentRecommendations?: {
      recommendations: Array<{
        category: string;
        title: string;
        description: string;
        priority: string;
        suggestedHeading?: string;
      }>;
      existingOutline?: Array<{
        heading: string;
        level: number;
      }>;
      suggestedOutline: Array<{
        heading: string;
        level: number;
        reason: string;
        isNew?: boolean;
      }>;
      overallScore: number;
    };
  };
  json_ld: any;
  total_cost_usd: number;
  openai_total_tokens: number;
  gemini_total_tokens?: number;
  status: string;
  created_at: string;
}

export default function SharedAnalysisPage() {
  const params = useParams();
  const [analysis, setAnalysis] = useState<SharedAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSharedAnalysis() {
      if (!params.token) return;

      try {
        const response = await fetch(`/api/share/${params.token}`);
        if (response.ok) {
          const data = await response.json();
          setAnalysis(data);
        } else if (response.status === 404) {
          setError("This analysis is no longer available or the link has expired.");
        } else {
          setError("Failed to load shared analysis");
        }
      } catch (err) {
        console.error("Failed to fetch shared analysis:", err);
        setError("Failed to load shared analysis");
      } finally {
        setLoading(false);
      }
    }

    fetchSharedAnalysis();
  }, [params.token]);

  const copyJsonLd = () => {
    if (!analysis?.json_ld) return;
    navigator.clipboard.writeText(JSON.stringify(analysis.json_ld, null, 2));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--dark-blue)] to-[var(--lighter-blue)]">
        <LoadingSpinner size="xl" label="Loading shared analysis..." />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--dark-blue)] to-[var(--lighter-blue)]">
        <Card variant="glass" padding="lg" className="max-w-md text-center">
          <CardContent>
            <p className="text-[var(--error-red)] text-xl mb-4">{error || "Analysis not found"}</p>
            <p className="text-[var(--medium-gray)] mb-6">
              The shared link may have been revoked by the owner.
            </p>
            <Link href="/">
              <Button>Go to Ontologizer</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--dark-blue)] to-[var(--lighter-blue)] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs bg-[var(--info-blue)]/20 text-[var(--info-blue)] px-3 py-1 rounded-full">
                Shared Analysis
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-2">
              {analysis.title || "Untitled Analysis"}
            </h1>
            <p className="text-[var(--light-gray)]">{analysis.url}</p>
            <p className="text-[var(--medium-gray)] text-sm mt-2">
              Analyzed on {new Date(analysis.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/">
              <Button variant="secondary">
                Try Ontologizer
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Topic & Summary */}
        <Card variant="glass" padding="lg" className="mb-6">
          <CardHeader>
            <CardTitle className="text-white text-xl">Main Topic</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gradient-orange mb-4">
              {analysis.content_structure?.mainTopic || "N/A"}
            </p>
            <p className="text-[var(--light-gray)]">
              {analysis.content_structure?.summary || "No summary available."}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          {/* Key Points */}
          <Card variant="glass" padding="lg">
            <CardHeader>
              <CardTitle className="text-white">Key Points</CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.content_structure?.keyPoints?.length ? (
                <ul className="space-y-2">
                  {analysis.content_structure.keyPoints.map((point: string, i: number) => (
                    <li key={i} className="text-[var(--light-gray)] text-sm flex gap-2">
                      <span className="text-[var(--orange-accent)]">-</span>
                      {point}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[var(--medium-gray)]">No key points extracted.</p>
              )}
            </CardContent>
          </Card>

          {/* Sentiment & Stats */}
          <Card variant="glass" padding="lg">
            <CardHeader>
              <CardTitle className="text-white">Analysis Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[var(--medium-gray)] text-xs uppercase">Sentiment</p>
                  <p className={`text-lg font-semibold ${
                    analysis.sentiment?.score === "positive" ? "text-green-400" :
                    analysis.sentiment?.score === "negative" ? "text-red-400" :
                    "text-gray-400"
                  }`}>
                    {analysis.sentiment?.score || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--medium-gray)] text-xs uppercase">Confidence</p>
                  <p className="text-lg font-semibold text-white">
                    {analysis.sentiment?.confidence ? `${Math.round(analysis.sentiment.confidence * 100)}%` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--medium-gray)] text-xs uppercase">Entities</p>
                  <p className="text-lg font-semibold text-white">
                    {analysis.entities?.length || 0}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--medium-gray)] text-xs uppercase">Topics</p>
                  <p className="text-lg font-semibold text-white">
                    {analysis.topics?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Entities */}
        <Card variant="glass" padding="lg" className="mb-6">
          <CardHeader>
            <CardTitle className="text-white">
              Entities ({analysis.entities?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.entities?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-2 text-[var(--medium-gray)] font-medium">Entity</th>
                      <th className="text-left py-3 px-2 text-[var(--medium-gray)] font-medium">Type</th>
                      <th className="text-left py-3 px-2 text-[var(--medium-gray)] font-medium">Confidence</th>
                      <th className="text-left py-3 px-2 text-[var(--medium-gray)] font-medium">Links</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.entities.map((entity: any, i: number) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-2 text-white font-medium">{entity.name}</td>
                        <td className="py-3 px-2 text-[var(--light-gray)]">{entity.type}</td>
                        <td className="py-3 px-2 text-[var(--light-gray)]">
                          {Math.round((entity.confidence || 0) * 100)}%
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-2">
                            {entity.wikipediaUrl && (
                              <a href={entity.wikipediaUrl} target="_blank" rel="noopener noreferrer"
                                 className="text-[var(--info-blue)] hover:underline text-xs">Wiki</a>
                            )}
                            {entity.wikidataUrl && (
                              <a href={entity.wikidataUrl} target="_blank" rel="noopener noreferrer"
                                 className="text-[var(--info-blue)] hover:underline text-xs">Wikidata</a>
                            )}
                            {entity.knowledgeGraphUrl && (
                              <a href={entity.knowledgeGraphUrl} target="_blank" rel="noopener noreferrer"
                                 className="text-[var(--info-blue)] hover:underline text-xs">KG</a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[var(--medium-gray)]">No entities extracted.</p>
            )}
          </CardContent>
        </Card>

        {/* Topics */}
        <Card variant="glass" padding="lg" className="mb-6">
          <CardHeader>
            <CardTitle className="text-white">
              Topics ({analysis.topics?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.topics?.length ? (
              <div className="flex flex-wrap gap-2">
                {analysis.topics.map((topic: any, i: number) => {
                  const name = typeof topic === "string" ? topic : topic.name;
                  const salience = typeof topic === "object" ? topic.salience : null;
                  const isPrimary = typeof topic === "object" && topic.category === "primary";
                  return (
                    <span
                      key={i}
                      className={`px-3 py-1.5 rounded-full text-sm ${
                        isPrimary
                          ? "bg-[var(--orange-accent)]/20 text-[var(--orange-accent)] border border-[var(--orange-accent)]/30"
                          : "bg-white/10 text-[var(--light-gray)] border border-white/10"
                      }`}
                    >
                      {name}
                      {salience && <span className="ml-1 opacity-60">{salience}</span>}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-[var(--medium-gray)]">No topics extracted.</p>
            )}
          </CardContent>
        </Card>

        {/* Query Fanout */}
        {analysis.content_structure?.queryFanout && (
          <Card variant="glass" padding="lg" className="mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                Query Fanout
                <span className="text-xs bg-[var(--info-blue)]/20 text-[var(--info-blue)] px-2 py-1 rounded-full font-normal">
                  Gemini
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {analysis.content_structure.queryFanout.relatedQueries?.length > 0 && (
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <h4 className="text-sm font-semibold text-[var(--orange-accent)] mb-3 uppercase tracking-wide">
                      Related Queries
                    </h4>
                    <ul className="space-y-2">
                      {analysis.content_structure.queryFanout.relatedQueries.map((query, i) => (
                        <li key={i} className="text-sm text-[var(--light-gray)] flex items-start gap-2">
                          <span className="text-[var(--orange-accent)] mt-0.5">-</span>
                          {query}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.content_structure.queryFanout.topicalGaps?.length > 0 && (
                  <div className="p-4 rounded-lg bg-[var(--warning-yellow)]/5 border border-[var(--warning-yellow)]/20">
                    <h4 className="text-sm font-semibold text-[var(--warning-yellow)] mb-3 uppercase tracking-wide">
                      Topical Gaps
                    </h4>
                    <ul className="space-y-2">
                      {analysis.content_structure.queryFanout.topicalGaps.map((gap, i) => (
                        <li key={i} className="text-sm text-[var(--light-gray)] flex items-start gap-2">
                          <span className="text-[var(--warning-yellow)] mt-0.5">!</span>
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.content_structure.queryFanout.competitorQueries?.length > 0 && (
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <h4 className="text-sm font-semibold text-[var(--info-blue)] mb-3 uppercase tracking-wide">
                      Competitor Queries
                    </h4>
                    <ul className="space-y-2">
                      {analysis.content_structure.queryFanout.competitorQueries.map((query, i) => (
                        <li key={i} className="text-sm text-[var(--light-gray)] flex items-start gap-2">
                          <span className="text-[var(--info-blue)] mt-0.5">-</span>
                          {query}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.content_structure.queryFanout.longtailQueries?.length > 0 && (
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <h4 className="text-sm font-semibold text-[var(--success-green)] mb-3 uppercase tracking-wide">
                      Long-tail Queries
                    </h4>
                    <ul className="space-y-2">
                      {analysis.content_structure.queryFanout.longtailQueries.map((query, i) => (
                        <li key={i} className="text-sm text-[var(--light-gray)] flex items-start gap-2">
                          <span className="text-[var(--success-green)] mt-0.5">-</span>
                          {query}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* JSON-LD */}
        <Card variant="glass" padding="lg" className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white">JSON-LD Structured Data</CardTitle>
              <Button variant="secondary" onClick={copyJsonLd}>
                Copy JSON-LD
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="bg-black/30 rounded-lg p-4 overflow-x-auto text-sm text-[var(--light-gray)]">
              {JSON.stringify(analysis.json_ld, null, 2)}
            </pre>
          </CardContent>
        </Card>

        {/* Footer CTA */}
        <div className="text-center py-8">
          <p className="text-[var(--medium-gray)] mb-4">
            Want to analyze your own URLs?
          </p>
          <Link href="/">
            <Button>Get Started with Ontologizer</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
