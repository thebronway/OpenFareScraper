'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, Check, Copy, KeyRound, Loader2, ShieldCheck, X } from 'lucide-react';
import type { ApiKeyRecord } from '@/types';
import SettingsModalPortal from '../shared/SettingsModalPortal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
  onError: (message: string) => void;
}

function fallbackCopyText(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let succeeded = false;
  try {
    succeeded = document.execCommand('copy');
  } catch {
    succeeded = false;
  } finally {
    document.body.removeChild(textarea);
  }
  return succeeded;
}

export default function CreateApiKeyModal({
  isOpen,
  onClose,
  onCreated,
  onError,
}: Props) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [createdRecord, setCreatedRecord] = useState<ApiKeyRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setSubmitting(false);
    setCreatedRawKey(null);
    setCreatedRecord(null);
    setCopied(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (res.status === 401) {
        window.location.assign('/login?next=/settings/security');
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.rawKey || !data.record) {
        onError(data.error || 'Failed to mint API key.');
        return;
      }

      setCreatedRawKey(data.rawKey);
      setCreatedRecord(data.record);
      await onCreated();
    } catch {
      onError('Network error while minting API key.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyToken = async () => {
    if (!createdRawKey) return;
    let ok = false;
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      window.isSecureContext
    ) {
      try {
        await navigator.clipboard.writeText(createdRawKey);
        ok = true;
      } catch {
        ok = fallbackCopyText(createdRawKey);
      }
    } else {
      ok = fallbackCopyText(createdRawKey);
    }

    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      onError('Clipboard access blocked — select the key and copy manually.');
    }
  };

  return (
    <SettingsModalPortal>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      >
        <div className="bg-gunmetal-card border-0 sm:border border-gunmetal-border rounded-none sm:rounded-2xl shadow-2xl max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
          <div className="px-4 sm:px-6 py-4 border-b border-gunmetal-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-sky-950/60 border border-sky-800/60 flex-shrink-0">
                <KeyRound className="w-5 h-5 text-sky-400" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-base sm:text-lg text-slate-100 truncate">
                  {createdRawKey ? 'API Key Created' : 'Create API Key'}
                </h2>
                <p className="text-xs text-gunmetal-muted">
                  {createdRawKey
                    ? 'Copy and store this bearer token securely now'
                    : 'Mint a SHA-256 hashed key for /api/v1/* clients'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] inline-flex items-center justify-center rounded-lg text-gunmetal-muted hover:text-slate-100 hover:bg-gunmetal-canvas transition-colors flex-shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {createdRawKey ? (
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto [overflow-anchor:none] space-y-4 min-h-0">
              <div className="p-3 rounded-lg bg-amber-950/35 border border-amber-700/60 text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-100">
                    This secret key will only be shown once
                  </p>
                  <p className="text-amber-200/85 leading-relaxed">
                    OpenFareScraper stores only a SHA-256 hash of this token. If you lose it, revoke the key and generate a new one.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold">{createdRecord?.name}</span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
                    Active
                  </span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gunmetal-canvas border border-gunmetal-border">
                  <code className="flex-1 text-xs font-mono text-emerald-300 break-all select-all">
                    {createdRawKey}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md bg-gunmetal-border hover:bg-slate-700 border border-slate-500 text-xs font-semibold text-slate-100 inline-flex items-center gap-1.5 flex-shrink-0 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-sky-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gunmetal-canvas/80 border border-gunmetal-border text-[11px] text-gunmetal-muted space-y-1">
                <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Authentication Header Examples</span>
                </p>
                <code className="block font-mono text-slate-300">
                  Authorization: Bearer {createdRawKey.slice(0, 12)}...
                </code>
                <code className="block font-mono text-slate-300">
                  X-API-Key: {createdRawKey.slice(0, 12)}...
                </code>
              </div>

              <div className="pt-3 border-t border-gunmetal-border flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] sm:min-h-[38px] px-5 py-2 text-xs sm:text-sm font-semibold bg-slate-800/75 hover:bg-slate-700/85 border border-slate-500/80 hover:border-slate-400 text-slate-100 hover:text-white rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex-1 p-4 sm:p-6 overflow-y-auto [overflow-anchor:none] space-y-4 min-h-0"
            >
              <div>
                <label
                  htmlFor="ofs-api-key-name"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Key Label
                </label>
                <input
                  id="ofs-api-key-name"
                  type="text"
                  maxLength={64}
                  required
                  disabled={submitting}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. FlightSentry Prod, Custom Tracker, Home Lab"
                  className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-slate-500 disabled:opacity-50"
                />
                <p className="text-[11px] text-gunmetal-muted mt-1.5 leading-relaxed">
                  Give this key a descriptive client label so per-key rolling request volume (<code className="text-slate-300">1h</code> / <code className="text-slate-300">24h</code> / <code className="text-slate-300">Total</code>) is easy to audit.
                </p>
              </div>

              <div className="pt-3 border-t border-gunmetal-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs sm:text-sm font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 hover:text-white border border-gunmetal-border rounded-lg transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs sm:text-sm font-semibold bg-slate-800/75 hover:bg-slate-700/85 border border-slate-500/80 hover:border-slate-400 text-slate-100 hover:text-white rounded-lg transition-colors shadow-sm inline-flex items-center justify-center gap-1.5 disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? 'Minting...' : 'Mint API Key'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </SettingsModalPortal>
  );
}