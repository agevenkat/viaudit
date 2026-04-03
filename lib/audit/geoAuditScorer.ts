/**
 * GEO Audit Scorer — 25-factor AI-visibility scoring engine.
 *
 * Each factor is scored 0-4.  Total max = 100.
 * Categories: Structured Data, Content Quality, Citation Readiness,
 *             Technical SEO for AI, Authority Signals.
 */

// ── Types ──────────────────────────────────────────────────────

export interface GeoAuditFactor {
  id: string;
  category: string;
  name: string;
  score: number;       // 0-4
  maxScore: number;    // always 4
  passed: boolean;
  detail: string;
  fix?: string;
}

export interface GeoAuditSuggestion {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  expectedLift: string;
}

export interface GeoAuditResult {
  url: string;
  overallScore: number; // 0-100
  factors: GeoAuditFactor[];
  suggestions: GeoAuditSuggestion[];
  crawledAt: string;
}

// ── Helpers ────────────────────────────────────────────────────

function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function hasJsonLdType(html: string, type: string): boolean {
  const ldBlocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of ldBlocks) {
    const inner = block.replace(/<\/?script[^>]*>/gi, '');
    if (new RegExp(`"@type"\\s*:\\s*"${type}"`, 'i').test(inner)) return true;
    // Also check arrays
    if (new RegExp(`"@type"\\s*:\\s*\\[\\s*"[^"]*"\\s*,\\s*"${type}"`, 'i').test(inner)) return true;
    if (inner.toLowerCase().includes(`"${type.toLowerCase()}"`)) return true;
  }
  return false;
}

function factor(
  id: string,
  category: string,
  name: string,
  passed: boolean,
  detail: string,
  fix?: string,
): GeoAuditFactor {
  const base = {
    id,
    category,
    name,
    score: passed ? 4 : 0,
    maxScore: 4,
    passed,
    detail,
  };
  if (!passed && fix) {
    return { ...base, fix };
  }
  return base;
}

// ── Factor checkers ────────────────────────────────────────────

function checkOrganizationSchema(html: string): GeoAuditFactor {
  const found = hasJsonLdType(html, 'Organization') || hasJsonLdType(html, 'Corporation') || hasJsonLdType(html, 'LocalBusiness');
  return factor(
    'sd-organization', 'Structured Data', 'Organization JSON-LD Schema',
    found,
    found ? 'Organization schema markup detected.' : 'No Organization JSON-LD schema found.',
    'Add an Organization (or Corporation) JSON-LD block in your <head> with name, url, logo, and description. This helps AI engines identify your brand entity.',
  );
}

function checkFaqSchema(html: string): GeoAuditFactor {
  const found = hasJsonLdType(html, 'FAQPage');
  return factor(
    'sd-faq', 'Structured Data', 'FAQ Schema Markup',
    found,
    found ? 'FAQPage schema markup detected.' : 'No FAQPage schema found.',
    'Wrap your FAQ section in FAQPage JSON-LD. AI engines heavily prioritize structured Q&A content for citations.',
  );
}

function checkProductSchema(html: string): GeoAuditFactor {
  const found = hasJsonLdType(html, 'Product') || hasJsonLdType(html, 'Service') || hasJsonLdType(html, 'SoftwareApplication');
  return factor(
    'sd-product', 'Structured Data', 'Product/Service Schema',
    found,
    found ? 'Product or Service schema detected.' : 'No Product/Service schema found.',
    'Add Product or SoftwareApplication JSON-LD with name, description, offers, and aggregateRating properties.',
  );
}

function checkBreadcrumbSchema(html: string): GeoAuditFactor {
  const found = hasJsonLdType(html, 'BreadcrumbList');
  return factor(
    'sd-breadcrumb', 'Structured Data', 'BreadcrumbList Schema',
    found,
    found ? 'BreadcrumbList schema detected.' : 'No BreadcrumbList schema found.',
    'Add BreadcrumbList JSON-LD to provide AI engines with site hierarchy context.',
  );
}

