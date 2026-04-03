import React from 'react';
import Link from 'next/link';
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION, ROUTES, PLAN_LIMITS } from '@/lib/constants';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Nav */}
      <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <span className="font-heading text-xl font-bold text-[var(--accent)]">{APP_NAME}</span>
        <div className="flex items-center gap-4">
          <Link href={ROUTES.LOGIN} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            Sign in
          </Link>
          <Link
            href={ROUTES.REGISTER}
            className="px-4 py-2 bg-[var(--accent)] rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ color: '#000000' }}
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] text-xs text-[var(--text-muted)] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
          {APP_TAGLINE}
        </div>
        <h1 className="font-heading text-5xl md:text-7xl font-extrabold leading-tight mb-6">
          Is your brand<br />
          <span className="text-[var(--accent)]">invisible to AI?</span>
        </h1>
        <p className="text-[var(--text-muted)] text-lg max-w-2xl mx-auto mb-10">
          {APP_DESCRIPTION} Fire hundreds of real buyer prompts weekly, score your visibility,
          track competitors, and get fix recommendations.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={ROUTES.REGISTER}
            className="px-8 py-3.5 bg-[var(--accent)] rounded-xl text-base font-bold hover:opacity-90 transition-opacity w-full sm:w-auto"
            style={{ color: '#000000' }}
          >
            Start free audit →
          </Link>
          <Link
            href={ROUTES.LOGIN}
            className="px-8 py-3.5 border border-[var(--border)] rounded-xl text-base text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-all w-full sm:w-auto"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Engines */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <p className="text-center text-sm text-[var(--text-muted)] mb-8">
          We track your brand across every major AI engine
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'ChatGPT',       color: '#10a37f', sub: 'GPT-4o' },
            { name: 'Perplexity',    color: '#6366f1', sub: 'Sonar Large' },
            { name: 'Gemini',        color: '#4285f4', sub: 'Gemini 1.5 Pro' },
            { name: 'Claude',        color: '#d97706', sub: 'Claude Opus' },
            { name: 'Google AI',     color: '#ea4335', sub: 'AI Overviews' },
            { name: 'Copilot',       color: '#0078d4', sub: 'GPT-4o Turbo' },
            { name: 'Grok',          color: '#1da1f2', sub: 'Grok 3' },
          ].map(({ name, color, sub }) => (
            <div
              key={name}
              className="border border-[var(--border)] bg-[var(--bg2)] rounded-xl p-5 text-center"
            >
              <div
                className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center text-lg font-bold"
                style={{ backgroundColor: `${color}20`, color }}
              >
                {name[0]}
              </div>
              <p className="font-heading font-bold text-sm">{name}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="font-heading text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              title: 'Add your brand',
              body: 'Tell us your brand name, domain, category, and up to 5 competitors.',
            },
            {
              step: '02',
              title: 'We fire 50+ prompts',
              body: 'Every week we fire real buyer prompts across ChatGPT, Perplexity, Gemini, and Claude.',
            },
            {
              step: '03',
              title: 'Get your score + fixes',
              body: "See where you're mentioned, where you're missing, and exactly what to fix.",
            },
          ].map(({ step, title, body }) => (
            <div key={step} className="border border-[var(--border)] bg-[var(--bg2)] rounded-xl p-6">
              <p className="font-heading text-4xl font-extrabold text-[var(--accent)] mb-3">{step}</p>
              <h3 className="font-heading text-lg font-bold mb-2">{title}</h3>
              <p className="text-sm text-[var(--text-muted)]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="font-heading text-3xl font-bold text-center mb-12">Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(
            Object.entries(PLAN_LIMITS) as [
              keyof typeof PLAN_LIMITS,
              (typeof PLAN_LIMITS)[keyof typeof PLAN_LIMITS],
            ][]
          ).map(([key, plan]) => (
            <div
              key={key}
              className={`border rounded-xl p-6 flex flex-col ${
                key === 'AGENCY'
                  ? 'border-[var(--accent)] bg-[var(--accent-dim)]'
                  : 'border-[var(--border)] bg-[var(--bg2)]'
              }`}
            >
              {key === 'AGENCY' && (
                <span className="text-xs font-bold text-[var(--accent)] mb-2">MOST POPULAR</span>
              )}
              <h3 className="font-heading text-xl font-bold mb-1">{plan.label}</h3>
              <p className="font-heading text-4xl font-extrabold mb-6">
                ${plan.price}
                <span className="text-base font-normal text-[var(--text-muted)]">/mo</span>
              </p>
              <ul className="flex flex-col gap-2 text-sm text-[var(--text-muted)] mb-8">
                <li>✓ {plan.brands === Infinity ? 'Unlimited' : plan.brands} brands</li>
                <li>
                  ✓ {plan.competitors === Infinity ? 'Unlimited' : plan.competitors} competitors per brand
                </li>
                <li>✓ {plan.promptsPerBrand} prompts per brand per week</li>
                <li>✓ {plan.engines} AI engines tracked</li>
                {key !== 'STARTER' && <li>✓ GEO Audit + AI Optimizer</li>}
                {key !== 'STARTER' && <li>✓ {plan.geoCountries} countries geo-tracking</li>}
                {key !== 'STARTER' && <li>✓ White-label client portal</li>}
                {key === 'ENTERPRISE' && <li>✓ Public REST API</li>}
              </ul>
              <Link
                href={ROUTES.REGISTER}
                style={key === 'AGENCY' ? { color: '#000000' } : undefined}
                className={`mt-auto text-center px-4 py-2.5 rounded-lg text-sm font-bold transition-opacity ${
                  key === 'AGENCY'
                    ? 'bg-[var(--accent)] hover:opacity-90'
                    : 'border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg3)]'
                }`}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-8 text-center text-xs text-[var(--text-muted)]">
        <span className="font-heading font-bold text-[var(--accent)] mr-2">{APP_NAME}</span>
        © {new Date().getFullYear()} · AI Visibility Intelligence for B2B SaaS
      </footer>
    </div>
  );
}
