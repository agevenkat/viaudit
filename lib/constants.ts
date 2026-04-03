// ── App-wide string constants (i18n-ready) ────────────────────

export const APP_NAME = 'ViAudit';
export const APP_TAGLINE = 'AI Visibility Intelligence';
export const APP_DESCRIPTION =
  'Track how your brand appears inside ChatGPT, Perplexity, Gemini, Claude, Google AI Overviews, Copilot, and Grok.';

// ── Plan limits ───────────────────────────────────────────────

export const PLAN_LIMITS = {
  STARTER: {
    brands: 3,
    competitors: 3,
    promptsPerBrand: 50,
    scanFrequency: 'WEEKLY' as const,
    geoCountries: 1,
    engines: 4,
    label: 'Starter',
    price: 199,
  },
  AGENCY: {
    brands: 15,
    competitors: 5,
    promptsPerBrand: 50,
    scanFrequency: 'DAILY' as const,
    geoCountries: 10,
    engines: 7,
    label: 'Agency',
    price: 599,
  },
  ENTERPRISE: {
    brands: Infinity,
    competitors: Infinity,
    promptsPerBrand: 100,
    scanFrequency: 'DAILY' as const,
    geoCountries: 50,
    engines: 7,
    label: 'Enterprise',
    price: 1999,
  },
} as const;

// ── Engine weights for overall score (7 engines) ────────────

export const ENGINE_WEIGHTS = {
  CHATGPT:    0.20,
  PERPLEXITY: 0.20,
  GEMINI:     0.15,
  CLAUDE:     0.15,
  GOOGLE_AIO: 0.15,
  COPILOT:    0.08,
  GROK:       0.07,
} as const;

// ── Engine display info ──────────────────────────────────────

export const ENGINE_INFO: Record<string, { label: string; color: string }> = {
  CHATGPT:    { label: 'ChatGPT',        color: '#10a37f' },
  PERPLEXITY: { label: 'Perplexity',     color: '#20b2aa' },
  GEMINI:     { label: 'Gemini',         color: '#4285f4' },
  CLAUDE:     { label: 'Claude',         color: '#d97706' },
  GOOGLE_AIO: { label: 'Google AI',      color: '#ea4335' },
  COPILOT:    { label: 'Copilot',        color: '#0078d4' },
  GROK:       { label: 'Grok',           color: '#1da1f2' },
};

export const ALL_ENGINES = Object.keys(ENGINE_WEIGHTS) as Array<keyof typeof ENGINE_WEIGHTS>;

// ── High-DA domains for citation quality bonus ───────────────

export const HIGH_DA_DOMAINS = new Set([
  'g2.com',
  'capterra.com',
  'trustradius.com',
  'gartner.com',
  'forrester.com',
  'techcrunch.com',
  'venturebeat.com',
  'thenextweb.com',
  'producthunt.com',
  'getapp.com',
  'softwareadvice.com',
  'pcmag.com',
  'cnet.com',
  'zdnet.com',
  'computerworld.com',
  'infoworld.com',
  'techradar.com',
  'tomsguide.com',
]);

// ── Scoring thresholds ────────────────────────────────────────

export const SCORE_THRESHOLDS = {
  LOW_OVERALL:       30,
  LOW_SHARE_OF_VOICE: 40,
  ENGINE_GAP:        20,
} as const;

// ── Scan config ───────────────────────────────────────────────

export const SCAN_CONCURRENCY      = 20;
export const SCAN_ENGINE_DELAY_MS  = 500;
export const AI_MAX_RETRIES        = 3;
export const AI_RETRY_BASE_DELAY_MS = 1000;

// ── Routes ────────────────────────────────────────────────────

export const ROUTES = {
  HOME:         '/',
  LOGIN:        '/login',
  REGISTER:     '/register',
  ONBOARDING:   '/onboarding',
  DASHBOARD:    '/dashboard',
  BRANDS:       '/brands',
  REPORTS:      '/reports',
  SETTINGS:     '/settings',
  INTEGRATIONS: '/integrations',
  AUDIT:        '/audit',
  OPTIMIZER:    '/optimizer',
} as const;

// ── Email ─────────────────────────────────────────────────────

export const EMAIL = {
  FROM:              process.env['RESEND_FROM_EMAIL'] ?? 'noreply@viaudit.com',
  REPORT_READY_SUBJECT: `Your weekly AI visibility report is ready — ${APP_NAME}`,
} as const;