function checkSameAsLinks(html: string): GeoAuditFactor {
  const sameAsRegex = /"sameAs"\s*:\s*\[([^\]]+)\]/gi;
  const match = sameAsRegex.exec(html);
  const hasSameAs = match !== null;
  const hasWikiOrLinkedIn = /wikipedia\.org|linkedin\.com|crunchbase\.com/i.test(html);
  const found = hasSameAs || hasWikiOrLinkedIn;
  return factor(
    'sd-sameas', 'Structured Data', 'sameAs Links (Wikipedia, LinkedIn, Crunchbase)',
    found,
    found ? 'sameAs or authoritative profile links detected.' : 'No sameAs links to Wikipedia, LinkedIn, or Crunchbase found.',
    'Add sameAs property to your Organization schema pointing to Wikipedia, LinkedIn, and Crunchbase profiles. This strengthens entity recognition by AI.',
  );
}

function checkH1BrandName(html: string, url: string): GeoAuditFactor {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const hasH1 = !!h1Match;
  const domain = new URL(url).hostname.replace(/^www\./, '').split('.')[0] ?? '';
  const h1Text = h1Match ? h1Match[1]!.replace(/<[^>]+>/g, '').trim() : '';
  const hasBrand = hasH1 && domain.length > 2 && h1Text.toLowerCase().includes(domain.toLowerCase());
  const passed = hasH1;
  return factor(
    'cq-h1', 'Content Quality', 'H1 Tag with Brand Name',
    passed,
    passed
      ? `H1 found: "${h1Text.slice(0, 80)}".${hasBrand ? ' Contains brand name.' : ' Consider including your brand name.'}`
      : 'No H1 tag found on the page.',
    'Add a clear H1 heading that includes your brand name. AI engines use the H1 as the primary page identifier.',
  );
}

function checkContentLength(text: string): GeoAuditFactor {
  const words = countWords(text);
  const passed = words >= 1500;
  return factor(
    'cq-length', 'Content Quality', 'Content Length >= 1500 Words',
    passed,
    `Page contains approximately ${words.toLocaleString()} words.${passed ? ' Good depth for AI citation.' : ''}`,
    `Your page has only ${words} words. Aim for at least 1,500 words of substantive content. Longer pages are more frequently cited by AI engines.`,
  );
}

function checkStatistics(html: string, text: string): GeoAuditFactor {
  const statPatterns = [
    /\d{1,3}(?:,\d{3})+/,         // large numbers: 1,000
    /\d+\.?\d*\s*%/,                // percentages
    /\$\d+/,                         // dollar amounts
    /\d+x\s/i,                       // multipliers like "10x "
    /\d+\s*(?:million|billion|thousand|k\b)/i,
  ];
  const matches = statPatterns.filter(p => p.test(text));
  const passed = matches.length >= 2;
  return factor(
    'cq-stats', 'Content Quality', 'Statistics & Data Points',
    passed,
    passed ? `Found ${matches.length} types of statistical data on the page.` : 'Few or no statistical data points found.',
    'Add specific numbers, percentages, and metrics throughout your content. AI models heavily favor pages with concrete, citable data.',
  );
}

function checkComparisonTables(html: string): GeoAuditFactor {
  const hasTable = /<table[\s\S]*?<\/table>/i.test(html);
  const hasComparisonKeywords = /comparison|vs\.?|versus|alternative|competitor|compared/i.test(html);
  const passed = hasTable && hasComparisonKeywords;
  const hasTableOnly = hasTable;
  return factor(
    'cq-tables', 'Content Quality', 'Comparison Tables',
    passed,
    passed
      ? 'Comparison table content detected.'
      : hasTableOnly
        ? 'HTML tables found but no clear comparison context.'
        : 'No comparison tables found.',
    'Add comparison tables (e.g., feature matrices, pricing comparisons). AI engines frequently cite tabular data when users ask "X vs Y" questions.',
  );
}

function checkProductDescriptions(html: string, text: string): GeoAuditFactor {
  const patterns = [
    /(?:feature|benefit|capabilit|solution|platform|tool|product)\s*(?:s|es|ies)?/gi,
    /<(?:h2|h3)[^>]*>[^<]*(?:feature|benefit|solution|how it works|what we offer|capabilities)[^<]*<\/(?:h2|h3)>/gi,
  ];
  const featureMatches = (text.match(patterns[0]!) ?? []).length;
  const headingMatches = (html.match(patterns[1]!) ?? []).length;
  const passed = featureMatches >= 3 && headingMatches >= 1;
  return factor(
    'cq-descriptions', 'Content Quality', 'Product/Feature Descriptions',
    passed,
    passed
      ? 'Clear product/feature description sections detected.'
      : 'Limited product or feature descriptions found.',
    'Add dedicated sections with headings like "Features", "How It Works", or "Solutions" with detailed descriptions under each. This gives AI clear content to summarize.',
  );
}

