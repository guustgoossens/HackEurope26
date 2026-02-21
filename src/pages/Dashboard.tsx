import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState } from 'react';
import { Plus, Building2, ChevronRight } from 'lucide-react';
import { useAuth as useAuthKit } from '@workos-inc/authkit-react';
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

  if (clients === undefined) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 bg-slate-800 rounded-xl" />
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
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-slate-400 mt-1">Manage your company data connections</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Client
        </button>
      </div>

      {/* Inline create form */}
      {showForm && (
        <div className="mb-6 p-5 bg-slate-800 border border-slate-700 rounded-xl">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Create a new client</h3>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Company name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <input
              type="text"
              placeholder="Industry (e.g., SaaS, Retail)"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreate();
              }}
            />
            <button
              onClick={() => void handleCreate()}
              disabled={creating || !name.trim() || !industry.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setName('');
                setIndustry('');
              }}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Client list */}
      {clients.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">No clients yet</h3>
          <p className="text-slate-500 mb-6">Create your first client to start making their data AI-ready.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <button
              key={client._id}
              onClick={() => onSelectClient(client._id)}
              className="text-left p-5 bg-slate-800 border border-slate-700 rounded-xl hover:border-slate-600 hover:bg-slate-800/80 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{client.name}</h3>
                    <p className="text-xs text-slate-400">{client.industry}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors mt-1" />
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={clsx(
                    'text-xs px-2.5 py-1 rounded-full font-medium capitalize',
                    phaseBadgeColors[client.phase] ?? phaseBadgeColors.onboard,
                  )}
                >
                  {client.phase}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
