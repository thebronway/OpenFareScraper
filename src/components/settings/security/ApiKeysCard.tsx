'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Ban, BookOpen, KeyRound, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import Tooltip from '@/components/common/Tooltip';
import type { ApiKeyRecord } from '@/types';
import SettingsCard from '../shared/SettingsCard';
import CreateApiKeyModal from './CreateApiKeyModal';

interface Props {
  keys: ApiKeyRecord[];
  onRefresh: () => Promise<void>;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

function formatDate(iso?: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ApiKeysCard({ keys, onRefresh, onNotify }: Props) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false);
  }, []);

  const handleRevoke = async (item: ApiKeyRecord) => {
    if (revokingId !== null || item.revokedAt) return;
    setRevokingId(item.id);
    try {
      const res = await fetch(`/api/admin/keys/${item.id}`, {
        method: 'PATCH',
      });
      if (res.status === 401) {
        window.location.assign('/login?next=/settings/security');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setConfirmDeleteId(null);
        await onRefresh();
        onNotify(`Revoked API key "${item.name}"`, 'success');
      } else {
        onNotify(data.error || 'Failed to revoke API key.', 'error');
      }
    } catch {
      onNotify('Network error while revoking API key.', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  const handleDeleteRevoked = async (item: ApiKeyRecord) => {
    if (deletingId !== null || !item.revokedAt) return;
    setDeletingId(item.id);
    try {
      const res = await fetch(`/api/admin/keys/${item.id}`, {
        method: 'DELETE',
      });
      if (res.status === 401) {
        window.location.assign('/login?next=/settings/security');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setConfirmDeleteId(null);
        await onRefresh();
        onNotify(`Deleted revoked API key "${item.name}"`, 'success');
      } else {
        onNotify(data.error || 'Failed to delete revoked API key.', 'error');
      }
    } catch {
      onNotify('Network error while deleting revoked API key.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <SettingsCard>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2.5">
          <KeyRound className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-slate-100">Public API Keys</h3>
            <p className="text-xs text-gunmetal-muted mt-0.5">
              Issue SHA-256 hashed bearer tokens (<code className="text-slate-300">ofs_...</code>) for FlightSentry and external REST API consumers.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center flex-shrink-0">
          <Link
            href="/api-docs"
            className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md bg-gunmetal-card hover:bg-gunmetal-border border border-gunmetal-border text-xs font-semibold text-slate-200 hover:text-white inline-flex items-center gap-1.5 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>API Reference</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 rounded-md bg-slate-800/75 hover:bg-slate-700/85 border border-slate-500/80 hover:border-slate-400 text-xs font-semibold text-slate-100 hover:text-white shadow-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-300" />
            <span>Create API Key</span>
          </button>
        </div>
      </div>

      <div className="mb-4 p-2.5 rounded-lg bg-gunmetal-card/80 border border-gunmetal-border text-[11px] text-gunmetal-muted flex items-start gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <span>
          All <code className="text-slate-300">/api/v1/*</code> endpoints require an active API key via{' '}
          <code className="text-slate-300">Authorization: Bearer &lt;key&gt;</code> or{' '}
          <code className="text-slate-300">X-API-Key</code>.
        </span>
      </div>

      {keys.length === 0 ? (
        <div className="py-10 px-4 text-center border-2 border-dashed border-gunmetal-border rounded-xl bg-gunmetal-canvas/30 space-y-2">
          <KeyRound className="w-7 h-7 text-gunmetal-muted mx-auto" />
          <p className="text-sm font-semibold text-slate-300">
            No API keys minted yet
          </p>
          <p className="text-xs text-gunmetal-muted">
            Create an API key to connect FlightSentry or another REST client.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gunmetal-border border border-gunmetal-border rounded-lg bg-gunmetal-card/90 overflow-hidden">
          {keys.map((item) => {
            const isRevoked = Boolean(item.revokedAt);
            const usage = item.usage ?? { last1h: 0, last24h: 0, total: 0 };

            return (
              <div
                key={item.id}
                className={`p-3 sm:px-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                  isRevoked ? 'opacity-70' : ''
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                      {item.name}
                    </span>
                    <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-gunmetal-canvas border border-gunmetal-border text-slate-300">
                      {item.keyPrefix}…
                    </code>
                    {isRevoked ? (
                      <span className="px-2 py-0.5 rounded border border-rose-800/60 bg-rose-950/60 text-rose-300 text-[10px] font-semibold uppercase">
                        Revoked
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded border border-emerald-800/60 bg-emerald-950/60 text-emerald-300 text-[10px] font-semibold uppercase">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gunmetal-muted">
                    <span>Created {formatDate(item.createdAt)}</span>
                    <span>Last used {formatDate(item.lastUsedAt)}</span>
                    <Tooltip
                      content={`Last 1h: ${usage.last1h} · Last 24h: ${usage.last24h} · All-time total: ${usage.total}`}
                      position="top"
                    >
                      <span className="inline-flex items-center gap-1.5 font-mono cursor-help text-slate-300">
                        <span>1h: {usage.last1h}</span>
                        <span>·</span>
                        <span>24h: {usage.last24h}</span>
                        <span>·</span>
                        <span className="font-semibold text-slate-100">
                          Total: {usage.total}
                        </span>
                      </span>
                    </Tooltip>
                  </div>
                </div>

                {!isRevoked ? (
                  <div className="self-end lg:self-center">
                    <button
                      type="button"
                      disabled={revokingId === item.id}
                      onClick={() => handleRevoke(item)}
                      className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/80 text-xs font-semibold text-rose-200 hover:text-white inline-flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>{revokingId === item.id ? 'Revoking...' : 'Revoke'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="self-end lg:self-center flex items-center gap-2">
                    {confirmDeleteId === item.id ? (
                      <>
                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={() => handleDeleteRevoked(item)}
                          className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/80 text-xs font-semibold text-rose-200 hover:text-white inline-flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>
                            {deletingId === item.id ? 'Deleting...' : 'Confirm Delete'}
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-xs font-semibold text-slate-300 hover:text-white transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md bg-gunmetal-canvas hover:bg-rose-950/60 border border-gunmetal-border hover:border-rose-700/80 text-xs font-semibold text-slate-300 hover:text-rose-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateApiKeyModal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        onCreated={onRefresh}
        onError={(msg) => onNotify(msg, 'error')}
      />
    </SettingsCard>
  );
}