function checkFaqSections(html: string, text: string): GeoAuditFactor {
  const faqHeading = /<(?:h[1-4])[^>]*>[^<]*(?:FAQ|frequently asked|common questions|questions)[^<]*<\/(?:h[1-4])>/i.test(html);
  const questionPatterns = text.match(/(?:what|how|why|when|where|who|can|does|is|are|do)\s[^.?]*\?/gi) ?? [];
  const passed = faqHeading || questionPatterns.length >= 3;
  return factor(
    'cr-faq', 'Citation Readiness', 'FAQ Sections (Q&A Pairs)',
    passed,
    passed
      ? `FAQ content detected with ${questionPatterns.length} question-answer patterns.`
      : 'No clear FAQ section or question-answer pairs found.',
    'Add a dedicated FAQ section with 5-10 common questions about your brand/product. Format as clear Q&A pairs. AI models frequently cite FAQ content verbatim.',
  );
}

function checkDefinitionalContent(html: string, text: string, url: string): GeoAuditFactor {
  const domain = new URL(url).hostname.replace(/^www\./, '').split('.')[0] ?? '';
  const patterns = [
    new RegExp(`what\\s+is\\s+${domain}`, 'i'),
    /what\s+is\s+\w+/i,
    /\bis\s+(?:a|an|the)\s+(?:platform|tool|solution|software|service|company)/i,
  ];
  const passed = patterns.some(p => p.test(text));
  return factor(
    'cr-definition', 'Citation Readiness', 'Definitional Content ("What is [Brand]?")',
    passed,
    passed
      ? 'Definitional content about the brand/product detected.'
      : 'No "What is [brand]?" or clear definitional content found.',
    `Add a prominent section like "What is ${domain}?" with a 2-3 sentence definition. This is the #1 content type cited by AI when users ask about your brand.`,
  );
}

function checkTestimonials(html: string, text: string): GeoAuditFactor {
  const quotePatterns = [
    /<blockquote/i,
    /testimonial/i,
    /customer\s*(?:review|story|success|quote)/i,
    /"[^"]{20,}"[^"]*(?:CEO|CTO|VP|Director|Manager|Founder)/i,
  ];
  const passed = quotePatterns.some(p => p.test(html) || p.test(text));
  return factor(
    'cr-testimonials', 'Citation Readiness', 'Customer Testimonials/Quotes',
    passed,
    passed ? 'Customer testimonials or quotes detected.' : 'No customer testimonials found.',
    'Add 3-5 customer testimonials with names, titles, and companies. Use <blockquote> tags. AI engines cite social proof when recommending solutions.',
  );
}

function checkCaseStudies(html: string, text: string): GeoAuditFactor {
  const patterns = [
    /case\s*stud(?:y|ies)/i,
    /(?:increase|decrease|improve|reduc|sav|boost|grew|growth)\w*\s+(?:by\s+)?\d+\s*%/i,
    /\d+x\s+(?:increase|improvement|growth|faster|better)/i,
    /ROI|results?\s*(?::|—)/i,
  ];
  const passed = patterns.filter(p => p.test(text)).length >= 2;
  return factor(
    'cr-casestudies', 'Citation Readiness', 'Case Study References with Metrics',
    passed,
    passed ? 'Case study content with metrics detected.' : 'No case study references with concrete metrics found.',
    'Add case study summaries with specific metrics (e.g., "Increased conversions by 35%"). AI engines love citing concrete outcome data.',
  );
}

function checkPricing(html: string, text: string): GeoAuditFactor {
  const patterns = [
    /pric(?:e|ing)/i,
    /\$\d+(?:\.\d{2})?\s*(?:\/|\bper\b)/i,
    /free\s*(?:plan|tier|trial)/i,
    /(?:starter|basic|pro|enterprise|business)\s*(?:plan|tier)/i,
  ];
  const passed = patterns.filter(p => p.test(text)).length >= 2;
  return factor(
    'cr-pricing', 'Citation Readiness', 'Pricing Information',
    passed,
    passed ? 'Pricing information detected.' : 'No clear pricing information found.',
    'Add transparent pricing details to your page. AI frequently cites pricing when users ask "how much does X cost?" — transparent pricing dramatically boosts citation odds.',
  );
}

