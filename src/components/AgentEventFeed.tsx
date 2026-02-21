import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useEffect, useRef } from 'react';
import { Info, TrendingUp, AlertTriangle, XCircle, CheckCircle2, Radio } from 'lucide-react';
import clsx from 'clsx';
import type { Id } from '../../convex/_generated/dataModel';

const eventTypeConfig: Record<string, { color: string; bgColor: string; icon: typeof Info }> = {
  info: { color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: Info },
  progress: { color: 'text-green-400', bgColor: 'bg-green-500/10', icon: TrendingUp },
  warning: { color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: AlertTriangle },
  error: { color: 'text-red-400', bgColor: 'bg-red-500/10', icon: XCircle },
  complete: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: CheckCircle2 },
};

interface AgentEventFeedProps {
  clientId: string;
}

export function AgentEventFeed({ clientId }: AgentEventFeedProps) {
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
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Agent Activity</h3>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-300">Agent Activity</h3>
        {events.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Radio className="w-3 h-3 animate-pulse" />
            Live
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8">
          <Radio className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No agent activity yet.</p>
          <p className="text-xs text-slate-600 mt-1">Start an exploration to see events.</p>
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
                className={clsx('flex items-start gap-2.5 p-2.5 rounded-lg text-sm', config.bgColor)}
              >
                <Icon className={clsx('w-4 h-4 mt-0.5 shrink-0', config.color)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-slate-300 bg-slate-700 px-1.5 py-0.5 rounded">
                      {event.agentName}
                    </span>
                    <span className="text-xs text-slate-500">{timeStr}</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">{event.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
