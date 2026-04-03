'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://www.viaudit.com';

interface Brand {
  id:   string;
  name: string;
}

// ── Copy button ───────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className="absolute top-3 right-3 px-2.5 py-1 rounded text-[10px] font-medium bg-[var(--bg3)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors border border-[var(--border)]"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

// ── Code block ────────────────────────────────────────────────
function CodeBlock({ code, lang = 'html' }: { code: string; lang?: string }) {
  return (
    <div className="relative mt-3">
      <pre className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 pr-20 text-xs text-[var(--text)] overflow-x-auto leading-relaxed font-mono whitespace-pre">
        {code}
      </pre>
      <CopyButton text={code} />
    </div>
  );
}

// ── Section header ────────────────────────────────────────────
function SectionHeader({ title, badge, children }: { title: string; badge?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <h3 className="font-heading font-bold text-base">{title}</h3>
      {badge && <Badge variant="neutral">{badge}</Badge>}
      {children}
    </div>
  );
}

// ── Platform tab ──────────────────────────────────────────────
type Tab = 'wordpress' | 'wix' | 'webflow' | 'react' | 'mcp';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'wordpress', label: 'WordPress', emoji: '🟦' },
  { id: 'wix',       label: 'Wix',       emoji: '⬛' },
  { id: 'webflow',   label: 'Webflow',   emoji: '🔵' },
  { id: 'react',     label: 'React',     emoji: '⚛️' },
  { id: 'mcp',       label: 'MCP Server', emoji: '🤖' },
];

