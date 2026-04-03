/**
 * Shared response-parsing helpers used by all engine adapters.
 */

/** Returns true if brandName appears in the response text (case-insensitive). */
export function detectBrandMention(response: string, brandName: string): boolean {
  return response.toLowerCase().includes(brandName.toLowerCase());
}

/**
 * Returns the 1-based paragraph/sentence position of the first mention of
 * brandName, or null if not mentioned.  We split on double-newlines first
 * (markdown sections), then fall back to sentences.
 */
export function detectCitationPosition(response: string, brandName: string): number | null {
  if (!detectBrandMention(response, brandName)) return null;

  const lowerBrand = brandName.toLowerCase();
  const sections   = response.split(/\n\n+/);

  for (let i = 0; i < sections.length; i++) {
    if ((sections[i] ?? '').toLowerCase().includes(lowerBrand)) {
      return i + 1;
    }
  }
  return 1;
}

/** Extracts all http(s) URLs from a string. */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"')\]]+/g;
  return Array.from(new Set(text.match(urlRegex) ?? []));
}
