/**
 * Module 5 — Recommendation engine (enhanced)
 *
 * Prescriptive, source-specific recommendations. Each rule targets
 * a measurable action the customer can take this week.
 *
 * Input:  ComputedScore, brand ScanResults, Brand record, previously resolved titles
 * Output: array of Recommendation create-inputs (caller persists)
 */

import type { Brand, ScanResult } from '@prisma/client';
import type { ComputedScore } from '@/lib/scoring/calculateScore';
import { SCORE_THRESHOLDS } from '@/lib/constants';

export interface RecommendationInput {
  brandId:        string;
  weekOf:         Date;
  type:           'SCHEMA' | 'CONTENT' | 'CITATION' | 'TECHNICAL';
  priority:       'HIGH' | 'MEDIUM' | 'LOW';
  title:          string;
  description:    string;
  expectedImpact: string;
}

function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function missedPromptList(results: ScanResult[], max = 5): string {
  return results
    .filter((r) => !r.brandMentioned)
    .slice(0, max)
    .map((r, i) => `${i + 1}. "${r.prompt}"`)
    .join('\n');
}

function competitorDomainList(results: ScanResult[], max = 5): string[] {
  return Array.from(
    new Set(
      results
        .filter((r) => r.citationSourceUrl && !r.brandMentioned)
        .map((r) => domainOf(r.citationSourceUrl!))
        .filter((d) => d.length > 0),
    ),
  ).slice(0, max);
}

function citedSourceDomains(results: ScanResult[], max = 5): string[] {
  return Array.from(
    new Set(
      results
        .filter((r) => r.citationSourceUrl)
        .map((r) => domainOf(r.citationSourceUrl!))
        .filter((d) => d.length > 0),
    ),
  ).slice(0, max);
}

// ── Main export ───────────────────────────────────────────────

