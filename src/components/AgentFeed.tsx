import { useRef, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import {
    FolioBot as Bot,
    FolioCheckCircle2,
    FolioAlertTriangle,
    FolioChevronRight,
} from '@/components/icons/FolioIcons';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    complete: FolioCheckCircle2,
    warning: FolioAlertTriangle,
    error: FolioAlertTriangle,
    info: FolioChevronRight,
    progress: FolioChevronRight,
};

interface Props {
    clientId: string;
}

export default function AgentFeed({ clientId }: Props) {
    const { t } = useTranslation();
    const events = useQuery(api.agentEvents.listByClient, {
        clientId: clientId as Id<'clients'>,
    });

    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [events?.length]);

    const entries = [...(events ?? [])].reverse(); // newest at bottom

    return (
        <div
            className="h-full flex flex-col w-72 shrink-0"
            style={{
                background: 'linear-gradient(180deg, hsl(0 0% 100%), hsl(217 25% 97%))',
                borderLeft: '1px solid hsl(217 20% 91%)',
            }}
        >
            <div
                className="px-4 py-3 flex items-center gap-3"
                style={{
                    borderBottom: '1px solid hsl(217 20% 91%)',
                }}
            >
                <Bot className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium text-foreground" style={{ fontFamily: "'Newsreader', serif" }}>
                    {t('agentFeed.title')}
                </span>
            </div>
            <div className="flex-1 overflow-y-auto">
                <div className="p-3 space-y-1">
                    {entries.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-6 px-2">
                            {t('agentFeed.waiting')}
                        </p>
                    )}
                    {entries.map((entry) => {
                        const TypeIcon = typeIcons[entry.eventType] ?? FolioChevronRight;
                        return (
                            <div
                                key={entry._id}
                                className={cn('text-xs py-2 px-2.5 card-organic flex items-start gap-1.5 transition-all duration-300')}
                                style={{
                                    animation: 'fade-in 0.3s ease-out',
                                    background:
                                        entry.eventType === 'warning' || entry.eventType === 'error'
                                            ? 'hsl(38 80% 96%)'
                                            : entry.eventType === 'complete'
                                                ? 'hsl(152 40% 96%)'
                                                : 'transparent',
                                    color:
                                        entry.eventType === 'warning' || entry.eventType === 'error'
                                            ? 'hsl(38, 70%, 35%)'
                                            : entry.eventType === 'complete'
                                                ? 'hsl(152, 50%, 30%)'
                                                : 'hsl(220, 10%, 48%)',
                                }}
                            >
                                <TypeIcon className="h-6 w-6 mt-0.5 shrink-0 opacity-60" />
                                <div>
                                    <span className="font-medium opacity-60 mr-1">{entry.agentName}:</span>
                                    <span>{entry.message}</span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
}