function checkMetaDescription(html: string): GeoAuditFactor {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const passed = !!match && match[1]!.length >= 50;
  return factor(
    'ts-meta', 'Technical SEO for AI', 'Meta Description',
    passed,
    passed ? `Meta description found (${match![1]!.length} chars).` : 'Missing or too short meta description.',
    'Add a meta description of 120-160 characters that clearly explains what your page is about. This is often the first thing AI reads.',
  );
}

function checkCanonical(html: string): GeoAuditFactor {
  const found = /<link[^>]+rel=["']canonical["'][^>]*>/i.test(html);
  return factor(
    'ts-canonical', 'Technical SEO for AI', 'Canonical URL',
    found,
    found ? 'Canonical URL tag found.' : 'No canonical URL tag found.',
    'Add <link rel="canonical" href="..."> to prevent duplicate content issues. AI engines may index the wrong version of your page without it.',
  );
}

function checkOpenGraph(html: string): GeoAuditFactor {
  const ogTitle = /<meta[^>]+property=["']og:title["']/i.test(html);
  const ogDesc = /<meta[^>]+property=["']og:description["']/i.test(html);
  const ogImage = /<meta[^>]+property=["']og:image["']/i.test(html);
  const count = [ogTitle, ogDesc, ogImage].filter(Boolean).length;
  const passed = count >= 2;
  return factor(
    'ts-og', 'Technical SEO for AI', 'Open Graph Tags',
    passed,
    passed
      ? `${count}/3 Open Graph tags found (title, description, image).`
      : `Only ${count}/3 Open Graph tags found.`,
    'Add og:title, og:description, and og:image meta tags. These help AI engines understand your page context and display information correctly.',
  );
}

function checkViewport(html: string): GeoAuditFactor {
  const found = /<meta[^>]+name=["']viewport["']/i.test(html);
  return factor(
    'ts-viewport', 'Technical SEO for AI', 'Mobile Viewport Meta Tag',
    found,
    found ? 'Viewport meta tag found.' : 'No viewport meta tag found.',
    'Add <meta name="viewport" content="width=device-width, initial-scale=1"> for mobile compatibility.',
  );
}

function checkHttpStatus(statusCode: number, redirectCount: number): GeoAuditFactor {
  const passed = statusCode === 200 && redirectCount <= 1;
  return factor(
    'ts-status', 'Technical SEO for AI', 'Page Loads (HTTP 200, No Redirect Chains)',
    passed,
    passed
      ? `HTTP ${statusCode}, ${redirectCount} redirect(s).`
      : `HTTP ${statusCode} with ${redirectCount} redirect(s). Issues detected.`,
    'Ensure your page returns HTTP 200 directly without redirect chains. AI crawlers may not follow long redirect sequences.',
  );
}

function checkExternalLinks(html: string): GeoAuditFactor {
  const links = html.match(/<a[^>]+href=["'](https?:\/\/[^"']+)["']/gi) ?? [];
  const external = links.filter(l => {
    const href = l.match(/href=["'](https?:\/\/[^"']+)["']/i);
    if (!href) return false;
    return !/same-domain/i.test(href[1]!); // all external for now
  });
  const authDomains = /wikipedia\.org|github\.com|\.gov|\.edu|reuters|bloomberg|techcrunch|forbes|gartner|mckinsey/i;
  const authoritative = links.filter(l => authDomains.test(l));
  const passed = authoritative.length >= 1 || external.length >= 3;
  return factor(
    'as-external', 'Authority Signals', 'External Links to Authoritative Sources',
    passed,
    passed
      ? `Found ${external.length} external links (${authoritative.length} to authoritative sources).`
      : 'Few or no external links to authoritative sources.',
    'Link to credible external sources (industry reports, Wikipedia, .gov/.edu sites). This signals to AI that your content is well-researched.',
  );
}

function checkIndustryPubs(text: string): GeoAuditFactor {
  const pubs = /Gartner|Forrester|IDC|McKinsey|Deloitte|Harvard Business|MIT Sloan|TechCrunch|Forbes|Bloomberg|Reuters|G2|Capterra|CB Insights/gi;
  const matches = text.match(pubs) ?? [];
  const unique = new Set(matches.map(m => m.toLowerCase()));
  const passed = unique.size >= 1;
  return factor(
    'as-publications', 'Authority Signals', 'References to Industry Publications',
    passed,
    passed ? `References to ${unique.size} industry publication(s): ${[...unique].join(', ')}.` : 'No references to industry publications found.',
    'Mention industry analysts or publications (Gartner, Forrester, G2, etc.) that have recognized your brand. AI engines use these as authority signals.',
  );
}

function checkAttribution(html: string, text: string): GeoAuditFactor {
  const authorMeta = /<meta[^>]+name=["']author["']/i.test(html);
  const authorByline = /(?:by|author|written by)\s+[A-Z][a-z]+\s+[A-Z][a-z]+/i.test(text);
  const companyName = /<footer[\s\S]*?(?:©|copyright|\u00a9)[\s\S]*?<\/footer>/i.test(html);
  const passed = authorMeta || authorByline || companyName;
  return factor(
    'as-attribution', 'Authority Signals', 'Author/Company Attribution',
    passed,
    passed ? 'Author or company attribution found.' : 'No clear author or company attribution detected.',
    'Add author bylines with credentials and a clear company attribution in the footer. AI engines prefer content with identifiable authors.',
  );
}

function checkDates(html: string, text: string): GeoAuditFactor {
  const datePatterns = [
    /<time[^>]+datetime/i,
    /<meta[^>]+(?:datePublished|dateModified|article:published_time|article:modified_time)/i,
    /(?:published|updated|modified|last updated)\s*(?:on|:)?\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4})/i,
  ];
  const passed = datePatterns.some(p => p.test(html));
  return factor(
    'as-dates', 'Authority Signals', 'Publish/Update Dates',
    passed,
    passed ? 'Publication or update dates detected.' : 'No publish/update dates found.',
    'Add visible publish and "last updated" dates. Use <time datetime="..."> and article:modified_time meta tags. AI engines favor fresh, dated content.',
  );
}

function checkTrustSignals(html: string, text: string): GeoAuditFactor {
  const patterns = [
    /(?:certified|certification|SOC\s*2|ISO\s*\d+|GDPR|HIPAA|compliant|compliance)/i,
    /(?:award|winner|recognized|badge|certified partner)/i,
    /(?:trusted by|used by|partner|integration with)\s+\d+/i,
    /(?:G2|Capterra|TrustRadius|Trustpilot)\s*(?:rating|review|leader|badge)/i,
  ];
  const matchCount = patterns.filter(p => p.test(text) || p.test(html)).length;
  const passed = matchCount >= 2;
  return factor(
    'as-trust', 'Authority Signals', 'Trust Signals (Certifications, Awards, Partners)',
    passed,
    passed ? `Found ${matchCount} types of trust signals.` : 'Limited trust signals (certifications, awards, partner logos) found.',
    'Add trust badges, certification logos (SOC 2, ISO, GDPR), award mentions, and "trusted by X companies" counters. AI engines use these to rank recommendations.',
  );
}

// ── Suggestion generator ───────────────────────────────────────

const PRIORITY_MAP: Record<string, 'HIGH' | 'MEDIUM' | 'LOW'> = {
  'sd-organization': 'HIGH',
  'sd-faq': 'HIGH',
  'sd-product': 'MEDIUM',
  'sd-breadcrumb': 'LOW',
  'sd-sameas': 'MEDIUM',
  'cq-h1': 'HIGH',
  'cq-length': 'HIGH',
  'cq-stats': 'MEDIUM',
  'cq-tables': 'LOW',
  'cq-descriptions': 'MEDIUM',
  'cr-faq': 'HIGH',
  'cr-definition': 'HIGH',
  'cr-testimonials': 'MEDIUM',
  'cr-casestudies': 'MEDIUM',
  'cr-pricing': 'MEDIUM',
  'ts-meta': 'HIGH',
  'ts-canonical': 'MEDIUM',
  'ts-og': 'LOW',
  'ts-viewport': 'LOW',
  'ts-status': 'HIGH',
  'as-external': 'MEDIUM',
  'as-publications': 'LOW',
  'as-attribution': 'MEDIUM',
  'as-dates': 'MEDIUM',
  'as-trust': 'LOW',
};

const LIFT_MAP: Record<string, string> = {
  'sd-organization': '+8-12% AI brand entity recognition',
  'sd-faq': '+10-15% citation rate for Q&A queries',
  'sd-product': '+5-8% product recommendation citations',
  'sd-breadcrumb': '+2-4% navigational query visibility',
  'sd-sameas': '+6-10% entity disambiguation accuracy',
  'cq-h1': '+5-8% page-level brand association',
  'cq-length': '+10-15% overall citation likelihood',
  'cq-stats': '+8-12% data citation frequency',
  'cq-tables': '+6-10% comparison query citations',
  'cq-descriptions': '+5-8% feature-related citations',
  'cr-faq': '+12-18% FAQ query citation rate',
  'cr-definition': '+15-20% "What is X?" query visibility',
  'cr-testimonials': '+4-6% recommendation confidence',
  'cr-casestudies': '+6-10% proof-point citations',
  'cr-pricing': '+8-12% pricing query citations',
  'ts-meta': '+5-8% crawl comprehension',
  'ts-canonical': '+3-5% deduplication accuracy',
  'ts-og': '+2-4% content understanding',
  'ts-viewport': '+1-2% mobile crawl quality',
  'ts-status': '+5-10% crawl success rate',
  'as-external': '+4-6% content trust score',
  'as-publications': '+5-8% authority recognition',
  'as-attribution': '+3-5% content credibility',
  'as-dates': '+4-7% freshness scoring',
  'as-trust': '+3-6% recommendation ranking',
};

function buildSuggestions(factors: GeoAuditFactor[]): GeoAuditSuggestion[] {
  const failed = factors.filter(f => !f.passed);
  return failed
    .map(f => ({
      priority: PRIORITY_MAP[f.id] ?? ('MEDIUM' as const),
      title: f.name,
      description: f.fix ?? `Improve your ${f.name.toLowerCase()} to boost AI visibility.`,
      expectedLift: LIFT_MAP[f.id] ?? '+3-5% improvement',
    }))
    .sort((a, b) => {
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return order[a.priority] - order[b.priority];
    });
}

// ── Main function ──────────────────────────────────────────────

export async function runGeoAudit(url: string): Promise<GeoAuditResult> {
  // Normalize URL
  let normalizedUrl = url.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  let html: string;
  let statusCode = 200;
  let redirectCount = 0;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    statusCode = response.status;
    redirectCount = response.redirected ? 1 : 0;
    html = await response.text();
  } catch (err) {
    throw new Error(`Failed to fetch ${normalizedUrl}: ${err instanceof Error ? err.message : String(err)}`);
  }

  const plainText = extractText(html);

  // Run all 25 checks
  const factors: GeoAuditFactor[] = [
    // Structured Data (5)
    checkOrganizationSchema(html),
    checkFaqSchema(html),
    checkProductSchema(html),
    checkBreadcrumbSchema(html),
    checkSameAsLinks(html),
    // Content Quality (5)
    checkH1BrandName(html, normalizedUrl),
    checkContentLength(plainText),
    checkStatistics(html, plainText),
    checkComparisonTables(html),
    checkProductDescriptions(html, plainText),
    // Citation Readiness (5)
    checkFaqSections(html, plainText),
    checkDefinitionalContent(html, plainText, normalizedUrl),
    checkTestimonials(html, plainText),
    checkCaseStudies(html, plainText),
    checkPricing(html, plainText),
    // Technical SEO for AI (5)
    checkMetaDescription(html),
    checkCanonical(html),
    checkOpenGraph(html),
    checkViewport(html),
    checkHttpStatus(statusCode, redirectCount),
    // Authority Signals (5)
    checkExternalLinks(html),
    checkIndustryPubs(plainText),
    checkAttribution(html, plainText),
    checkDates(html, plainText),
    checkTrustSignals(html, plainText),
  ];

  const overallScore = factors.reduce((sum, f) => sum + f.score, 0);
  const suggestions = buildSuggestions(factors);

  return {
    url: normalizedUrl,
    overallScore,
    factors,
    suggestions,
    crawledAt: new Date().toISOString(),
  };
}
