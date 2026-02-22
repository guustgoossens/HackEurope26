import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTranslation } from 'react-i18next';
import { Activity, Clock } from 'lucide-react';
import { FolioBot as Bot } from '@/components/icons/FolioIcons';
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
          <div key={i} className="card-organic p-4 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-24 mb-3" />
            <div className="h-8 bg-slate-200 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (pipeline === null) {
    return (
      <div className="card-organic p-6 flex flex-col items-center justify-center text-center">
        <Activity className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-slate-700 tracking-tight mb-1" style={{ fontFamily: "'Newsreader', serif" }}>{t('metrics.readyToExplore')}</h3>
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
      <div className="card-organic p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground tracking-tight" style={{ fontFamily: "'Newsreader', serif" }}>{t('metrics.phaseProgress')}</h3>
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-2xl font-bold text-slate-800" style={{ fontFamily: "'Newsreader', serif" }}>{Math.round(pipeline.phaseProgress)}%</span>
          <span className="text-xs text-slate-500 mb-1 capitalize">{pipeline.currentPhase}</span>
        </div>
        <div className="w-full bg-slate-100 border border-slate-200 rounded-full h-2">
          <div
            className={clsx('h-full rounded-full transition-all duration-500', 'bg-primary')}
            style={{ width: `${pipeline.phaseProgress}%`, background: 'linear-gradient(90deg, hsl(217 65% 52%), hsl(217 75% 43%))' }}
          />
        </div>
      </div>

      {/* Active agents */}
      <div className="card-organic p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-medium text-foreground tracking-tight" style={{ fontFamily: "'Newsreader', serif" }}>{t('metrics.activeAgents')}</h3>
        </div>
        {pipeline.activeAgents.length === 0 ? (
          <p className="text-xs text-slate-500">{t('metrics.noAgentsActive')}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {pipeline.activeAgents.map((agent) => (
              <span
                key={agent}
                className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-1 rounded-full font-medium"
              >
                {agent}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Last activity */}
      <div className="card-organic p-4 flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-medium text-foreground tracking-tight" style={{ fontFamily: "'Newsreader', serif" }}>{t('metrics.lastActivity')}</h3>
        </div>
        <span className="text-sm font-medium text-slate-700">{lastActivityStr}</span>
      </div>
    </div>
  );
}
