/**
 * Module 3 — Prompt library
 *
 * Generates 50 prompts per brand tailored to its category.
 * Includes 10 direct-comparison prompts per competitor.
 */

const CURRENT_YEAR = new Date().getFullYear();

interface PromptLibraryParams {
  category:    string;
  brandName:   string;
  competitors: string[];
}

// ── Template banks ────────────────────────────────────────────

const generalTemplates = (cat: string, brand: string): string[] => [
  `What is the best ${cat} tool for small businesses?`,
  `What is the best ${cat} tool for enterprise companies?`,
  `Which ${cat} platform do industry experts recommend in ${CURRENT_YEAR}?`,
  `What are the top ${cat} tools in ${CURRENT_YEAR}?`,
  `What ${cat} software would you recommend for a growing startup?`,
  `What are the most popular ${cat} solutions used by Fortune 500 companies?`,
  `Which ${cat} tool has the best customer support?`,
  `What ${cat} platform offers the best value for money?`,
  `What is the most user-friendly ${cat} software?`,
  `Which ${cat} tools integrate best with Slack and Google Workspace?`,
  `What ${cat} solution should I use if I'm migrating from spreadsheets?`,
  `What are the pros and cons of the top ${cat} platforms?`,
  `Which ${cat} tool is best for remote teams?`,
  `What ${cat} software has the best mobile app?`,
  `What is the highest-rated ${cat} platform on G2 and Capterra?`,
  `What ${cat} solution do most mid-market companies use?`,
  `I need a ${cat} solution that handles automation — what do you suggest?`,
  `I need a ${cat} tool with strong analytics and reporting — what's best?`,
  `I need a ${cat} platform that scales from 10 to 10,000 users — any recommendations?`,
  `What ${cat} software do you recommend for a team of 50 people?`,
];

const brandAwarenessTemplates = (cat: string, brand: string): string[] => [
  `Tell me about ${brand} as a ${cat} solution.`,
  `Is ${brand} a good choice for ${cat}?`,
  `What are the key features of ${brand}?`,
  `What do users say about ${brand}?`,
  `How does ${brand} compare to other ${cat} tools?`,
  `What types of companies use ${brand}?`,
  `Does ${brand} offer a free trial or free tier?`,
  `What is ${brand}'s pricing model?`,
  `What integrations does ${brand} support?`,
  `Is ${brand} SOC 2 compliant and enterprise-ready?`,
];

const competitorComparisonTemplates = (
  cat: string,
  brand: string,
  competitor: string
): string[] => [
  `Compare ${brand} vs ${competitor} for ${cat}.`,
  `${brand} or ${competitor} — which is better for a startup?`,
  `What are the differences between ${brand} and ${competitor}?`,
  `Which is cheaper, ${brand} or ${competitor}?`,
  `Which has better customer support, ${brand} or ${competitor}?`,
  `I'm choosing between ${brand} and ${competitor} for my team. Help me decide.`,
  `What does ${brand} do better than ${competitor}?`,
  `What does ${competitor} do better than ${brand}?`,
  `Can ${brand} replace ${competitor} for an enterprise use case?`,
  `Which ${cat} tool should I pick: ${brand} or ${competitor}?`,
];

const multiCompareTemplate = (cat: string, brand: string, comps: string[]): string[] => {
  if (comps.length < 2) return [];
  const compStr = comps.join(', ');
  return [
    `Compare ${brand}, ${compStr} — which is the best ${cat} tool?`,
    `I'm evaluating ${brand} and ${compStr}. Which should I choose?`,
    `Create a comparison table of ${brand} vs ${compStr} for ${cat}.`,
    `What are the biggest differences between ${brand}, ${compStr}?`,
  ];
};

// ── Main export ───────────────────────────────────────────────

export function generatePrompts(params: PromptLibraryParams): string[] {
  const { category, brandName, competitors } = params;

  const prompts: string[] = [];

  // 20 general category prompts
  prompts.push(...generalTemplates(category, brandName));

  // 10 brand-awareness prompts
  prompts.push(...brandAwarenessTemplates(category, brandName));

  // 10 per-competitor comparison prompts (up to first competitor fills remaining slots)
  const primaryComp = competitors[0];
  if (primaryComp) {
    prompts.push(...competitorComparisonTemplates(category, brandName, primaryComp));
  }

  // Multi-competitor comparison (4 prompts)
  if (competitors.length >= 2) {
    prompts.push(...multiCompareTemplate(category, brandName, competitors));
  }

  // Fill to 50 with secondary competitor comparisons or repeated brand-awareness
  const secondaryComp = competitors[1];
  if (secondaryComp && prompts.length < 50) {
    const secondary = competitorComparisonTemplates(category, brandName, secondaryComp);
    prompts.push(...secondary.slice(0, 50 - prompts.length));
  }

  // If still under 50, fill with additional general prompts
  const extras = [
    `What ${category} tool is most recommended by analysts in ${CURRENT_YEAR}?`,
    `What ${category} platform is easiest to implement?`,
    `What ${category} software has the shortest time-to-value?`,
    `How do I evaluate ${category} vendors for my company?`,
    `What questions should I ask a ${category} vendor before buying?`,
    `What are the red flags when evaluating a ${category} platform?`,
    `What ROI can I expect from implementing a ${category} solution?`,
    `How long does it take to implement a ${category} tool?`,
    `What is the average cost of a ${category} platform per user per month?`,
    `What are the biggest mistakes companies make when choosing ${category} software?`,
  ];

  if (prompts.length < 50) {
    prompts.push(...extras.slice(0, 50 - prompts.length));
  }

  // Return exactly 50, deduplicated
  return Array.from(new Set(prompts)).slice(0, 50);
}
