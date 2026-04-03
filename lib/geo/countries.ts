// ── Geo + Language Matrix: supported countries & languages ────

export interface GeoCountry {
  code: string;     // ISO 3166-1 alpha-2
  name: string;
  flag: string;     // emoji flag
  languages: string[];  // default languages for this country
}

export interface GeoLanguage {
  code: string;     // ISO 639-1
  name: string;
  nativeName: string;
}

// ── 50+ supported countries ──────────────────────────────────

export const GEO_COUNTRIES: GeoCountry[] = [
  { code: 'US', name: 'United States',       flag: '\u{1F1FA}\u{1F1F8}', languages: ['en'] },
  { code: 'GB', name: 'United Kingdom',      flag: '\u{1F1EC}\u{1F1E7}', languages: ['en'] },
  { code: 'CA', name: 'Canada',              flag: '\u{1F1E8}\u{1F1E6}', languages: ['en', 'fr'] },
  { code: 'AU', name: 'Australia',           flag: '\u{1F1E6}\u{1F1FA}', languages: ['en'] },
  { code: 'IN', name: 'India',              flag: '\u{1F1EE}\u{1F1F3}', languages: ['en', 'hi'] },
  { code: 'DE', name: 'Germany',            flag: '\u{1F1E9}\u{1F1EA}', languages: ['de'] },
  { code: 'FR', name: 'France',             flag: '\u{1F1EB}\u{1F1F7}', languages: ['fr'] },
  { code: 'JP', name: 'Japan',              flag: '\u{1F1EF}\u{1F1F5}', languages: ['ja'] },
  { code: 'BR', name: 'Brazil',             flag: '\u{1F1E7}\u{1F1F7}', languages: ['pt'] },
  { code: 'MX', name: 'Mexico',             flag: '\u{1F1F2}\u{1F1FD}', languages: ['es'] },
  { code: 'ES', name: 'Spain',              flag: '\u{1F1EA}\u{1F1F8}', languages: ['es'] },
  { code: 'IT', name: 'Italy',              flag: '\u{1F1EE}\u{1F1F9}', languages: ['it'] },
  { code: 'NL', name: 'Netherlands',        flag: '\u{1F1F3}\u{1F1F1}', languages: ['nl'] },
  { code: 'SE', name: 'Sweden',             flag: '\u{1F1F8}\u{1F1EA}', languages: ['sv'] },
  { code: 'NO', name: 'Norway',             flag: '\u{1F1F3}\u{1F1F4}', languages: ['no'] },
  { code: 'DK', name: 'Denmark',            flag: '\u{1F1E9}\u{1F1F0}', languages: ['da'] },
  { code: 'FI', name: 'Finland',            flag: '\u{1F1EB}\u{1F1EE}', languages: ['fi'] },
  { code: 'PL', name: 'Poland',             flag: '\u{1F1F5}\u{1F1F1}', languages: ['pl'] },
  { code: 'CZ', name: 'Czech Republic',     flag: '\u{1F1E8}\u{1F1FF}', languages: ['cs'] },
  { code: 'AT', name: 'Austria',            flag: '\u{1F1E6}\u{1F1F9}', languages: ['de'] },
  { code: 'CH', name: 'Switzerland',        flag: '\u{1F1E8}\u{1F1ED}', languages: ['de', 'fr', 'it'] },
  { code: 'BE', name: 'Belgium',            flag: '\u{1F1E7}\u{1F1EA}', languages: ['nl', 'fr'] },
  { code: 'PT', name: 'Portugal',           flag: '\u{1F1F5}\u{1F1F9}', languages: ['pt'] },
  { code: 'IE', name: 'Ireland',            flag: '\u{1F1EE}\u{1F1EA}', languages: ['en'] },
  { code: 'NZ', name: 'New Zealand',        flag: '\u{1F1F3}\u{1F1FF}', languages: ['en'] },
  { code: 'SG', name: 'Singapore',          flag: '\u{1F1F8}\u{1F1EC}', languages: ['en', 'zh'] },
  { code: 'HK', name: 'Hong Kong',          flag: '\u{1F1ED}\u{1F1F0}', languages: ['zh', 'en'] },
  { code: 'KR', name: 'South Korea',        flag: '\u{1F1F0}\u{1F1F7}', languages: ['ko'] },
  { code: 'TW', name: 'Taiwan',             flag: '\u{1F1F9}\u{1F1FC}', languages: ['zh'] },
  { code: 'PH', name: 'Philippines',        flag: '\u{1F1F5}\u{1F1ED}', languages: ['en', 'tl'] },
  { code: 'ID', name: 'Indonesia',          flag: '\u{1F1EE}\u{1F1E9}', languages: ['id'] },
  { code: 'MY', name: 'Malaysia',           flag: '\u{1F1F2}\u{1F1FE}', languages: ['ms', 'en'] },
  { code: 'TH', name: 'Thailand',           flag: '\u{1F1F9}\u{1F1ED}', languages: ['th'] },
  { code: 'VN', name: 'Vietnam',            flag: '\u{1F1FB}\u{1F1F3}', languages: ['vi'] },
  { code: 'AE', name: 'United Arab Emirates', flag: '\u{1F1E6}\u{1F1EA}', languages: ['ar', 'en'] },
  { code: 'SA', name: 'Saudi Arabia',       flag: '\u{1F1F8}\u{1F1E6}', languages: ['ar'] },
  { code: 'IL', name: 'Israel',             flag: '\u{1F1EE}\u{1F1F1}', languages: ['he', 'en'] },
  { code: 'ZA', name: 'South Africa',       flag: '\u{1F1FF}\u{1F1E6}', languages: ['en'] },
  { code: 'NG', name: 'Nigeria',            flag: '\u{1F1F3}\u{1F1EC}', languages: ['en'] },
  { code: 'KE', name: 'Kenya',              flag: '\u{1F1F0}\u{1F1EA}', languages: ['en', 'sw'] },
  { code: 'EG', name: 'Egypt',              flag: '\u{1F1EA}\u{1F1EC}', languages: ['ar'] },
  { code: 'AR', name: 'Argentina',          flag: '\u{1F1E6}\u{1F1F7}', languages: ['es'] },
  { code: 'CL', name: 'Chile',              flag: '\u{1F1E8}\u{1F1F1}', languages: ['es'] },
  { code: 'CO', name: 'Colombia',           flag: '\u{1F1E8}\u{1F1F4}', languages: ['es'] },
  { code: 'PE', name: 'Peru',               flag: '\u{1F1F5}\u{1F1EA}', languages: ['es'] },
  { code: 'RU', name: 'Russia',             flag: '\u{1F1F7}\u{1F1FA}', languages: ['ru'] },
  { code: 'UA', name: 'Ukraine',            flag: '\u{1F1FA}\u{1F1E6}', languages: ['uk', 'ru'] },
  { code: 'TR', name: 'Turkey',             flag: '\u{1F1F9}\u{1F1F7}', languages: ['tr'] },
  { code: 'GR', name: 'Greece',             flag: '\u{1F1EC}\u{1F1F7}', languages: ['el'] },
  { code: 'RO', name: 'Romania',            flag: '\u{1F1F7}\u{1F1F4}', languages: ['ro'] },
];

