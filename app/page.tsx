"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/design-system/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/design-system/card";
import { LoadingSpinner } from "@/components/ui/design-system/loading-spinner";
import Link from "next/link";
import Image from "next/image";

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
    <div>
      {/* Header with Search Influence branding */}
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
              <div className="tagline">Optimize Your Content for AI Discovery</div>
            </div>
            <div className="header-description">
              <p>
                Generate comprehensive JSON-LD structured data with AI-powered entity extraction.
                Help search engines and AI systems understand your content through proper
                Schema.org markup, named entities, and semantic relationships.
              </p>
              <p style={{ marginTop: '20px', fontSize: '1rem', color: 'var(--orange-accent)' }}>
                <a href="https://www.searchinfluence.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--orange-accent)', textDecoration: 'underline' }}>
                  Powered by Search Influence - AI SEO Experts
                </a>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[var(--dark-blue)] to-[var(--lighter-blue)]">
        <div className="max-w-4xl text-center space-y-8">
          <div className="flex gap-4 justify-center mt-8">
            <Link href="/login">
              <Button size="lg">Get Started</Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <Card variant="glass" hover="lift" padding="lg">
              <CardHeader>
                <CardTitle className="text-white text-lg">AI-Powered</CardTitle>
              </CardHeader>
              <CardContent className="mt-2">
                <CardDescription className="text-[var(--light-gray)] text-base">
                  GPT-5 and Gemini 2.5 Flash extract entities, topics, and generate structured data with multi-source enrichment
                </CardDescription>
              </CardContent>
            </Card>

            <Card variant="glass" hover="lift" padding="lg">
              <CardHeader>
                <CardTitle className="text-white text-lg">Fast & Cached</CardTitle>
              </CardHeader>
              <CardContent className="mt-2">
                <CardDescription className="text-[var(--light-gray)] text-base">
                  Smart 7-day entity caching and circuit breaker logic reduce costs and speed up analysis
                </CardDescription>
              </CardContent>
            </Card>

            <Card variant="glass" hover="lift" padding="lg">
              <CardHeader>
                <CardTitle className="text-white text-lg">Easy Sharing</CardTitle>
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

      {/* About Section Header */}
      <div style={{
        background: 'var(--lighter-blue)',
        paddingTop: '60px',
        paddingBottom: '20px'
      }}>
        <div className="container">
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '600',
            color: 'var(--white)',
            textAlign: 'center',
            margin: '0',
          }}>
            About The Ontologizer
          </h2>
        </div>
      </div>

      {/* Features Section */}
      <div className="features" style={{ paddingTop: '40px' }}>
        <div className="container">
          <div className="feature">
            <div className="feature-icon">🎯</div>
            <h3>Entity Extraction</h3>
            <p>AI-powered named entity recognition identifies people, organizations, places, and concepts that matter for knowledge graphs.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">⚡</div>
            <h3>Schema.org Generation</h3>
            <p>Automatically generate comprehensive JSON-LD structured data with proper Schema.org types for rich search results.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">📊</div>
            <h3>Knowledge Graph Ready</h3>
            <p>Structure your content for AI systems, knowledge graphs, and semantic search with machine-readable entity relationships.</p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="faq-section" style={{
        background: 'var(--background-gray)',
        padding: '40px 0',
        marginTop: '40px'
      }}>
        <div className="container">
          <h2 style={{
            textAlign: 'center',
            fontSize: '2.2rem',
            fontWeight: '800',
            color: 'var(--dark-blue)',
            marginBottom: '40px'
          }}>
            Frequently Asked Questions
          </h2>

          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* FAQ Item 1 */}
            <details style={{
              marginBottom: '16px',
              background: 'var(--white)',
              borderRadius: '12px',
              border: '1px solid var(--border-gray)',
              overflow: 'hidden'
            }}>
              <summary style={{
                padding: '25px 30px',
                cursor: 'pointer',
                fontSize: '1.1rem',
                fontWeight: '600',
                color: 'var(--dark-blue)',
                backgroundColor: 'var(--white)',
                borderBottom: '1px solid var(--border-gray)',
                listStyle: 'none',
                position: 'relative'
              }}>
                <span style={{ marginRight: '15px' }}>❓</span>
                What is The Ontologizer and who is it for?
                <span style={{
                  position: 'absolute',
                  right: '30px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '1.2rem',
                  transition: 'transform 0.3s ease'
                }}>▼</span>
              </summary>
              <div style={{ padding: '25px 30px', color: 'var(--lighter-blue)', lineHeight: '1.6' }}>
                <p>The Ontologizer is an AI-powered structured data generation tool designed for <strong>SEO professionals, content strategists, web developers, and digital marketers</strong> who want to optimize their content for AI-powered search and discovery.</p>
                <p style={{ marginTop: '15px' }}>It&apos;s particularly valuable for:</p>
                <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                  <li>Higher education institutions optimizing program pages for AI search</li>
                  <li>Healthcare organizations improving medical content discoverability</li>
                  <li>E-commerce sites enhancing product visibility in AI assistants</li>
                  <li>Content creators wanting to appear in AI overviews and featured snippets</li>
                  <li>Technical SEO teams implementing comprehensive Schema.org markup</li>
                </ul>
              </div>
            </details>

            {/* FAQ Item 2 */}
            <details style={{
              marginBottom: '16px',
              background: 'var(--white)',
              borderRadius: '12px',
              border: '1px solid var(--border-gray)',
              overflow: 'hidden'
            }}>
              <summary style={{
                padding: '25px 30px',
                cursor: 'pointer',
                fontSize: '1.1rem',
                fontWeight: '600',
                color: 'var(--dark-blue)',
                backgroundColor: 'var(--white)',
                borderBottom: '1px solid var(--border-gray)',
                listStyle: 'none',
                position: 'relative'
              }}>
                <span style={{ marginRight: '15px' }}>⚡</span>
                How does entity extraction improve AI search visibility?
                <span style={{
                  position: 'absolute',
                  right: '30px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '1.2rem',
                  transition: 'transform 0.3s ease'
                }}>▼</span>
              </summary>
              <div style={{ padding: '25px 30px', color: 'var(--lighter-blue)', lineHeight: '1.6' }}>
                <p>Named entities (people, organizations, places, concepts) are <strong>key signals for AI systems and knowledge graphs</strong>:</p>
                <ul style={{ marginTop: '15px', paddingLeft: '20px' }}>
                  <li><strong>Knowledge Graph Integration:</strong> LLMs and search engines use entities to connect your content to broader knowledge bases</li>
                  <li><strong>Semantic Understanding:</strong> Properly identified entities help AI understand what your content is truly about</li>
                  <li><strong>Machine-Readable Format:</strong> Schema.org markup makes entities parseable by crawlers and AI systems</li>
                  <li><strong>AI Overview Eligibility:</strong> Content with clear entity structure is more likely to appear in AI-generated overviews</li>
                  <li><strong>Rich Results:</strong> Entity-enriched structured data enables knowledge panels, rich snippets, and featured answers</li>
                </ul>
              </div>
            </details>

            {/* FAQ Item 3 */}
            <details style={{
              marginBottom: '16px',
              background: 'var(--white)',
              borderRadius: '12px',
              border: '1px solid var(--border-gray)',
              overflow: 'hidden'
            }}>
              <summary style={{
                padding: '25px 30px',
                cursor: 'pointer',
                fontSize: '1.1rem',
                fontWeight: '600',
                color: 'var(--dark-blue)',
                backgroundColor: 'var(--white)',
                borderBottom: '1px solid var(--border-gray)',
                listStyle: 'none',
                position: 'relative'
              }}>
                <span style={{ marginRight: '15px' }}>🎯</span>
                What makes this different from other structured data tools?
                <span style={{
                  position: 'absolute',
                  right: '30px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '1.2rem',
                  transition: 'transform 0.3s ease'
                }}>▼</span>
              </summary>
              <div style={{ padding: '25px 30px', color: 'var(--lighter-blue)', lineHeight: '1.6' }}>
                <p>The Ontologizer goes beyond basic schema generation with <strong>AI-powered intelligence</strong>:</p>
                <ul style={{ marginTop: '15px', paddingLeft: '20px' }}>
                  <li><strong>Dual AI Models:</strong> GPT-5 and Gemini 2.5 Flash work together for accurate entity recognition</li>
                  <li><strong>Multi-Source Enrichment:</strong> Entities are matched against knowledge bases for disambiguation</li>
                  <li><strong>Smart Caching:</strong> 7-day entity cache reduces costs and speeds up repeated analysis</li>
                  <li><strong>Comprehensive Output:</strong> Generates full JSON-LD with nested entities, not just basic schema types</li>
                  <li><strong>Relationship Mapping:</strong> Identifies semantic relationships between entities in your content</li>
                  <li><strong>Topic Extraction:</strong> Beyond entities, identifies key topics and themes for content optimization</li>
                </ul>
              </div>
            </details>

            {/* FAQ Item 4 */}
            <details style={{
              marginBottom: '16px',
              background: 'var(--white)',
              borderRadius: '12px',
              border: '1px solid var(--border-gray)',
              overflow: 'hidden'
            }}>
              <summary style={{
                padding: '25px 30px',
                cursor: 'pointer',
                fontSize: '1.1rem',
                fontWeight: '600',
                color: 'var(--dark-blue)',
                backgroundColor: 'var(--white)',
                borderBottom: '1px solid var(--border-gray)',
                listStyle: 'none',
                position: 'relative'
              }}>
                <span style={{ marginRight: '15px' }}>🔧</span>
                How does the analysis work and what data does it use?
                <span style={{
                  position: 'absolute',
                  right: '30px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '1.2rem',
                  transition: 'transform 0.3s ease'
                }}>▼</span>
              </summary>
              <div style={{ padding: '25px 30px', color: 'var(--lighter-blue)', lineHeight: '1.6' }}>
                <p>The analysis follows a multi-step process:</p>
                <ul style={{ marginTop: '15px', paddingLeft: '20px' }}>
                  <li><strong>Content Extraction:</strong> Fetches and parses your URL or text content</li>
                  <li><strong>Entity Recognition:</strong> AI models identify named entities (Person, Organization, Place, Event, Product, etc.)</li>
                  <li><strong>Entity Enrichment:</strong> Matches entities against knowledge bases for additional context and disambiguation</li>
                  <li><strong>Topic Analysis:</strong> Extracts key topics, themes, and semantic categories</li>
                  <li><strong>Schema Generation:</strong> Creates appropriate Schema.org types with proper nesting and relationships</li>
                  <li><strong>JSON-LD Output:</strong> Produces valid, ready-to-use structured data for your pages</li>
                </ul>
                <p style={{ marginTop: '15px' }}>The multi-model approach ensures <strong>accuracy and reliability</strong> in entity identification.</p>
              </div>
            </details>

            {/* FAQ Item 5 */}
            <details style={{
              marginBottom: '16px',
              background: 'var(--white)',
              borderRadius: '12px',
              border: '1px solid var(--border-gray)',
              overflow: 'hidden'
            }}>
              <summary style={{
                padding: '25px 30px',
                cursor: 'pointer',
                fontSize: '1.1rem',
                fontWeight: '600',
                color: 'var(--dark-blue)',
                backgroundColor: 'var(--white)',
                borderBottom: '1px solid var(--border-gray)',
                listStyle: 'none',
                position: 'relative'
              }}>
                <span style={{ marginRight: '15px' }}>📊</span>
                How should I use the generated structured data?
                <span style={{
                  position: 'absolute',
                  right: '30px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '1.2rem',
                  transition: 'transform 0.3s ease'
                }}>▼</span>
              </summary>
              <div style={{ padding: '25px 30px', color: 'var(--lighter-blue)', lineHeight: '1.6' }}>
                <p>To implement the generated JSON-LD structured data:</p>
                <ul style={{ marginTop: '15px', paddingLeft: '20px' }}>
                  <li><strong>Copy the JSON-LD:</strong> Use the export feature to copy the complete structured data</li>
                  <li><strong>Add to Your Page:</strong> Paste the JSON-LD into a <code style={{ background: 'var(--background-gray)', padding: '2px 6px', borderRadius: '4px' }}>&lt;script type=&quot;application/ld+json&quot;&gt;</code> tag in your page&apos;s <code style={{ background: 'var(--background-gray)', padding: '2px 6px', borderRadius: '4px' }}>&lt;head&gt;</code></li>
                  <li><strong>Validate:</strong> Test with Google&apos;s Rich Results Test or Schema.org validator</li>
                  <li><strong>Monitor:</strong> Check Google Search Console for rich result performance and errors</li>
                  <li><strong>Update Regularly:</strong> Re-analyze when content changes significantly</li>
                </ul>
                <p style={{ marginTop: '15px' }}><strong>Pro tip:</strong> Share your analysis with team members using the public link feature for collaboration.</p>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Footer with Search Influence branding */}
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
    </div>
  );
}
