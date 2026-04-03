'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface Props {
  name:           string;
  email:          string;
  userId:         string;
  slackWebhookUrl: string | null;
}

export function SettingsForm({ name: initialName, email, slackWebhookUrl: initialSlack }: Props) {
  const { toast } = useToast();

  // Profile
  const [name, setName]           = useState(initialName);
  const [profileLoading, setProfileLoading] = useState(false);

  // Slack
  const [slackUrl, setSlackUrl]   = useState(initialSlack ?? '');
  const [slackLoading, setSlackLoading]   = useState(false);
  const [testLoading, setTestLoading]     = useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await fetch('/api/settings/profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name }),
      });
      toast(res.ok ? 'Profile updated' : 'Failed to update', res.ok ? 'success' : 'error');
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleSaveSlack(e: React.FormEvent) {
    e.preventDefault();
    setSlackLoading(true);
    try {
      const res = await fetch('/api/settings/slack', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ webhookUrl: slackUrl }),
      });
      if (res.ok) {
        toast('Slack webhook saved', 'success');
      } else {
        const data = (await res.json()) as { error?: string };
        toast(data.error ?? 'Invalid webhook URL', 'error');
      }
    } finally {
      setSlackLoading(false);
    }
  }

  async function handleTestSlack() {
    setTestLoading(true);
    try {
      const res = await fetch('/api/settings/slack', { method: 'POST' });
      if (res.ok) {
        toast('Test message sent to Slack! Check your channel.', 'success');
      } else {
        const data = (await res.json()) as { error?: string };
        toast(data.error ?? 'Test failed', 'error');
      }
    } finally {
      setTestLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Profile section */}
      <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
        <Input
          label="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input label="Email" value={email} disabled />
        <Button type="submit" size="sm" loading={profileLoading} className="self-start">
          Save profile
        </Button>
      </form>

      {/* Slack section */}
      <div className="pt-6 border-t border-[var(--border)]">
        <div className="mb-4">
          <h3 className="font-heading font-bold">Slack Alerts</h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Get weekly AI visibility digests and instant score-drop alerts directly in Slack.
          </p>
        </div>

        {/* Setup steps */}
        <ol className="text-xs text-[var(--text-muted)] list-decimal list-inside space-y-1 mb-4 bg-[var(--bg3)] rounded-lg px-4 py-3">
          <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">api.slack.com/apps</a> → Create New App → From Scratch</li>
          <li>Enable <strong>Incoming Webhooks</strong> and add one to your channel</li>
          <li>Copy the webhook URL (starts with <code>https://hooks.slack.com/</code>) and paste below</li>
        </ol>

        <form onSubmit={handleSaveSlack} className="flex flex-col gap-3">
          <Input
            label="Slack Incoming Webhook URL"
            value={slackUrl}
            onChange={(e) => setSlackUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/T.../B.../..."
          />
          <div className="flex gap-3">
            <Button type="submit" size="sm" loading={slackLoading}>
              Save webhook
            </Button>
            {slackUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                loading={testLoading}
                onClick={handleTestSlack}
              >
                Send test message
              </Button>
            )}
          </div>
        </form>
      </div>

    </div>
  );
}
