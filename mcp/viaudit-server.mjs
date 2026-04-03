#!/usr/bin/env node
/**
 * ViAudit MCP Server
 * ==================
 * Gives Claude Desktop (and any MCP-compatible client) direct access to
 * your brand's AI visibility data, recommendations, and scan controls.
 *
 * Setup:
 *   1. Set env vars: VIAUDIT_API_KEY, VIAUDIT_BASE_URL (optional)
 *   2. Add to claude_desktop_config.json (see /integrations page for full config)
 *   3. Restart Claude Desktop
 *
 * Available tools:
 *   • list_brands           — list all tracked brands
 *   • get_visibility_score  — overall + per-engine scores
 *   • get_share_of_voice    — SoV % vs competitors
 *   • get_recommendations   — open action items
 *   • trigger_scan          — start a new scan
 */

import { McpServer }            from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z }                    from 'zod';

const BASE_URL = (process.env.VIAUDIT_BASE_URL ?? 'https://www.viaudit.com').replace(/\/$/, '');
const API_KEY  = process.env.VIAUDIT_API_KEY ?? '';

if (!API_KEY) {
  console.error('[ViAudit MCP] ERROR: VIAUDIT_API_KEY is not set. Get your key from Settings → API Access.');
  process.exit(1);
}

// ── API helper ────────────────────────────────────────────────

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization:  `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ViAudit API ${res.status}: ${body}`);
  }

  return res.json();
}

function text(content) {
  return { content: [{ type: 'text', text: typeof content === 'string' ? content : JSON.stringify(content, null, 2) }] };
}

// ── MCP server ────────────────────────────────────────────────

const server = new McpServer({
  name:    'viaudit',
  version: '1.0.0',
});

// list_brands
server.tool(
  'list_brands',
  'List all brands you are tracking in ViAudit',
  {},
  async () => {
    const data = await api('/api/v1/brands');
    const brands = data.brands ?? [];
    if (brands.length === 0) return text('No brands found. Add one at www.viaudit.com/brands');
    return text(brands.map(b => `• ${b.name} (${b.domain}) — ID: ${b.id}`).join('\n'));
  },
);

// get_visibility_score
server.tool(
  'get_visibility_score',
  'Get AI visibility scores for a brand. Returns overall score and per-engine breakdown (ChatGPT, Perplexity, Gemini, Claude).',
  { brandId: z.string().describe('Brand ID from list_brands') },
  async ({ brandId }) => {
    const data   = await api(`/api/v1/brands/${brandId}/scores`);
    const scores = data.scores ?? [];
    if (scores.length === 0) return text('No scores yet. Trigger a scan first with trigger_scan.');

    const s = scores[0];
    const prevS = scores[1];
    const delta = prevS ? (s.overallScore - prevS.overallScore).toFixed(1) : null;

    return text([
      `=== AI Visibility Score ===`,
      `Overall Score:   ${s.overallScore}/100${delta ? ` (${delta >= 0 ? '+' : ''}${delta} vs last week)` : ''}`,
      `Share of Voice:  ${Math.round(s.shareOfVoice)}%`,
      ``,
      `Per-engine breakdown:`,
      `  ChatGPT:    ${s.chatgptScore}/100`,
      `  Perplexity: ${s.perplexityScore}/100`,
      `  Gemini:     ${s.geminiScore}/100`,
      `  Claude:     ${s.claudeScore}/100`,
      ``,
      `Week of: ${new Date(s.weekOf).toLocaleDateString()}`,
      `Total prompts tested: ${s.totalPrompts}`,
      `Total brand mentions: ${s.totalMentions}`,
    ].join('\n'));
  },
);

// get_share_of_voice
server.tool(
  'get_share_of_voice',
  'Get the brand\'s share of voice — what percentage of AI responses mention this brand vs competitors',
  { brandId: z.string().describe('Brand ID from list_brands') },
  async ({ brandId }) => {
    const data   = await api(`/api/v1/brands/${brandId}/scores`);
    const scores = data.scores ?? [];
    if (scores.length === 0) return text('No data yet. Run a scan first.');

    const history = scores.slice(0, 4).map(s =>
      `  Week ${new Date(s.weekOf).toLocaleDateString()}: ${Math.round(s.shareOfVoice)}% SoV, ${s.overallScore}/100 overall`
    ).join('\n');

    return text([
      `=== Share of Voice History ===`,
      history,
      ``,
      `Share of Voice = your brand mentions ÷ all tracked mentions across 4 AI engines.`,
      `A score above 50% means you are cited more than all competitors combined.`,
    ].join('\n'));
  },
);

// get_recommendations
server.tool(
  'get_recommendations',
  'Get open AI visibility recommendations — specific actions to improve your brand\'s AI visibility score',
  { brandId: z.string().describe('Brand ID from list_brands') },
  async ({ brandId }) => {
    const data = await api(`/api/v1/brands/${brandId}/recommendations`);
    const recs  = (data.recommendations ?? []).filter(r => !r.resolved);
    if (recs.length === 0) return text('No open recommendations. Everything looks good, or run a new scan.');

    return text(recs.map((r, i) => [
      `${i + 1}. [${r.priority}] ${r.title}`,
      `   Type: ${r.type}`,
      `   ${r.description.replace(/\n/g, '\n   ')}`,
      `   Expected impact: ${r.expectedImpact}`,
    ].join('\n')).join('\n\n'));
  },
);

// trigger_scan
server.tool(
  'trigger_scan',
  'Trigger a new AI visibility scan for a brand. Scan runs across ChatGPT, Perplexity, Gemini, and Claude. Takes ~5 minutes.',
  { brandId: z.string().describe('Brand ID from list_brands') },
  async ({ brandId }) => {
    const data = await api('/api/scans', {
      method: 'POST',
      body:   JSON.stringify({ brandId }),
    });
    return text([
      `✓ Scan started successfully.`,
      `Scan ID: ${data.scanId}`,
      `Status: PENDING → will move to RUNNING within seconds`,
      ``,
      `The scan will query 50 prompts across ChatGPT, Perplexity, Gemini, and Claude.`,
      `Results will be available in approximately 3–5 minutes.`,
      `Use get_visibility_score to check results after the scan completes.`,
    ].join('\n'));
  },
);

// ── Connect and start ─────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[ViAudit MCP] Server running — connected to ${BASE_URL}`);
