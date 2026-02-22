import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FolioBot as Bot,
  FolioCheckCircle2,
  FolioAlertTriangle,
  FolioChevronRight,
} from '@/components/icons/FolioIcons';
import { Radio } from 'lucide-react';
import clsx from 'clsx';
import type { Id } from '../../convex/_generated/dataModel';

const eventTypeConfig: Record<string, { color: string; bgColor: string; icon: any }> = {
  info: { color: 'text-blue-600', bgColor: 'bg-blue-50/50 border border-blue-100/50', icon: FolioChevronRight },
  progress: { color: 'text-emerald-600', bgColor: 'bg-emerald-50/50 border border-emerald-100/50', icon: FolioChevronRight },
  warning: { color: 'text-amber-600', bgColor: 'bg-amber-50/50 border border-amber-100/50', icon: FolioAlertTriangle },
  error: { color: 'text-red-600', bgColor: 'bg-red-50/50 border border-red-100/50', icon: FolioAlertTriangle },
  complete: { color: 'text-emerald-600', bgColor: 'bg-emerald-50/50 border border-emerald-100/50', icon: FolioCheckCircle2 },
};

interface AgentEventFeedProps {
  clientId: string;
}

export function AgentEventFeed({ clientId }: AgentEventFeedProps) {
  const { t } = useTranslation();
  const events = useQuery(api.agentEvents.listByClient, {
    clientId: clientId as Id<'clients'>,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  if (events === undefined) {
    return (
      <div className="card-organic p-4">
        <h3 className="text-sm font-medium text-foreground tracking-tight mb-3" style={{ fontFamily: "'Newsreader', serif" }}>{t('agentFeed.title')}</h3>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-slate-100 rounded border border-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-organic p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground tracking-tight" style={{ fontFamily: "'Newsreader', serif" }}>{t('agentFeed.title')}</h3>
        {events.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <Radio className="w-3 h-3 animate-pulse" />
            {t('agentFeed.live')}
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8">
          <Bot className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-600">No agent activity yet.</p>
          <p className="text-xs text-slate-500 mt-1">Start an exploration to see events.</p>
        </div>
      ) : (
        <div ref={scrollRef} className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          {events.map((event) => {
            const config = eventTypeConfig[event.eventType] ?? eventTypeConfig.info;
            const Icon = config.icon;
            const time = new Date(event._creationTime);
            const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            return (
              <div
                key={event._id}
                className={clsx('flex items-start gap-2.5 p-2.5 rounded-lg text-sm transition-all duration-300', config.bgColor)}
              >
                <Icon className={clsx('w-4 h-4 mt-0.5 shrink-0 opacity-80', config.color)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                      {event.agentName}
                    </span>
                    <span className="text-[10px] text-slate-500">{timeStr}</span>
                  </div>
                  <p className="text-slate-700 text-[11px] leading-relaxed mt-1">{event.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