// ── 22 supported languages ───────────────────────────────────

export const GEO_LANGUAGES: GeoLanguage[] = [
  { code: 'en', name: 'English',    nativeName: 'English' },
  { code: 'es', name: 'Spanish',    nativeName: 'Espa\u00f1ol' },
  { code: 'fr', name: 'French',     nativeName: 'Fran\u00e7ais' },
  { code: 'de', name: 'German',     nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian',    nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Portugu\u00eas' },
  { code: 'nl', name: 'Dutch',      nativeName: 'Nederlands' },
  { code: 'sv', name: 'Swedish',    nativeName: 'Svenska' },
  { code: 'no', name: 'Norwegian',  nativeName: 'Norsk' },
  { code: 'da', name: 'Danish',     nativeName: 'Dansk' },
  { code: 'fi', name: 'Finnish',    nativeName: 'Suomi' },
  { code: 'pl', name: 'Polish',     nativeName: 'Polski' },
  { code: 'ja', name: 'Japanese',   nativeName: '\u65E5\u672C\u8A9E' },
  { code: 'ko', name: 'Korean',     nativeName: '\uD55C\uAD6D\uC5B4' },
  { code: 'zh', name: 'Chinese',    nativeName: '\u4E2D\u6587' },
  { code: 'hi', name: 'Hindi',      nativeName: '\u0939\u093F\u0928\u094D\u0926\u0940' },
  { code: 'ar', name: 'Arabic',     nativeName: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629' },
  { code: 'tr', name: 'Turkish',    nativeName: 'T\u00fcrk\u00e7e' },
  { code: 'ru', name: 'Russian',    nativeName: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439' },
  { code: 'th', name: 'Thai',       nativeName: '\u0E44\u0E17\u0E22' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Ti\u1EBFng Vi\u1EC7t' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
];

// ── Lookup helpers ───────────────────────────────────────────

export const COUNTRY_MAP = new Map(GEO_COUNTRIES.map((c) => [c.code, c]));
export const LANGUAGE_MAP = new Map(GEO_LANGUAGES.map((l) => [l.code, l]));

export function getCountryName(code: string): string {
  return COUNTRY_MAP.get(code)?.name ?? code;
}

export function getLanguageName(code: string): string {
  return LANGUAGE_MAP.get(code)?.name ?? code;
}
