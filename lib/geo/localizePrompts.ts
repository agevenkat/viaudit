// ── Prompt localisation for Geo + Language Matrix ────────────

import { getCountryName, getLanguageName } from './countries';

/**
 * Location-sensitive keywords. If a prompt contains any of these,
 * we consider it geo-relevant and append " in [country]".
 */
const LOCATION_KEYWORDS = [
  'best', 'top', 'popular', 'recommended', 'leading', 'trusted',
  'affordable', 'cheap', 'expensive', 'fastest', 'enterprise',
  'startup', 'small business', 'smb', 'compare', 'vs',
  'alternative', 'review', 'pricing', 'free', 'open source',
];

/**
 * Takes a set of prompts and localises them for the target
 * country + language combination.
 *
 * Rules:
 * 1. If language is 'en' AND country is 'US', return prompts as-is
 *    (plus the 5 country-specific extras).
 * 2. For English but a different country: append " in [country]"
 *    to location-relevant prompts.
 * 3. For non-English: prepend "Answer in [language name]."
 * 4. Replace "2026" year references with the current year.
 * 5. Always append 5 country-specific prompts.
 */
export function localizePrompts(
  prompts: string[],
  country: string,
  language: string,
): string[] {
  const currentYear = new Date().getFullYear().toString();
  const countryName = getCountryName(country);
  const languageName = getLanguageName(language);
  const isEnglish = language === 'en';
  const isUS = country === 'US';

  const localised = prompts.map((prompt) => {
    // Replace year references
    let p = prompt.replace(/2026/g, currentYear);

    if (isEnglish && isUS) {
      return p;
    }

    // For English but different country: append " in [country]" to geo-relevant prompts
    if (isEnglish) {
      const lower = p.toLowerCase();
      const isGeoRelevant = LOCATION_KEYWORDS.some((kw) => lower.includes(kw));
      if (isGeoRelevant) {
        // Only append if the country isn't already mentioned
        if (!lower.includes(countryName.toLowerCase())) {
          p = `${p} in ${countryName}`;
        }
      }
      return p;
    }

    // Non-English: prefix with language instruction
    return `Answer in ${languageName}. ${p}`;
  });

  // Always add 5 country-specific prompts
  const extras = buildCountryPrompts(countryName, language, languageName);
  return [...localised, ...extras];
}

/**
 * Generates 5 country-specific prompts tailored to the target geo.
 */
function buildCountryPrompts(
  countryName: string,
  language: string,
  languageName: string,
): string[] {
  const prefix = language === 'en' ? '' : `Answer in ${languageName}. `;
  const year = new Date().getFullYear();

  return [
    `${prefix}Best software tools popular in ${countryName} in ${year}`,
    `${prefix}What are the most trusted technology brands in ${countryName}?`,
    `${prefix}Popular business software used by companies in ${countryName}`,
    `${prefix}Top recommended solutions for enterprises in ${countryName} in ${year}`,
    `${prefix}What tools do professionals in ${countryName} prefer for productivity?`,
  ];
}
