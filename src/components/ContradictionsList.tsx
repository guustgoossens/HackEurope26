import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { AlertTriangle, CheckCircle2, XCircle, ArrowRightLeft } from 'lucide-react';
import clsx from 'clsx';
import type { Id } from '../../convex/_generated/dataModel';

interface ContradictionsListProps {
  clientId: string;
}

const statusConfig = {
  open: { color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', icon: AlertTriangle },
  resolved: {
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    icon: CheckCircle2,
  },
  dismissed: { color: 'text-slate-400', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/20', icon: XCircle },
};

export function ContradictionsList({ clientId }: ContradictionsListProps) {
  const contradictions = useQuery(api.contradictions.listByClient, {
    clientId: clientId as Id<'clients'>,
  });
  const resolve = useMutation(api.contradictions.resolve);
  const dismiss = useMutation(api.contradictions.dismiss);

  if (contradictions === undefined) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Contradictions</h3>
        <div className="animate-pulse space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const openCount = contradictions.filter((c) => c.status === 'open').length;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-300">Contradictions</h3>
        {openCount > 0 && (
          <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
            {openCount} open
          </span>
        )}
      </div>

      {contradictions.length === 0 ? (
        <div className="text-center py-6">
          <ArrowRightLeft className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No contradictions found yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contradictions.map((c) => {
            const config = statusConfig[c.status];
            const Icon = config.icon;

            return (
              <div key={c._id} className={clsx('p-3 rounded-lg border', config.bgColor, config.borderColor)}>
                <div className="flex items-start gap-2.5">
                  <Icon className={clsx('w-4 h-4 mt-0.5 shrink-0', config.color)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white mb-1">{c.description}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-slate-500">Source A:</span>{' '}
                        <span className="text-slate-300">{c.sourceA}</span>
                        <span className="text-slate-500 ml-1">= </span>
                        <span className="text-blue-300">{c.valueA}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Source B:</span>{' '}
                        <span className="text-slate-300">{c.sourceB}</span>
                        <span className="text-slate-500 ml-1">= </span>
                        <span className="text-purple-300">{c.valueB}</span>
                      </div>
                    </div>
                    {c.resolution && <p className="text-xs text-emerald-400 mt-1">Resolution: {c.resolution}</p>}
                    {c.status === 'open' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => void resolve({ id: c._id, resolution: 'Manually resolved' })}
                          className="text-xs px-2 py-1 bg-emerald-600/20 text-emerald-400 rounded hover:bg-emerald-600/30 transition-colors"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => void dismiss({ id: c._id })}
                          className="text-xs px-2 py-1 bg-slate-600/20 text-slate-400 rounded hover:bg-slate-600/30 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
