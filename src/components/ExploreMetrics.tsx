import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTranslation } from 'react-i18next';
import { Activity, Bot, Clock } from 'lucide-react';
import clsx from 'clsx';
import type { Id } from '../../convex/_generated/dataModel';

interface ExploreMetricsProps {
  clientId: string;
}

export function ExploreMetrics({ clientId }: ExploreMetricsProps) {
  const { t } = useTranslation();
  const pipeline = useQuery(api.pipeline.getByClient, {
    clientId: clientId as Id<'clients'>,
  });

  if (pipeline === undefined) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-24 mb-3" />
            <div className="h-8 bg-slate-700 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (pipeline === null) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
        <Activity className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-slate-300 mb-1">{t('metrics.readyToExplore')}</h3>
        <p className="text-xs text-slate-500">{t('metrics.readyToExploreP')}</p>
      </div>
    );
  }

  const lastActivityStr = pipeline.lastActivity
    ? new Date(pipeline.lastActivity).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Phase progress */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-medium text-slate-300">{t('metrics.phaseProgress')}</h3>
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-2xl font-bold text-white">{Math.round(pipeline.phaseProgress)}%</span>
          <span className="text-xs text-slate-400 mb-1 capitalize">{pipeline.currentPhase}</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className={clsx('h-2 rounded-full transition-all duration-500', 'bg-blue-500')}
            style={{ width: `${pipeline.phaseProgress}%` }}
          />
        </div>
      </div>

      {/* Active agents */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-medium text-slate-300">{t('metrics.activeAgents')}</h3>
        </div>
        {pipeline.activeAgents.length === 0 ? (
          <p className="text-xs text-slate-500">{t('metrics.noAgentsActive')}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {pipeline.activeAgents.map((agent) => (
              <span
                key={agent}
                className="text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-1 rounded-full"
              >
                {agent}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Last activity */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-medium text-slate-300">{t('metrics.lastActivity')}</h3>
        </div>
        <span className="text-sm text-white">{lastActivityStr}</span>
      </div>
    </div>
  );
}