export default function IntegrationsPage() {
  const { toast }               = useToast();
  const [brands, setBrands]     = useState<Brand[]>([]);
  const [brandId, setBrandId]   = useState('');
  const [tab, setTab]           = useState<Tab>('wordpress');
  const [apiKey, setApiKey]     = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/brands')
      .then((r) => r.json())
      .then((d: { brands?: Brand[] }) => {
        const list = d.brands ?? [];
        setBrands(list);
        if (list[0]) setBrandId(list[0].id);
      })
      .catch(() => {});

    fetch('/api/billing/api-key', { method: 'GET' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { apiKey?: string } | null) => { if (d?.apiKey) setApiKey(d.apiKey); })
      .catch(() => {});
  }, []);

  const badgeUrl    = `${APP_URL}/api/public/badge/${brandId}`;
  const badgeShield = `${APP_URL}/api/public/badge/${brandId}?style=shield`;

  // ── Snippet generators ───────────────────────────────────────

  const htmlSnippet = `<!-- ViAudit AI Visibility Badge -->
<a href="https://www.viaudit.com" target="_blank" rel="noopener">
  <img src="${badgeUrl}" alt="AI Visibility Score" height="64" />
</a>`;

  const wpSnippet = `<?php
/**
 * Add ViAudit AI Visibility Badge to your site footer.
 * Paste into your theme's functions.php
 */
add_action( 'wp_footer', function() { ?>
  <a href="https://www.viaudit.com" target="_blank" rel="noopener"
     style="display:inline-block;margin:8px">
    <img src="${badgeUrl}"
         alt="AI Visibility Score by ViAudit"
         height="64" loading="lazy" />
  </a>
<?php });`;

  const wpShortcode = `<?php
/**
 * [viaudit_badge] shortcode — use anywhere in posts/pages.
 */
add_shortcode( 'viaudit_badge', function( $atts ) {
  $atts = shortcode_atts([
    'style' => 'round',
    'theme' => 'dark',
  ], $atts );
  $url = "${badgeUrl}?style={$atts['style']}&theme={$atts['theme']}";
  return '<a href="https://www.viaudit.com" target="_blank" rel="noopener">'
       . '<img src="' . esc_url($url) . '" alt="AI Visibility Score" height="64" />'
       . '</a>';
});`;

  const wixVelo = `// Wix Velo — add to your site's masterPage.js
// Dashboard → Dev Mode → masterPage.js

$w.onReady(function () {
  // Insert an HTML Component on your page first, then reference it here
  $w('#html1').src =
    '${badgeUrl}';

  $w('#html1').onMessage((event) => {
    console.log('ViAudit badge loaded', event.data);
  });
});`;

  const wixEmbed = `<!-- Wix: Add → Embed → HTML iframe/embed code -->
<a href="https://www.viaudit.com" target="_blank" rel="noopener"
   style="display:inline-block">
  <img src="${badgeUrl}"
       alt="AI Visibility Score"
       height="64"
       style="border-radius:12px" />
</a>`;

  const webflowEmbed = `<!-- Webflow: Add an Embed element, paste this code -->
<a href="https://www.viaudit.com"
   target="_blank" rel="noopener"
   style="display:inline-flex;text-decoration:none">
  <img src="${badgeUrl}"
       alt="AI Visibility Score by ViAudit"
       height="64"
       style="border-radius:12px;display:block" />
</a>

<!-- Shield badge (compact, fits in nav/footer): -->
<img src="${badgeShield}"
     alt="AI Visibility"
     height="20"
     style="display:inline-block;vertical-align:middle" />`;

  const reactComponent = `// Install: no extra package needed — just use the img tag
// Or add this reusable component to your project

interface ViAuditBadgeProps {
  brandId: string;
  style?:  'round' | 'flat' | 'shield';
  theme?:  'dark' | 'light';
  height?: number;
}

export function ViAuditBadge({
  brandId,
  style  = 'round',
  theme  = 'dark',
  height = 64,
}: ViAuditBadgeProps) {
  const src = \`${APP_URL}/api/public/badge/\${brandId}?style=\${style}&theme=\${theme}\`;
  return (
    <a
      href="https://www.viaudit.com"
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'inline-flex' }}
    >
      <img src={src} alt="AI Visibility Score" height={height} />
    </a>
  );
}

// Usage:
// <ViAuditBadge brandId="${brandId}" style="round" theme="dark" />
// <ViAuditBadge brandId="${brandId}" style="shield" height={20} />`;

  const reactHook = `// React hook — fetch live score data via the API
import { useEffect, useState } from 'react';

interface ViAuditScore {
  overallScore:    number;
  shareOfVoice:    number;
  chatgptScore:    number;
  perplexityScore: number;
  geminiScore:     number;
  claudeScore:     number;
}

export function useViAuditScore(brandId: string, apiKey: string) {
  const [score, setScore]     = useState<ViAuditScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(\`${APP_URL}/api/v1/brands/\${brandId}/scores\`, {
      headers: { Authorization: \`Bearer \${apiKey}\` },
    })
      .then((r) => r.json())
      .then((d) => { setScore(d.scores?.[0] ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [brandId, apiKey]);

  return { score, loading };
}

// Usage:
// const { score } = useViAuditScore('${brandId}', 'YOUR_API_KEY');`;

  const mcpConfig = `{
  "mcpServers": {
    "viaudit": {
      "command": "npx",
      "args": ["-y", "viaudit-mcp"],
      "env": {
        "VIAUDIT_API_KEY": "${apiKey ?? 'YOUR_API_KEY'}",
        "VIAUDIT_BASE_URL": "${APP_URL}"
      }
    }
  }
}`;

  const mcpServer = `#!/usr/bin/env node
/**
 * ViAudit MCP Server
 * Gives Claude and other AI assistants direct access to your brand's
 * AI visibility data, recommendations, and scan controls.
 *
 * Save as: viaudit-mcp-server.mjs
 * Run with: VIAUDIT_API_KEY=xxx node viaudit-mcp-server.mjs
 */

import { McpServer }              from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport }   from '@modelcontextprotocol/sdk/server/stdio.js';
import { z }                      from 'zod';

const BASE_URL = process.env.VIAUDIT_BASE_URL ?? '${APP_URL}';
const API_KEY  = process.env.VIAUDIT_API_KEY  ?? '';

async function api(path, options = {}) {
  const res = await fetch(\`\${BASE_URL}\${path}\`, {
    ...options,
    headers: { Authorization: \`Bearer \${API_KEY}\`, 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) throw new Error(\`ViAudit API error \${res.status}: \${await res.text()}\`);
  return res.json();
}

const server = new McpServer({ name: 'viaudit', version: '1.0.0' });

// ── Tool: list_brands ─────────────────────────────────────────
server.tool('list_brands', 'List all tracked brands', {}, async () => {
  const data = await api('/api/v1/brands');
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(data.brands ?? [], null, 2),
    }],
  };
});

// ── Tool: get_visibility_score ────────────────────────────────
server.tool(
  'get_visibility_score',
  'Get AI visibility scores for a brand (overall + per engine)',
  { brandId: z.string().describe('The brand ID to get scores for') },
  async ({ brandId }) => {
    const data = await api(\`/api/v1/brands/\${brandId}/scores\`);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(data.scores ?? [], null, 2),
      }],
    };
  },
);

// ── Tool: get_recommendations ─────────────────────────────────
server.tool(
  'get_recommendations',
  'Get open AI visibility recommendations for a brand',
  { brandId: z.string().describe('The brand ID') },
  async ({ brandId }) => {
    const data = await api(\`/api/v1/brands/\${brandId}/recommendations\`);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(data.recommendations ?? [], null, 2),
      }],
    };
  },
);

// ── Tool: trigger_scan ────────────────────────────────────────
server.tool(
  'trigger_scan',
  'Trigger a new AI visibility scan for a brand',
  { brandId: z.string().describe('The brand ID to scan') },
  async ({ brandId }) => {
    const data = await api('/api/scans', {
      method: 'POST',
      body:   JSON.stringify({ brandId }),
    });
    return {
      content: [{
        type: 'text',
        text: \`Scan started. Scan ID: \${data.scanId}. Results ready in ~5 minutes.\`,
      }],
    };
  },
);

// ── Tool: get_share_of_voice ──────────────────────────────────
server.tool(
  'get_share_of_voice',
  'Get the share of voice percentage — how often your brand is cited vs competitors in AI responses',
  { brandId: z.string().describe('The brand ID') },
  async ({ brandId }) => {
    const data  = await api(\`/api/v1/brands/\${brandId}/scores\`);
    const latest = data.scores?.[0];
    if (!latest) return { content: [{ type: 'text', text: 'No scores found yet. Run a scan first.' }] };
    return {
      content: [{
        type: 'text',
        text: [
          \`Brand: \${brandId}\`,
          \`Share of Voice: \${Math.round(latest.shareOfVoice)}%\`,
          \`Overall Score:  \${latest.overallScore}/100\`,
          \`ChatGPT Score:  \${latest.chatgptScore}/100\`,
          \`Perplexity:     \${latest.perplexityScore}/100\`,
          \`Gemini Score:   \${latest.geminiScore}/100\`,
          \`Claude Score:   \${latest.claudeScore}/100\`,
          \`Week of:        \${latest.weekOf}\`,
        ].join('\\n'),
      }],
    };
  },
);

// ── Start server ──────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('ViAudit MCP server running (stdio)');`;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold">Integrations</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Embed your AI visibility score anywhere, or connect AI assistants via MCP.
        </p>
      </div>

      {/* Brand selector */}
      {brands.length > 1 && (
        <div className="mb-6 flex items-center gap-3">
          <label className="text-sm text-[var(--text-muted)]">Brand:</label>
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="bg-[var(--bg2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm"
          >
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      {/* Badge preview */}
      {brandId && (
        <Card className="mb-8">
          <h2 className="font-heading font-bold text-base mb-4">Badge preview</h2>
          <div className="flex flex-wrap gap-6 items-end">
            <div className="flex flex-col gap-2 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${badgeUrl}?t=${Date.now()}`} alt="Score badge (dark)" height={64} />
              <span className="text-[10px] text-[var(--text-muted)]">Dark (default)</span>
            </div>
            <div className="flex flex-col gap-2 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${badgeUrl}?theme=light&t=${Date.now()}`} alt="Score badge (light)" height={64} />
              <span className="text-[10px] text-[var(--text-muted)]">Light</span>
            </div>
            <div className="flex flex-col gap-2 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${badgeShield}&t=${Date.now()}`} alt="Score badge (shield)" height={20} />
              <span className="text-[10px] text-[var(--text-muted)]">Shield (compact)</span>
            </div>
          </div>
        </Card>
      )}

      {/* Platform tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
              tab === t.id
                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* ── WordPress ── */}
      {tab === 'wordpress' && (
        <div className="flex flex-col gap-6">
          <Card>
            <SectionHeader title="Option 1: HTML Badge Embed" badge="Easiest" />
            <p className="text-sm text-[var(--text-muted)]">
              Go to <strong>Appearance → Widgets</strong> (or use a Custom HTML block in the editor) and paste:
            </p>
            <CodeBlock code={htmlSnippet} />
          </Card>

          <Card>
            <SectionHeader title="Option 2: functions.php footer hook" badge="Developer" />
            <p className="text-sm text-[var(--text-muted)]">
              Adds the badge automatically to every page footer.
            </p>
            <CodeBlock code={wpSnippet} lang="php" />
          </Card>

          <Card>
            <SectionHeader title="Option 3: [viaudit_badge] Shortcode" badge="Flexible" />
            <p className="text-sm text-[var(--text-muted)]">
              Register a shortcode so editors can drop the badge anywhere in posts/pages.
            </p>
            <CodeBlock code={wpShortcode} lang="php" />
            <p className="text-xs text-[var(--text-muted)] mt-3">
              Usage: <code className="bg-[var(--bg3)] px-1 rounded">[viaudit_badge style="shield" theme="light"]</code>
            </p>
          </Card>
        </div>
      )}

      {/* ── Wix ── */}
      {tab === 'wix' && (
        <div className="flex flex-col gap-6">
          <Card>
            <SectionHeader title="Embed Code (Easiest)" badge="No coding" />
            <ol className="text-sm text-[var(--text-muted)] list-decimal list-inside space-y-1 mb-3">
              <li>In the Wix Editor, click <strong>Add → Embed → HTML Code</strong></li>
              <li>Paste the code below into the HTML box</li>
              <li>Resize the element to fit the badge (160×64 px for default, 120×20 for shield)</li>
            </ol>
            <CodeBlock code={wixEmbed} />
          </Card>

          <Card>
            <SectionHeader title="Velo (Dev Mode)" badge="Developer" />
            <p className="text-sm text-[var(--text-muted)] mb-2">
              Enable Dev Mode, add an HTML Component element, then connect it via masterPage.js:
            </p>
            <CodeBlock code={wixVelo} lang="js" />
          </Card>
        </div>
      )}

      {/* ── Webflow ── */}
      {tab === 'webflow' && (
        <div className="flex flex-col gap-6">
          <Card>
            <SectionHeader title="Embed Element" badge="Easiest" />
            <ol className="text-sm text-[var(--text-muted)] list-decimal list-inside space-y-1 mb-3">
              <li>In the Webflow Designer, click <strong>+</strong> → <strong>Embed</strong></li>
              <li>Paste the code below into the HTML Embed dialog</li>
              <li>Click <strong>Save &amp; Close</strong> and publish</li>
            </ol>
            <CodeBlock code={webflowEmbed} />
          </Card>

          <Card>
            <SectionHeader title="Custom Code (Site-wide)" badge="Advanced" />
            <p className="text-sm text-[var(--text-muted)] mb-2">
              Go to <strong>Site Settings → Custom Code → Footer Code</strong> and paste the HTML badge snippet.
              This adds it to every page automatically.
            </p>
            <CodeBlock code={htmlSnippet} />
          </Card>
        </div>
      )}

      {/* ── React ── */}
      {tab === 'react' && (
        <div className="flex flex-col gap-6">
          <Card>
            <SectionHeader title="ViAuditBadge Component" badge="Recommended" />
            <p className="text-sm text-[var(--text-muted)] mb-2">
              Copy this component into your project — no extra dependencies needed.
            </p>
            <CodeBlock code={reactComponent} lang="tsx" />
          </Card>

          <Card>
            <SectionHeader title="useViAuditScore Hook" badge="API access" />
            <p className="text-sm text-[var(--text-muted)] mb-2">
              Fetch live score data in your React app and build custom UI.
              Requires an <strong>Enterprise API key</strong> from Settings.
            </p>
            <CodeBlock code={reactHook} lang="tsx" />
            {!apiKey && (
              <p className="text-xs text-yellow-400 mt-3">
                ⚠ API key only available on the Enterprise plan. Go to Settings → API Access.
              </p>
            )}
          </Card>
        </div>
      )}

      {/* ── MCP Server ── */}
      {tab === 'mcp' && (
        <div className="flex flex-col gap-6">
          <Card>
            <SectionHeader title="What is the ViAudit MCP Server?" />
            <p className="text-sm text-[var(--text-muted)]">
              The <strong>Model Context Protocol (MCP)</strong> lets AI assistants like Claude Desktop
              directly query your brand's AI visibility data, read recommendations, and trigger scans —
              without leaving the chat interface.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              {[
                { icon: '📊', label: 'Read live scores',        desc: 'Ask Claude your current AI visibility score' },
                { icon: '🎯', label: 'Get recommendations',     desc: 'Claude reads your open action items' },
                { icon: '▶️', label: 'Trigger scans',           desc: 'Start a new scan from any AI chat' },
              ].map((f) => (
                <div key={f.label} className="bg-[var(--bg3)] rounded-xl p-4">
                  <div className="text-xl mb-2">{f.icon}</div>
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHeader title="Step 1: Get your API key" />
            <p className="text-sm text-[var(--text-muted)]">
              Go to <strong>Settings → API Access</strong> and generate your Enterprise API key.
              {apiKey && (
                <span className="text-[var(--accent)] ml-1">✓ Your key is ready.</span>
              )}
            </p>
          </Card>

          <Card>
            <SectionHeader title="Step 2: Save the MCP server file" />
            <p className="text-sm text-[var(--text-muted)] mb-2">
              Save this as <code className="bg-[var(--bg3)] px-1 rounded text-xs">viaudit-mcp-server.mjs</code> anywhere on your machine:
            </p>
            <CodeBlock code={mcpServer} lang="js" />
          </Card>

          <Card>
            <SectionHeader title="Step 3: Add to Claude Desktop config" />
            <p className="text-sm text-[var(--text-muted)] mb-2">
              Open <code className="bg-[var(--bg3)] px-1 rounded text-xs">~/Library/Application Support/Claude/claude_desktop_config.json</code> and add:
            </p>
            <CodeBlock code={mcpConfig} lang="json" />
            <p className="text-xs text-[var(--text-muted)] mt-3">
              Restart Claude Desktop. You'll see <strong>ViAudit</strong> in the MCP tools panel (🔌 icon).
            </p>
          </Card>

          <Card>
            <SectionHeader title="Example prompts for Claude" />
            <div className="flex flex-col gap-2 mt-1">
              {[
                'What is my current AI visibility score?',
                'Show me all open recommendations for my brand.',
                'Which AI engine gives me the worst score and why?',
                'Trigger a new visibility scan for my brand.',
                'Compare my share of voice this week vs last week.',
              ].map((prompt) => (
                <div key={prompt} className="flex items-center gap-2 bg-[var(--bg3)] rounded-lg px-3 py-2">
                  <span className="text-[var(--accent)] text-xs">›</span>
                  <span className="text-sm italic text-[var(--text-muted)]">"{prompt}"</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