export function generateRecommendations(
  score:          ComputedScore,
  results:        ScanResult[],
  brand:          Brand,
  resolvedTitles: Set<string> = new Set(),
): RecommendationInput[] {
  const recs: RecommendationInput[] = [];

  function add(rec: RecommendationInput) {
    if (!resolvedTitles.has(rec.title)) recs.push(rec);
  }

  const mentionedResults  = results.filter((r) => r.brandMentioned);
  const mentionRate       = results.length ? mentionedResults.length / results.length : 0;
  const positionedResults = mentionedResults.filter((r) => r.citationPosition !== null);
  const avgPosition       = positionedResults.length
    ? positionedResults.reduce((s, r) => s + r.citationPosition!, 0) / positionedResults.length
    : null;

  // ── Rule 1: Low overall score → FAQ schema on exact missed queries ────────
  if (score.overallScore < SCORE_THRESHOLDS.LOW_OVERALL) {
    const list = missedPromptList(results);
    add({
      brandId:  brand.id,
      weekOf:   score.weekOf,
      type:     'SCHEMA',
      priority: 'HIGH',
      title:    'Add FAQ schema for queries where AI ignores you',
      description:
        `Your AI visibility score is ${score.overallScore}/100. ` +
        `AI engines are not citing ${brand.name} for these buyer queries:\n\n${list}\n\n` +
        `Action: Add FAQ schema markup (JSON-LD) to your homepage and landing pages ` +
        `using these exact questions and concise answers. AI engines parse FAQ schema ` +
        `directly when generating answers.`,
      expectedImpact: '+8–15 pts overall score within 4–6 weeks',
    });
  }

  // ── Rule 2: Low share of voice → citation-building on competitor domains ──
  if (score.shareOfVoice < SCORE_THRESHOLDS.LOW_SHARE_OF_VOICE) {
    const domains = competitorDomainList(results);
    const domList = domains.length
      ? domains.map((d) => `• ${d}`).join('\n')
      : '• G2 (g2.com)\n• Capterra\n• TrustRadius\n• Gartner Peer Insights\n• Product Hunt';

    add({
      brandId:  brand.id,
      weekOf:   score.weekOf,
      type:     'CITATION',
      priority: 'HIGH',
      title:    'Build presence on sources AI engines actually cite for your competitors',
      description:
        `${brand.name}'s share of voice is ${score.shareOfVoice}% — competitors dominate AI responses. ` +
        `AI engines are citing these specific domains when recommending competitors over you:\n\n${domList}\n\n` +
        `Action: Get listed, reviewed, or featured on these platforms. ` +
        `Submit a press release, pitch for a review, or create a dedicated comparison page ` +
        `(e.g. "${brand.name} vs Competitor") that these sites can link to.`,
      expectedImpact: '+10–20 pts share of voice within 6–8 weeks',
    });
  }

  // ── Rule 3: Gemini gap → Google Knowledge Graph + Organization schema ────
  if (score.chatgptScore - score.geminiScore > SCORE_THRESHOLDS.ENGINE_GAP) {
    add({
      brandId:  brand.id,
      weekOf:   score.weekOf,
      type:     'TECHNICAL',
      priority: 'MEDIUM',
      title:    'Fix Gemini visibility gap with Google Knowledge Graph signals',
      description:
        `${brand.name} scores ${score.chatgptScore}/100 on ChatGPT but only ${score.geminiScore}/100 on Gemini — ` +
        `a ${Math.round(score.chatgptScore - score.geminiScore)}-point gap. ` +
        `Gemini draws directly from Google's knowledge graph.\n\n` +
        `Actions (in priority order):\n` +
        `1. Claim and fully complete your Google Business Profile\n` +
        `2. Add Organization JSON-LD schema with \`sameAs\` linking to Wikidata, LinkedIn, Crunchbase\n` +
        `3. Create a Wikipedia article or Wikidata entity if none exists\n` +
        `4. Publish a Google Data Studio report about your product — ` +
        `these are heavily indexed by Gemini`,
      expectedImpact: '+12–18 pts Gemini score within 4–6 weeks',
    });
  }

  // ── Rule 4: Perplexity gap → Reddit + community engagement ───────────────
  if (score.overallScore - score.perplexityScore > SCORE_THRESHOLDS.ENGINE_GAP) {
    add({
      brandId:  brand.id,
      weekOf:   score.weekOf,
      type:     'CONTENT',
      priority: 'MEDIUM',
      title:    'Boost Perplexity citations with Reddit and community content',
      description:
        `${brand.name} has a ${Math.round(score.overallScore - score.perplexityScore)}-point gap ` +
        `on Perplexity vs your overall score. Perplexity heavily cites Reddit, Hacker News, ` +
        `Quora, and community forums as real-time sources.\n\n` +
        `Actions:\n` +
        `1. Find active subreddits in the "${brand.category}" category and contribute genuine value\n` +
        `2. Answer relevant questions on Quora mentioning ${brand.name} with specifics\n` +
        `3. Post in-depth comparisons or tutorials on Hacker News and tech communities\n` +
        `4. Monitor brand mentions on Reddit and respond to them`,
      expectedImpact: '+8–14 pts Perplexity score within 3–5 weeks',
    });
  }

  // ── Rule 5: Claude gap → Wikipedia + authoritative long-form ─────────────
  if (score.overallScore - score.claudeScore > SCORE_THRESHOLDS.ENGINE_GAP) {
    add({
      brandId:  brand.id,
      weekOf:   score.weekOf,
      type:     'CONTENT',
      priority: 'MEDIUM',
      title:    'Improve Claude citations with Wikipedia and authoritative content',
      description:
        `${brand.name} is underperforming on Claude by ${Math.round(score.overallScore - score.claudeScore)} points. ` +
        `Claude was trained on high-quality long-form content and heavily weights Wikipedia, ` +
        `academic papers, and authoritative editorial sources.\n\n` +
        `Actions:\n` +
        `1. Create (or expand) a Wikipedia article for ${brand.name} with citations from reputable sources\n` +
        `2. Get coverage in established industry publications (TechCrunch, VentureBeat, The Verge)\n` +
        `3. Publish detailed, comprehensive documentation and whitepapers on your website\n` +
        `4. Contribute to open-source projects or research your industry can cite`,
      expectedImpact: '+8–12 pts Claude score within 6–8 weeks',
    });
  }

  // ── Rule 6: Mentioned but low position → position optimization ───────────
  if (mentionRate > 0.4 && avgPosition !== null && avgPosition > 3) {
    add({
      brandId:  brand.id,
      weekOf:   score.weekOf,
      type:     'CONTENT',
      priority: 'MEDIUM',
      title:    `${brand.name} is mentioned but cited too late — move to position #1`,
      description:
        `Good news: ${brand.name} is mentioned in ${Math.round(mentionRate * 100)}% of AI responses. ` +
        `But you're appearing at an average position of #${avgPosition.toFixed(1)} — meaning competitors ` +
        `are listed first. AI users rarely read past the 2nd or 3rd option.\n\n` +
        `Actions to claim the top slot:\n` +
        `1. Add structured comparison tables (you vs alternatives) — ` +
        `AI engines pull these when ranking options\n` +
        `2. Create "Best ${brand.category} tools" pages featuring you prominently\n` +
        `3. Earn more backlinks from high-authority sources than your #1 competitor\n` +
        `4. Increase review velocity on G2 and Capterra (quantity = credibility signal for AI)`,
      expectedImpact: 'Move from position 3–5 to position 1–2 within 6 weeks',
    });
  }

  // ── Rule 7: Review platform push ─────────────────────────────────────────
  const reviewSources = citedSourceDomains(results).filter((d) =>
    ['g2.com', 'capterra.com', 'trustradius.com', 'gartner.com'].includes(d),
  );

  if (score.overallScore < 70 && reviewSources.length < 2) {
    add({
      brandId:  brand.id,
      weekOf:   score.weekOf,
      type:     'CITATION',
      priority: 'HIGH',
      title:    'Launch a G2 and Capterra review campaign immediately',
      description:
        `AI engines treat G2 and Capterra review counts as a trust signal for software brands. ` +
        `${brand.name} has minimal presence on the platforms AI currently cites for your category.\n\n` +
        `Action plan (this week):\n` +
        `1. Email your 20 most engaged customers asking for a G2 review (offer a gift card)\n` +
        `2. Add a G2 review widget to your post-signup flow\n` +
        `3. Create a Capterra profile if you don't have one\n` +
        `4. Set up TrustRadius and Gartner Peer Insights profiles\n\n` +
        `Target: 50+ reviews on G2 within 30 days. ChatGPT and Perplexity noticeably shift ` +
        `recommendations at this threshold.`,
      expectedImpact: '+15–25 pts share of voice within 4–8 weeks',
    });
  }

  // ── Rule 8: Competitor-specific attack content ────────────────────────────
  const competitorSites = competitorDomainList(results);
  if (competitorSites.length > 0 && score.shareOfVoice < 50) {
    const topCompetitor = competitorSites[0] ?? 'your top competitor';
    add({
      brandId:  brand.id,
      weekOf:   score.weekOf,
      type:     'CONTENT',
      priority: 'HIGH',
      title:    `Counter ${topCompetitor}'s AI presence with direct comparison content`,
      description:
        `AI engines are citing ${topCompetitor} instead of ${brand.name} in multiple tracked queries.\n\n` +
        `The fastest way to displace a competitor in AI responses is comparison content:\n\n` +
        `1. Create a "${brand.name} vs ${topCompetitor}" comparison page with an unbiased analysis\n` +
        `2. Write a migration guide: "Switching from ${topCompetitor} to ${brand.name}"\n` +
        `3. Target the exact queries where ${topCompetitor} beats you with dedicated landing pages\n\n` +
        `AI engines pick up comparison content quickly — especially when comprehensive and unbiased.`,
      expectedImpact: '+12–20 pts share of voice within 4–6 weeks',
    });
  }

  // ── Rule 9: Site structure — use-case and integration pages ──────────────
  if (score.overallScore < 60 && recs.length < 4) {
    add({
      brandId:  brand.id,
      weekOf:   score.weekOf,
      type:     'TECHNICAL',
      priority: 'MEDIUM',
      title:    'Build use-case and integration pages AI engines can cite',
      description:
        `AI engines prefer to cite specific, structured pages over general homepages. ` +
        `${brand.name} likely has gaps in its site structure that reduce AI citation frequency.\n\n` +
        `High-impact pages to create for "${brand.category}":\n` +
        `• Use-case pages: "${brand.name} for [specific role/company size]"\n` +
        `• Integration pages: "${brand.name} + Zapier", "${brand.name} + Slack"\n` +
        `• Pricing page: Clear, transparent pricing (AI frequently cites brands with public pricing)\n` +
        `• Feature comparison table: Compare your feature set vs top 3 competitors\n\n` +
        `Each page should answer a specific buyer question AI engines are asked.`,
      expectedImpact: '+5–10 pts overall score within 3–5 weeks',
    });
  }

  // ── Rule 10: Case study library ───────────────────────────────────────────
  if (score.shareOfVoice < 60 && recs.length < 5) {
    add({
      brandId:  brand.id,
      weekOf:   score.weekOf,
      type:     'CITATION',
      priority: 'LOW',
      title:    'Publish a customer case study library to increase AI citations',
      description:
        `AI engines heavily weight third-party validation when recommending products. ` +
        `Customer case studies with measurable outcomes are among the most-cited content types.\n\n` +
        `Case study formula AI engines cite:\n` +
        `• Company name + industry + team size\n` +
        `• Specific problem they had before ${brand.name}\n` +
        `• Exact metrics: "Reduced time by 40%", "Saved $12K/month"\n` +
        `• Quote from a named person with their title\n\n` +
        `Goal: 5 detailed case studies on your website + pitch the best one to ` +
        `G2, TechCrunch, and 2–3 industry newsletters.`,
      expectedImpact: '+4–8 pts share of voice within 8 weeks',
    });
  }

  // ── Fallback: always return at least 3 ────────────────────────────────────
  if (recs.length < 3) {
    const fallbacks: RecommendationInput[] = [
      {
        brandId:  brand.id,
        weekOf:   score.weekOf,
        type:     'SCHEMA',
        priority: 'MEDIUM',
        title:    'Add structured data (JSON-LD) to every key page',
        description:
          `AI engines parse structured data directly. Ensure every key page on ${brand.domain} ` +
          `has JSON-LD markup for: Organization, Product, FAQPage, and BreadcrumbList schemas. ` +
          `Use Google's Rich Results Test to validate. This is the single fastest technical ` +
          `improvement you can make to improve AI engine comprehension of your brand.`,
        expectedImpact: '+3–6 pts technical score within 4 weeks',
      },
      {
        brandId:  brand.id,
        weekOf:   score.weekOf,
        type:     'CITATION',
        priority: 'LOW',
        title:    'Get covered in 3 industry publications this month',
        description:
          `Earned media from credible publications in the "${brand.category}" space directly ` +
          `boosts AI visibility. AI models were trained on editorial content and continue to ` +
          `cite it in real-time search (especially Perplexity).\n\n` +
          `Target this week:\n` +
          `• Write a data-driven study about your industry and pitch it to journalists\n` +
          `• Offer to be a guest on 2–3 relevant podcasts\n` +
          `• Submit a contributed article to an industry trade publication`,
        expectedImpact: '+5–10 pts share of voice within 6 weeks',
      },
    ];
    for (const fb of fallbacks) {
      if (recs.length >= 5) break;
      add(fb);
    }
  }

  return recs;
}
