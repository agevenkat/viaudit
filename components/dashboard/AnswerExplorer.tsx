'use client';

import React, { useState, useMemo } from 'react';

// ── Engine config ─────────────────────────────────────────────

const ENGINE_META = {
  CHATGPT:    { label: 'ChatGPT',    color: '#10a37f', bg: '#10a37f18' },
  PERPLEXITY: { label: 'Perplexity', color: '#6366f1', bg: '#6366f118' },
  GEMINI:     { label: 'Gemini',     color: '#4285f4', bg: '#4285f418' },
  CLAUDE:     { label: 'Claude',     color: '#d97706', bg: '#d9770618' },
} as const;

type EngineKey = keyof typeof ENGINE_META;

// ── Types matching Prisma ScanResult (subset) ─────────────────

interface ResultRow {
  id:               string;
  engine:           string;
  prompt:           string;
  response:         string;
  brandMentioned:   boolean;
  citationPosition: number | null;
  citationSourceUrl: string | null;
}

interface Props {
  results:   ResultRow[];
  brandName: string;
}

// ── Brand highlight helper ────────────────────────────────────

function HighlightedText({
  text,
  brandName,
}: {
  text: string;
  brandName: string;
}) {
  if (!brandName || !text) return <>{text}</>;

  const regex  = new RegExp(`(${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts  = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-[var(--accent)]/25 text-[var(--accent)] rounded px-0.5 not-italic font-semibold"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────

type MentionFilter = 'ALL' | 'YES' | 'NO';

export function AnswerExplorer({ results, brandName }: Props) {
  const [expandedId,     setExpandedId]     = useState<string | null>(null);
  const [engineFilter,   setEngineFilter]   = useState<string>('ALL');
  const [mentionFilter,  setMentionFilter]  = useState<MentionFilter>('ALL');

  const filtered = useMemo(
    () =>
      results.filter((r) => {
        if (engineFilter  !== 'ALL' && r.engine !== engineFilter) return false;
        if (mentionFilter === 'YES' && !r.brandMentioned)         return false;
        if (mentionFilter === 'NO'  && r.brandMentioned)          return false;
        return true;
      }),
    [results, engineFilter, mentionFilter],
  );

  const mentionedCount  = results.filter((r) => r.brandMentioned).length;
  const mentionRate     = results.length ? Math.round((mentionedCount / results.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">

      {/* Summary bar */}
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="text-[var(--text-muted)]">
          <strong className="text-[var(--text)]">{mentionedCount}</strong> / {results.length} prompts mentioned {brandName}
        </span>
        <span className="text-[var(--text-muted)]">
          Mention rate: <strong className="text-[var(--accent)]">{mentionRate}%</strong>
        </span>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {/* Engine filters */}
        {(['ALL', 'CHATGPT', 'PERPLEXITY', 'GEMINI', 'CLAUDE'] as const).map((e) => {
          const meta  = e !== 'ALL' ? ENGINE_META[e] : null;
          const active = engineFilter === e;
          return (
            <button
              key={e}
              onClick={() => setEngineFilter(e)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                active
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-black'
                  : 'border-[var(--border)] bg-[var(--bg3)] text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
              style={active && meta ? { backgroundColor: meta.color, borderColor: meta.color } : {}}
            >
              {e === 'ALL' ? 'All engines' : meta?.label}
            </button>
          );
        })}

        <div className="flex-1" />

        {/* Mention filters */}
        {(['ALL', 'YES', 'NO'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setMentionFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
              mentionFilter === f
                ? 'border-[var(--accent)] bg-[var(--accent)] text-black'
                : 'border-[var(--border)] bg-[var(--bg3)] text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {f === 'ALL' ? 'All results' : f === 'YES' ? '✓ Mentioned' : '✗ Not mentioned'}
          </button>
        ))}
      </div>

      {/* Result count */}
      <p className="text-xs text-[var(--text-muted)]">
        Showing {filtered.length} of {results.length} results
      </p>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((r) => {
          const meta    = ENGINE_META[r.engine as EngineKey];
          const open    = expandedId === r.id;
          return (
            <div
              key={r.id}
              onClick={() => setExpandedId(open ? null : r.id)}
              className={`cursor-pointer rounded-xl border transition-all duration-200 ${
                open
                  ? 'border-[var(--accent)] shadow-sm'
                  : 'border-[var(--border)] hover:border-[var(--accent)]/50'
              }`}
            >
              {/* Card header */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  {/* Engine badge */}
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: meta?.bg ?? '#88888818', color: meta?.color ?? '#888' }}
                  >
                    {meta?.label ?? r.engine}
                  </span>

                  {/* Mention status */}
                  {r.brandMentioned ? (
                    <span className="text-xs font-semibold text-[var(--accent)]">✓ Mentioned</span>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">✗ Not mentioned</span>
                  )}

                  {/* Citation position */}
                  {r.citationPosition !== null && (
                    <span className="ml-auto text-xs text-[var(--text-muted)]">
                      #{r.citationPosition}
                    </span>
                  )}

                  {/* Expand chevron */}
                  <span
                    className={`ml-auto text-[var(--text-muted)] text-xs transition-transform ${open ? 'rotate-180' : ''}`}
                    style={{ marginLeft: r.citationPosition !== null ? 'auto' : 'auto' }}
                  >
                    ▾
                  </span>
                </div>

                {/* Prompt */}
                <p className={`text-sm font-medium ${open ? '' : 'line-clamp-2'}`}>
                  {r.prompt}
                </p>
              </div>

              {/* Expanded response */}
              {open && (
                <div
                  className="px-4 pb-4 pt-3 border-t border-[var(--border)] bg-[var(--bg)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-2">
                    AI Response
                  </p>
                  <p className="text-xs leading-relaxed text-[var(--text)] whitespace-pre-wrap">
                    <HighlightedText text={r.response} brandName={brandName} />
                  </p>
                  {r.citationSourceUrl && (
                    <a
                      href={r.citationSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                    >
                      🔗 {r.citationSourceUrl}
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-[var(--text-muted)] text-sm">
          No results match the selected filters.
        </div>
      )}
    </div>
  );
}
