"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/design-system/button";
import { Input } from "@/components/ui/design-system/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/design-system/card";
import { LoadingSpinner } from "@/components/ui/design-system/loading-spinner";
import { FeedbackButton, FeedbackModal } from "@/components/ui/design-system/feedback-modal";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AnalyzePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [bypassCache, setBypassCache] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[var(--dark-blue)] to-[var(--lighter-blue)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults(null);
    setAnalyzing(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, bypassCache }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const generateMarkdown = () => {
    if (!results) return "";

    const urlObj = new URL(url);
    const pageTitle = urlObj.hostname.replace(/^www\./, "");
    const timestamp = new Date().toISOString();

    let markdown = `# ${pageTitle} - Ontologizer Analysis\n\n`;
    markdown += `**URL:** ${url}\n`;
    markdown += `**Analyzed:** ${new Date().toLocaleString()}\n`;
    markdown += `**Cost:** $${results.cost?.toFixed(4) || "0.0000"}\n`;
    markdown += `**Tokens Used:** ${results.tokensUsed || 0}\n\n`;
    markdown += `---\n\n`;

    // Main Topic
    if (results.mainTopic) {
      markdown += `## Main Topic\n\n`;
      markdown += `**${results.mainTopic}**\n\n`;
      markdown += `---\n\n`;
    }

    // Summary
    if (results.summary) {
      markdown += `## Summary\n\n`;
      markdown += `${results.summary}\n\n`;
      markdown += `---\n\n`;
    }

    // Key Points
    if (results.keyPoints && results.keyPoints.length > 0) {
      markdown += `## Key Points\n\n`;
      results.keyPoints.forEach((point: string) => {
        markdown += `- ${point}\n`;
      });
      markdown += `\n---\n\n`;
    }

    // Entities
    if (results.entities && results.entities.length > 0) {
      markdown += `## Entities (${results.entities.length})\n\n`;
      markdown += `| Entity | Type | Confidence | Sources | Links |\n`;
      markdown += `|--------|------|------------|---------|-------|\n`;

      results.entities.forEach((entity: any) => {
        const confidence = entity.confidence ? `${Math.round(entity.confidence * 100)}%` : "N/A";
        const sources = entity.enrichmentSources || 0;
        const links = [];

        if (entity.wikipediaUrl) links.push(`[Wikipedia](${entity.wikipediaUrl})`);
        if (entity.wikidataUrl) links.push(`[Wikidata](${entity.wikidataUrl})`);
        if (entity.knowledgeGraphUrl) links.push(`[KG](${entity.knowledgeGraphUrl})`);
        if (entity.productOntologyUrl) links.push(`[PO](${entity.productOntologyUrl})`);

        const linksStr = links.length > 0 ? links.join(" · ") : "N/A";

        markdown += `| ${entity.name} | ${entity.type} | ${confidence} | ${sources} | ${linksStr} |\n`;
      });

      markdown += `\n---\n\n`;
    }

    // Topics & Salience
    if (results.topics && results.topics.length > 0) {
      markdown += `## Topics & Salience\n\n`;

      const sortedTopics = [...results.topics].sort((a: any, b: any) => (b.salience || 0) - (a.salience || 0));

      sortedTopics.forEach((topic: any) => {
        const topicName = typeof topic === 'string' ? topic : topic.name;
        const salience = typeof topic === 'object' ? topic.salience : null;
        const category = typeof topic === 'object' ? topic.category : null;

        if (salience !== null) {
          markdown += `- **${topicName}** - ${salience}/100`;
          if (category) {
            markdown += ` (${category})`;
          }
          markdown += `\n`;
        } else {
          markdown += `- ${topicName}\n`;
        }
      });

      markdown += `\n---\n\n`;
    }

    // Sentiment
    if (results.sentiment) {
      markdown += `## Sentiment\n\n`;
      markdown += `**Score:** ${results.sentiment.score}\n`;
      if (results.sentiment.confidence) {
        markdown += `**Confidence:** ${Math.round(results.sentiment.confidence * 100)}%\n`;
      }
      markdown += `\n---\n\n`;
    }

    // JSON-LD
    if (results.jsonLd) {
      markdown += `## JSON-LD Structured Data\n\n`;
      markdown += `\`\`\`json\n`;
      markdown += JSON.stringify(results.jsonLd, null, 2);
      markdown += `\n\`\`\`\n\n`;
    }

    markdown += `---\n\n`;
    markdown += `*Generated by [Ontologizer](https://theontologizer.com) - Advanced Structured Data Tool*\n`;

    return markdown;
  };

  const downloadMarkdown = () => {
    const markdown = generateMarkdown();
    const blob = new Blob([markdown], { type: "text/markdown" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;

    // Generate filename from analyzed URL
    const urlObj = new URL(url);
    const filename = `ontologizer-${urlObj.hostname.replace(/^www\./, "")}-${Date.now()}.md`;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--dark-blue)] to-[var(--lighter-blue)] py-8">
      <div className="container mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-white mb-2">URL Analyzer</h1>
            <p className="text-base text-[var(--light-gray)]">
              Analyze any URL to extract entities, topics, and generate structured data
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </div>

        {/* Input Card */}
        <Card variant="glass" padding="lg" className="mb-8">
          <CardHeader>
            <CardTitle className="text-white text-xl">Enter URL</CardTitle>
            <CardDescription className="text-[var(--light-gray)] text-base mt-1">
              Paste a URL to analyze its content and extract structured data
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-4">
            <form onSubmit={handleAnalyze} className="space-y-4">
              <Input
                type="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                disabled={analyzing}
                variant="glass"
                className="text-lg py-3"
              />
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  id="bypassCache"
                  checked={bypassCache}
                  onChange={(e) => setBypassCache(e.target.checked)}
                  disabled={analyzing}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-[var(--orange-accent)] focus:ring-[var(--orange-accent)] focus:ring-offset-0"
                />
                <label htmlFor="bypassCache" className="text-[var(--light-gray)] cursor-pointer">
                  Bypass entity cache (force fresh enrichment)
                </label>
              </div>
              <Button type="submit" disabled={analyzing} size="lg">
                {analyzing ? "Analyzing..." : "Analyze URL"}
              </Button>
            </form>

            {error && (
              <div className="mt-4 p-4 bg-red-900/20 border border-red-800/30 rounded-md">
                <p className="text-[var(--error-red)] text-sm">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading State */}
        {analyzing && (
          <Card variant="glass" padding="lg">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <p className="text-white mt-4 text-lg">Analyzing URL...</p>
              <p className="text-[var(--light-gray)] text-sm mt-1">
                Extracting entities, topics, and structured data
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results && !analyzing && (
          <Card variant="glass" padding="lg">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-white text-2xl">Analysis Results</CardTitle>
                  <CardDescription className="text-[var(--light-gray)] text-base mt-1">
                    {results.cached ? "✓ Cached results" : "✓ Fresh analysis"}
                    {results.cost && ` • Cost: $${results.cost.toFixed(4)}`}
                  </CardDescription>
                </div>
                <Button variant="secondary" onClick={downloadMarkdown} size="sm">
                  Download Markdown
                </Button>
              </div>
            </CardHeader>
            <CardContent className="mt-4">
              <div className="space-y-8">
                {/* Main Topic */}
                {results.mainTopic && (
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">Main Topic</h3>
                    <div className="p-4 rounded-lg bg-[var(--orange-accent)]/10 border-2 border-[var(--orange-accent)]/30">
                      <p className="text-2xl font-bold text-gradient-orange">
                        {results.mainTopic}
                      </p>
                    </div>
                  </div>
                )}

                {/* Entities */}
                {results.entities && results.entities.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-white mb-4">Entities</h3>
                    <div className="grid gap-4">
                      {results.entities.map((entity: any, index: number) => (
                        <div
                          key={index}
                          className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <p className="font-semibold text-white text-lg">{entity.name}</p>
                              <p className="text-sm text-[var(--light-gray)] mt-1">
                                {entity.type}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {entity.confidence && (
                                <span className="text-xs bg-[var(--orange-accent)] text-white px-3 py-1 rounded-full font-medium whitespace-nowrap">
                                  {Math.round(entity.confidence * 100)}%
                                </span>
                              )}
                              {entity.enrichmentSources > 0 && (
                                <span className="text-xs bg-[var(--success-green)] text-white px-3 py-1 rounded-full font-medium whitespace-nowrap">
                                  {entity.enrichmentSources} sources
                                </span>
                              )}
                            </div>
                          </div>

                          {entity.description && (
                            <p className="text-base text-[var(--light-gray)] mb-3">
                              {entity.description}
                            </p>
                          )}

                          {/* External Links */}
                          {(entity.wikipediaUrl || entity.wikidataUrl || entity.knowledgeGraphUrl || entity.productOntologyUrl) && (
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/10">
                              {entity.wikipediaUrl && (
                                <a
                                  href={entity.wikipediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[var(--orange-light)] hover:text-[var(--orange-accent)] underline"
                                >
                                  Wikipedia
                                </a>
                              )}
                              {entity.wikidataUrl && (
                                <a
                                  href={entity.wikidataUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[var(--orange-light)] hover:text-[var(--orange-accent)] underline"
                                >
                                  Wikidata
                                </a>
                              )}
                              {entity.knowledgeGraphUrl && (
                                <a
                                  href={entity.knowledgeGraphUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[var(--orange-light)] hover:text-[var(--orange-accent)] underline"
                                >
                                  Knowledge Graph
                                </a>
                              )}
                              {entity.productOntologyUrl && (
                                <a
                                  href={entity.productOntologyUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[var(--orange-light)] hover:text-[var(--orange-accent)] underline"
                                >
                                  Product Ontology
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Topics with Salience */}
                {results.topics && results.topics.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-white mb-4">Topics & Salience</h3>
                    <div className="grid gap-3">
                      {results.topics
                        .sort((a: any, b: any) => (b.salience || 0) - (a.salience || 0))
                        .map((topic: any, index: number) => {
                          const topicName = typeof topic === 'string' ? topic : topic.name;
                          const salience = typeof topic === 'object' ? topic.salience : null;
                          const category = typeof topic === 'object' ? topic.category : null;

                          return (
                            <div
                              key={index}
                              className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <span className="text-base text-white font-medium">
                                  {topicName}
                                </span>
                                {category && (
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    category === 'primary'
                                      ? 'bg-[var(--orange-accent)] text-white'
                                      : 'bg-white/15 text-[var(--light-gray)]'
                                  }`}>
                                    {category}
                                  </span>
                                )}
                              </div>
                              {salience !== null && (
                                <div className="flex items-center gap-3">
                                  <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-[var(--orange-accent)] to-[var(--orange-light)] transition-all duration-500"
                                      style={{ width: `${salience}%` }}
                                    />
                                  </div>
                                  <span className="text-sm text-[var(--light-gray)] font-mono min-w-[3rem] text-right">
                                    {salience}/100
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Sentiment */}
                {results.sentiment && (
                  <div>
                    <h3 className="text-xl font-bold text-white mb-4">Sentiment</h3>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="capitalize text-white text-lg font-medium">
                          {results.sentiment.score}
                        </span>
                        {results.sentiment.confidence && (
                          <span className="text-xs bg-white/10 text-[var(--light-gray)] px-3 py-1 rounded-full">
                            {Math.round(results.sentiment.confidence * 100)}% confident
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Query Fanout - SEO Opportunities */}
                {results.queryFanout && (
                  <div>
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <span className="text-[var(--orange-accent)]">*</span>
                      Query Fanout
                      <span className="text-xs bg-[var(--info-blue)]/20 text-[var(--info-blue)] px-2 py-1 rounded-full font-normal">
                        Powered by Gemini
                      </span>
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Related Queries */}
                      {results.queryFanout.relatedQueries?.length > 0 && (
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                          <h4 className="text-sm font-semibold text-[var(--orange-accent)] mb-3 uppercase tracking-wide">
                            Related Queries
                          </h4>
                          <ul className="space-y-2">
                            {results.queryFanout.relatedQueries.map((query: string, i: number) => (
                              <li key={i} className="text-sm text-[var(--light-gray)] flex items-start gap-2">
                                <span className="text-[var(--orange-accent)] mt-0.5">-</span>
                                {query}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Topical Gaps */}
                      {results.queryFanout.topicalGaps?.length > 0 && (
                        <div className="p-4 rounded-lg bg-[var(--warning-yellow)]/5 border border-[var(--warning-yellow)]/20">
                          <h4 className="text-sm font-semibold text-[var(--warning-yellow)] mb-3 uppercase tracking-wide">
                            Topical Gaps
                          </h4>
                          <ul className="space-y-2">
                            {results.queryFanout.topicalGaps.map((gap: string, i: number) => (
                              <li key={i} className="text-sm text-[var(--light-gray)] flex items-start gap-2">
                                <span className="text-[var(--warning-yellow)] mt-0.5">!</span>
                                {gap}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Competitor Queries */}
                      {results.queryFanout.competitorQueries?.length > 0 && (
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                          <h4 className="text-sm font-semibold text-[var(--info-blue)] mb-3 uppercase tracking-wide">
                            Competitor Queries
                          </h4>
                          <ul className="space-y-2">
                            {results.queryFanout.competitorQueries.map((query: string, i: number) => (
                              <li key={i} className="text-sm text-[var(--light-gray)] flex items-start gap-2">
                                <span className="text-[var(--info-blue)] mt-0.5">-</span>
                                {query}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Long-tail Queries */}
                      {results.queryFanout.longtailQueries?.length > 0 && (
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                          <h4 className="text-sm font-semibold text-[var(--success-green)] mb-3 uppercase tracking-wide">
                            Long-tail Queries
                          </h4>
                          <ul className="space-y-2">
                            {results.queryFanout.longtailQueries.map((query: string, i: number) => (
                              <li key={i} className="text-sm text-[var(--light-gray)] flex items-start gap-2">
                                <span className="text-[var(--success-green)] mt-0.5">-</span>
                                {query}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Content Recommendations */}
                {results.contentRecommendations && (
                  <div>
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <span className="text-[var(--orange-accent)]">*</span>
                      Content Recommendations
                      {results.contentRecommendations.overallScore && (
                        <span className={`text-xs px-2 py-1 rounded-full font-normal ${
                          results.contentRecommendations.overallScore >= 80
                            ? 'bg-[var(--success-green)]/20 text-[var(--success-green)]'
                            : results.contentRecommendations.overallScore >= 60
                            ? 'bg-[var(--warning-yellow)]/20 text-[var(--warning-yellow)]'
                            : 'bg-[var(--error-red)]/20 text-[var(--error-red)]'
                        }`}>
                          Score: {results.contentRecommendations.overallScore}/100
                        </span>
                      )}
                    </h3>

                    {/* Recommendations by category */}
                    {results.contentRecommendations.recommendations?.length > 0 && (
                      <div className="space-y-3 mb-6">
                        {results.contentRecommendations.recommendations.map((rec: any, i: number) => (
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
                      {results.contentRecommendations.existingOutline?.length > 0 && (
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                          <h4 className="text-sm font-semibold text-[var(--medium-gray)] mb-3 uppercase tracking-wide flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[var(--medium-gray)]"></span>
                            Current Outline
                          </h4>
                          <div className="space-y-2">
                            {results.contentRecommendations.existingOutline.map((item: any, i: number) => (
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
                      {results.contentRecommendations.suggestedOutline?.length > 0 && (
                        <div className="p-4 rounded-lg bg-[var(--success-green)]/5 border border-[var(--success-green)]/20">
                          <h4 className="text-sm font-semibold text-[var(--success-green)] mb-3 uppercase tracking-wide flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[var(--success-green)]"></span>
                            Recommended Outline
                          </h4>
                          <div className="space-y-2">
                            {results.contentRecommendations.suggestedOutline.map((item: any, i: number) => (
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
                    {(results.contentRecommendations.existingOutline?.length > 0 ||
                      results.contentRecommendations.suggestedOutline?.length > 0) && (
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
                  </div>
                )}

                {/* JSON-LD Preview */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Structured Data (JSON-LD)</h3>
                  <pre className="p-4 bg-[var(--dark-blue)] text-[var(--light-gray)] rounded-lg overflow-x-auto text-sm border border-white/10 font-mono">
                    {JSON.stringify(results.jsonLd, null, 2)}
                  </pre>
                  <Button
                    variant="secondary"
                    className="mt-4"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(results.jsonLd, null, 2));
                    }}
                  >
                    Copy JSON-LD
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Feedback Button & Modal */}
      <FeedbackButton onClick={() => setFeedbackOpen(true)} />
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </div>
  );
}
