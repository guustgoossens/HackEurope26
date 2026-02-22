import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState, useEffect } from 'react';
import { Plus, Building2, ChevronRight } from 'lucide-react';
import { useAuth as useAuthKit } from '@workos-inc/authkit-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

// Safe wrapper — returns empty user when WorkOS isn't mounted (dev bypass mode)
function useAuthSafe() {
  try {
    return useAuthKit();
  } catch {
    return { user: null };
  }
}

const phaseBadgeColors: Record<string, string> = {
  onboard: 'bg-slate-600 text-slate-200',
  explore: 'bg-blue-600/20 text-blue-300 border border-blue-500/30',
  structure: 'bg-purple-600/20 text-purple-300 border border-purple-500/30',
  verify: 'bg-amber-600/20 text-amber-300 border border-amber-500/30',
  use: 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30',
};

interface DashboardProps {
  onSelectClient: (id: string) => void;
  devBypassUser?: string;
}

export function Dashboard({ onSelectClient, devBypassUser }: DashboardProps) {
  const { t } = useTranslation();
  const { user } = useAuthSafe();
  const userId = devBypassUser ?? user?.id ?? '';
  const clients = useQuery(api.clients.list, userId ? { createdBy: userId } : 'skip');
  const createClient = useMutation(api.clients.create);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !industry.trim()) return;
    setCreating(true);
    try {
      await createClient({ name: name.trim(), industry: industry.trim(), createdBy: userId });
      setName('');
      setIndustry('');
      setShowForm(false);
    } finally {
      setCreating(false);
    }
  };

  // When there's exactly one client, go straight to it (demo page); otherwise show list
  useEffect(() => {
    if (clients && clients.length === 1) {
      onSelectClient(clients[0]._id);
    }
  }, [clients, onSelectClient]);

  if (clients === undefined) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 rounded w-48" style={{ background: 'hsl(var(--muted))' }} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 rounded-xl" style={{ background: 'hsl(var(--card))' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))', fontFamily: "'Newsreader', serif" }}>{t('dashboard.clients')}</h1>
          <p className="mt-1 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('dashboard.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-organic flex items-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'hsl(217 71% 30%)', boxShadow: '0 4px 12px hsl(217 71% 30% / 0.25)' }}
        >
          <Plus className="w-4 h-4" />
          {t('dashboard.newClient')}
        </button>
      </div>

      {/* Inline create form */}
      {showForm && (
        <div className="mb-6 p-5 card-organic border shadow-sm" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
          <h3 className="text-sm font-medium mb-4" style={{ color: 'hsl(var(--foreground))' }}>{t('dashboard.createTitle')}</h3>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder={t('dashboard.companyName')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-organic flex-1 px-3 py-2 border text-sm focus:outline-none focus:ring-1"
              style={{ background: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
              autoFocus
            />
            <input
              type="text"
              placeholder={t('dashboard.industry')}
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="input-organic flex-1 px-3 py-2 border text-sm focus:outline-none focus:ring-1"
              style={{ background: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreate();
              }}
            />
            <button
              onClick={() => void handleCreate()}
              disabled={creating || !name.trim() || !industry.trim()}
              className="btn-organic px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'hsl(217 71% 30%)' }}
            >
              {creating ? t('common.creating') : t('common.create')}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setName('');
                setIndustry('');
              }}
              className="px-4 py-2 transition-colors text-sm"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Client list */}
      {clients.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="w-12 h-12 mx-auto mb-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
          <h3 className="text-lg font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>{t('dashboard.noClients')}</h3>
          <p className="mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('dashboard.noClientsP')}</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-organic inline-flex items-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-medium"
            style={{ background: 'hsl(217 71% 30%)' }}
          >
            <Plus className="w-4 h-4" />
            {t('dashboard.createClient')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <button
              key={client._id}
              onClick={() => onSelectClient(client._id)}
              className="card-organic text-left p-5 border transition-all hover:-translate-y-1 shadow-sm hover:shadow-md group"
              style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 step-icon-organic flex items-center justify-center shrink-0" style={{ background: 'hsl(var(--primary) / 0.08)' }}>
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{client.name}</h3>
                    <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{client.industry}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 transition-colors opacity-0 group-hover:opacity-100 mt-1" style={{ color: 'hsl(var(--primary))' }} />
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={clsx(
                    'text-[10px] px-2.5 py-1 rounded-full font-medium capitalize',
                    phaseBadgeColors[client.phase] ?? phaseBadgeColors.onboard,
                  )}
                >
                  {t(`dashboard.phase_${client.phase}` as 'dashboard.phase_onboard')}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
