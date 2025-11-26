"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/design-system/card";
import { LoadingSpinner } from "@/components/ui/design-system/loading-spinner";
import { FeedbackButton, FeedbackModal } from "@/components/ui/design-system/feedback-modal";

interface Analysis {
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
  is_public?: boolean;
  share_token?: string;
}

export default function AnalysisDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchAnalysis() {
      if (!user || !params.id) return;

      try {
        const response = await fetch(`/api/analyses/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setAnalysis(data);
        } else if (response.status === 404) {
          setError("Analysis not found");
        } else {
          setError("Failed to load analysis");
        }
      } catch (err) {
        console.error("Failed to fetch analysis:", err);
        setError("Failed to load analysis");
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchAnalysis();
    }
  }, [user, params.id]);

  const handleDelete = async () => {
    if (!analysis || !confirm("Are you sure you want to delete this analysis?")) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/analyses/${analysis.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        router.push("/dashboard");
      } else {
        alert("Failed to delete analysis");
      }
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Failed to delete analysis");
    } finally {
      setDeleting(false);
    }
  };

  const handleShare = async () => {
    if (!analysis) return;

    // If already shared, just copy the existing URL
    if (analysis.is_public && analysis.share_token) {
      const url = `${window.location.origin}/share/${analysis.share_token}`;
      setShareUrl(url);
      navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
      return;
    }

    setSharing(true);
    try {
      const response = await fetch(`/api/analyses/${analysis.id}/share`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setShareUrl(data.shareUrl);
        setAnalysis({ ...analysis, is_public: true, share_token: data.shareToken });
        navigator.clipboard.writeText(data.shareUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } else {
        alert("Failed to generate share link");
      }
    } catch (err) {
      console.error("Failed to share:", err);
      alert("Failed to generate share link");
    } finally {
      setSharing(false);
    }
  };

  const handleRevokeShare = async () => {
    if (!analysis || !confirm("Revoke public share link? Anyone with the link will no longer be able to view this analysis.")) return;

    try {
      const response = await fetch(`/api/analyses/${analysis.id}/share`, {
        method: "DELETE",
      });
      if (response.ok) {
        setShareUrl(null);
        setAnalysis({ ...analysis, is_public: false, share_token: undefined });
      } else {
        alert("Failed to revoke share link");
      }
    } catch (err) {
      console.error("Failed to revoke share:", err);
      alert("Failed to revoke share link");
    }
  };

  const downloadMarkdown = () => {
    if (!analysis) return;

    const domain = new URL(analysis.url).hostname;
    const date = new Date(analysis.created_at);
    const formattedDate = date.toLocaleString();

    let markdown = `# ${domain} - Ontologizer Analysis\n\n`;
    markdown += `**URL:** ${analysis.url}\n`;
    markdown += `**Analyzed:** ${formattedDate}\n`;
    markdown += `**Cost:** $${(analysis.total_cost_usd || 0).toFixed(4)}\n`;
    markdown += `**Tokens Used:** ${analysis.openai_total_tokens || 0}\n\n`;
    markdown += `---\n\n`;
    markdown += `## Main Topic\n\n**${analysis.content_structure?.mainTopic || "N/A"}**\n\n`;
    markdown += `---\n\n`;
    markdown += `## Summary\n\n${analysis.content_structure?.summary || "No summary available."}\n\n`;
    markdown += `---\n\n`;
    markdown += `## Key Points\n\n`;
    if (analysis.content_structure?.keyPoints?.length) {
      analysis.content_structure.keyPoints.forEach((point: string) => {
        markdown += `- ${point}\n`;
      });
    } else {
      markdown += "No key points available.\n";
    }
    markdown += `\n---\n\n`;
    markdown += `## Entities (${analysis.entities?.length || 0})\n\n`;
    if (analysis.entities?.length) {
      markdown += `| Entity | Type | Confidence | Sources | Links |\n`;
      markdown += `|--------|------|------------|---------|-------|\n`;
      analysis.entities.forEach((entity: any) => {
        const links = [];
        if (entity.wikipediaUrl) links.push(`[Wikipedia](${entity.wikipediaUrl})`);
        if (entity.wikidataUrl) links.push(`[Wikidata](${entity.wikidataUrl})`);
        if (entity.knowledgeGraphUrl) links.push(`[KG](${entity.knowledgeGraphUrl})`);
        if (entity.productOntologyUrl) links.push(`[PO](${entity.productOntologyUrl})`);
        markdown += `| ${entity.name} | ${entity.type} | ${Math.round((entity.confidence || 0) * 100)}% | ${entity.enrichmentSources || 0} | ${links.join(" · ") || "-"} |\n`;
      });
    }
    markdown += `\n---\n\n`;
    markdown += `## Topics & Salience\n\n`;
    if (analysis.topics?.length) {
      analysis.topics.forEach((topic: any) => {
        const name = typeof topic === "string" ? topic : topic.name;
        const salience = typeof topic === "object" ? topic.salience : null;
        const category = typeof topic === "object" ? topic.category : null;
        markdown += `- **${name}**${salience ? ` - ${salience}/100` : ""}${category ? ` (${category})` : ""}\n`;
      });
    }
    markdown += `\n---\n\n`;
    markdown += `## Sentiment\n\n`;
    markdown += `**Score:** ${analysis.sentiment?.score || "N/A"}\n`;
    markdown += `**Confidence:** ${analysis.sentiment?.confidence ? `${Math.round(analysis.sentiment.confidence * 100)}%` : "N/A"}\n\n`;
    markdown += `---\n\n`;
    markdown += `## JSON-LD Structured Data\n\n`;
    markdown += "```json\n";
    markdown += JSON.stringify(analysis.json_ld, null, 2);
    markdown += "\n```\n\n";
    markdown += `---\n\n*Generated by [Ontologizer](https://theontologizer.com) - Advanced Structured Data Tool*\n`;

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ontologizer-${domain}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--dark-blue)] to-[var(--lighter-blue)]">
        <LoadingSpinner size="xl" label="Loading analysis..." />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--dark-blue)] to-[var(--lighter-blue)]">
        <Card variant="glass" padding="lg" className="max-w-md text-center">
          <CardContent>
            <p className="text-[var(--error-red)] text-xl mb-4">{error || "Analysis not found"}</p>
            <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
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
            <Button variant="ghost" onClick={() => router.push("/dashboard")} className="mb-4">
              ← Back to Dashboard
            </Button>
            <h1 className="text-3xl font-extrabold text-white mb-2">
              {analysis.title || "Untitled Analysis"}
            </h1>
            <p className="text-[var(--light-gray)]">{analysis.url}</p>
            <p className="text-[var(--medium-gray)] text-sm mt-2">
              Analyzed on {new Date(analysis.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-3">
              <Button
                variant={analysis.is_public ? "secondary" : "default"}
                onClick={handleShare}
                disabled={sharing}
              >
                {sharing ? "Generating..." : shareCopied ? "Link Copied!" : analysis.is_public ? "Copy Share Link" : "Share"}
              </Button>
              <Button variant="secondary" onClick={downloadMarkdown}>
                Download Markdown
              </Button>
              <Button variant="ghost" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
            {analysis.is_public && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[var(--success-green)] flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Public link active
                </span>
                <button
                  onClick={handleRevokeShare}
                  className="text-[var(--error-red)] hover:underline text-xs"
                >
                  Revoke
                </button>
              </div>
            )}
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
                      <span className="text-[var(--orange-accent)]">•</span>
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
                  <p className="text-[var(--medium-gray)] text-xs uppercase">Tokens Used</p>
                  <p className="text-lg font-semibold text-white">
                    {analysis.openai_total_tokens?.toLocaleString() || 0}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--medium-gray)] text-xs uppercase">Cost</p>
                  <p className="text-lg font-semibold text-[var(--success-green)]">
                    ${(analysis.total_cost_usd || 0).toFixed(4)}
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
                      <th className="text-left py-3 px-2 text-[var(--medium-gray)] font-medium">Sources</th>
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
                        <td className="py-3 px-2 text-[var(--light-gray)]">
                          {entity.enrichmentSources || 0}
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

        {/* Content Recommendations */}
        {analysis.content_structure?.contentRecommendations && (
          <Card variant="glass" padding="lg" className="mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                Content Recommendations
                {analysis.content_structure.contentRecommendations.overallScore && (
                  <span className={`text-xs px-2 py-1 rounded-full font-normal ${
                    analysis.content_structure.contentRecommendations.overallScore >= 80
                      ? 'bg-[var(--success-green)]/20 text-[var(--success-green)]'
                      : analysis.content_structure.contentRecommendations.overallScore >= 60
                      ? 'bg-[var(--warning-yellow)]/20 text-[var(--warning-yellow)]'
                      : 'bg-[var(--error-red)]/20 text-[var(--error-red)]'
                  }`}>
                    Score: {analysis.content_structure.contentRecommendations.overallScore}/100
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.content_structure.contentRecommendations.recommendations?.length > 0 && (
                <div className="space-y-3 mb-6">
                  {analysis.content_structure.contentRecommendations.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-lg border ${
                        rec.priority === 'high'
                          ? 'bg-[var(--error-red)]/5 border-[var(--error-red)]/20'
                          : rec.priority === 'medium'
                          ? 'bg-[var(--warning-yellow)]/5 border-[var(--warning-yellow)]/20'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium uppercase ${
                            rec.category === 'semantic_gap'
                              ? 'bg-purple-500/20 text-purple-400'
                              : rec.category === 'content_depth'
                              ? 'bg-blue-500/20 text-blue-400'
                              : rec.category === 'structure'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {rec.category?.replace('_', ' ')}
                          </span>
                          <h4 className="text-white font-medium">{rec.title}</h4>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          rec.priority === 'high'
                            ? 'bg-[var(--error-red)]/20 text-[var(--error-red)]'
                            : rec.priority === 'medium'
                            ? 'bg-[var(--warning-yellow)]/20 text-[var(--warning-yellow)]'
                            : 'bg-white/10 text-[var(--light-gray)]'
                        }`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--light-gray)]">{rec.description}</p>
                      {rec.suggestedHeading && (
                        <p className="text-sm text-[var(--orange-accent)] mt-2 font-mono">
                          Suggested: &ldquo;{rec.suggestedHeading}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Outline Comparison: Existing vs Suggested */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Existing Outline */}
                {(analysis.content_structure.contentRecommendations.existingOutline?.length ?? 0) > 0 && (
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <h4 className="text-sm font-semibold text-[var(--medium-gray)] mb-3 uppercase tracking-wide flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--medium-gray)]"></span>
                      Current Outline
                    </h4>
                    <div className="space-y-2">
                      {analysis.content_structure.contentRecommendations.existingOutline!.map((item: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-start gap-2"
                          style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                        >
                          <span className="text-[var(--medium-gray)] font-mono text-xs mt-0.5">
                            H{item.level}
                          </span>
                          <p className="text-[var(--light-gray)] text-sm">{item.heading}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Improved Outline */}
                {(analysis.content_structure.contentRecommendations.suggestedOutline?.length ?? 0) > 0 && (
                  <div className="p-4 rounded-lg bg-[var(--success-green)]/5 border border-[var(--success-green)]/20">
                    <h4 className="text-sm font-semibold text-[var(--success-green)] mb-3 uppercase tracking-wide flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--success-green)]"></span>
                      Recommended Outline
                    </h4>
                    <div className="space-y-2">
                      {analysis.content_structure.contentRecommendations.suggestedOutline!.map((item: any, i: number) => (
                        <div
                          key={i}
                          className={`flex items-start gap-2 ${item.isNew ? 'pl-1 border-l-2 border-[var(--success-green)]' : ''}`}
                          style={{ marginLeft: `${(item.level - 1) * 12}px` }}
                        >
                          <span className={`font-mono text-xs mt-0.5 ${
                            item.isNew ? 'text-[var(--success-green)]' : 'text-[var(--medium-gray)]'
                          }`}>
                            H{item.level}
                          </span>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              item.isNew ? 'text-[var(--success-green)]' : 'text-white'
                            }`}>
                              {item.heading}
                              {item.isNew && (
                                <span className="ml-2 text-xs bg-[var(--success-green)]/20 text-[var(--success-green)] px-1.5 py-0.5 rounded">
                                  NEW
                                </span>
                              )}
                            </p>
                            {item.reason && (
                              <p className="text-xs text-[var(--medium-gray)] mt-0.5">{item.reason}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Legend */}
              {((analysis.content_structure.contentRecommendations.existingOutline?.length ?? 0) > 0 ||
                (analysis.content_structure.contentRecommendations.suggestedOutline?.length ?? 0) > 0) && (
                <div className="flex items-center gap-4 mt-3 text-xs text-[var(--medium-gray)]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--medium-gray)]"></span>
                    Existing heading
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--success-green)]"></span>
                    New recommended heading
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* JSON-LD */}
        <Card variant="glass" padding="lg">
          <CardHeader>
            <CardTitle className="text-white">JSON-LD Structured Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-black/30 rounded-lg p-4 overflow-x-auto text-sm text-[var(--light-gray)]">
              {JSON.stringify(analysis.json_ld, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* Feedback Button & Modal */}
      <FeedbackButton onClick={() => setFeedbackOpen(true)} />
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        analysisId={analysis.id}
      />
    </div>
  );
}
