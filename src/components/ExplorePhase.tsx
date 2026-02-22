import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import {
    FolioMail as Mail,
    FolioHardDrive as HardDrive,
    FolioFileSpreadsheet as FileSpreadsheet,
    FolioFileText as FileText,
    FolioEye,
    FolioAlertTriangle as AlertTriangle,
} from '@/components/icons/FolioIcons';
import { cn } from '@/lib/utils';

const SOURCE_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    gmail: Mail,
    drive: HardDrive,
    sheets: FileSpreadsheet,
};

const SOURCE_COUNTS: Record<string, number> = {
    gmail: 847,
    drive: 203,
    sheets: 247,
};

const blobs = [
    'M50 4C72 3 96 14 98 38C100 62 84 96 54 98C24 100 4 78 2 52C0 26 28 5 50 4Z',
    'M52 2C78 1 97 18 99 42C101 66 80 98 50 99C20 100 1 74 2 48C3 22 26 3 52 2Z',
    'M48 3C74 2 98 16 97 44C96 72 78 99 48 98C18 97 2 72 3 46C4 20 22 4 48 3Z',
    'M54 5C76 4 95 20 97 46C99 72 82 97 52 98C22 99 3 76 2 50C1 24 32 6 54 5Z',
];

const FINDINGS = [
    { label: 'Fichiers PDF', count: 124 },
    { label: 'Feuilles Excel', count: 47 },
    { label: 'Emails', count: 847 },
    { label: 'Présentations', count: 23 },
];

const FLAGGED = [
    { label: 'Données manquantes', count: 12 },
    { label: 'Contradictions', count: 3 },
    { label: 'Doublons potentiels', count: 8 },
];

interface Props {
    clientId: string;
    animationStep: number;
}

export default function ExplorePhase({ clientId, animationStep }: Props) {
    const dataSources = useQuery(api.dataSources.listByClient, {
        clientId: clientId as Id<'clients'>,
    });

    const sources = dataSources ?? [];
    const connected = sources.filter((s) => s.connectionStatus === 'connected');

    const showBreakdown = animationStep >= 5;
    const totalItems = connected.reduce((sum, s) => sum + (SOURCE_COUNTS[s.type] ?? 50), 0) || 247;
    const maxCount = Math.max(...connected.map((s) => SOURCE_COUNTS[s.type] ?? 50), 1);

    return (
        <div className="h-full w-full flex flex-col items-center justify-center px-8 py-10 overflow-auto">
            <div className="max-w-3xl w-full space-y-8">
                {/* Source cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {sources.map((source, i) => {
                        const Icon = SOURCE_TYPE_ICONS[source.type] ?? FileText;
                        const count = SOURCE_COUNTS[source.type] ?? 50;
                        const visible = animationStep > i;
                        return (
                            <div
                                key={source._id}
                                className={cn('transition-all duration-500 group', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')}
                            >
                                <div
                                    className="rounded-2xl p-5 flex flex-col items-center text-center transition-all duration-300 group-hover:-translate-y-1"
                                    style={{
                                        background: 'linear-gradient(135deg, hsl(0 0% 100%), hsl(217 30% 97%))',
                                        border: '1px solid hsl(217 20% 91%)',
                                        boxShadow: '0 2px 8px hsl(217 30% 70% / 0.06)',
                                    }}
                                >
                                    <div className="relative w-12 h-12 mb-3">
                                        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
                                            <path d={blobs[i % blobs.length]} fill="hsl(217 60% 95%)" />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Icon className="h-10 w-10 text-primary" />
                                        </div>
                                    </div>
                                    <p className="text-sm font-medium text-foreground capitalize">{source.label}</p>
                                    <p className="text-2xl font-bold text-foreground mt-1" style={{ fontFamily: "'Newsreader', serif" }}>
                                        {visible ? count.toLocaleString('fr-FR') : '—'}
                                    </p>
                                    <span
                                        className={cn(
                                            'text-[10px] mt-1 px-2 py-0.5 rounded-full',
                                            source.connectionStatus === 'connected'
                                                ? 'text-emerald-600 bg-emerald-50'
                                                : 'text-amber-600 bg-amber-50',
                                        )}
                                    >
                                        {source.connectionStatus === 'connected' ? 'Connecté' : 'En attente'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Total counter */}
                <div className={cn('text-center transition-all duration-700', animationStep >= 4 ? 'opacity-100' : 'opacity-0')}>
                    <div className="text-5xl font-bold text-foreground tracking-tight" style={{ fontFamily: "'Newsreader', serif" }}>
                        {totalItems.toLocaleString('fr-FR')}
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">éléments analysés</p>
                </div>

                {/* Bar chart */}
                <div className={cn('max-w-sm mx-auto space-y-2.5 transition-all duration-500', showBreakdown ? 'opacity-100' : 'opacity-0')}>
                    {connected.map((source) => {
                        const count = SOURCE_COUNTS[source.type] ?? 50;
                        return (
                            <div key={source._id} className="flex items-center gap-3">
                                <span className="text-xs w-24 text-muted-foreground text-right capitalize truncate">{source.label}</span>
                                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'hsl(217 20% 94%)' }}>
                                    <div
                                        className="h-full rounded-full transition-all duration-1000 ease-out"
                                        style={{
                                            width: showBreakdown ? `${(count / maxCount) * 100}%` : '0%',
                                            background: 'linear-gradient(90deg, hsl(217 55% 70%), hsl(217 65% 55%))',
                                        }}
                                    />
                                </div>
                                <span className="text-xs font-medium w-12 text-foreground">{count}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Breakdown */}
                <div
                    className={cn(
                        'grid md:grid-cols-2 gap-4 transition-all duration-500 delay-300',
                        showBreakdown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
                    )}
                >
                    <div
                        className="rounded-2xl p-5"
                        style={{
                            background: 'linear-gradient(135deg, hsl(0 0% 100%), hsl(217 30% 97%))',
                            border: '1px solid hsl(217 20% 91%)',
                            boxShadow: '0 2px 8px hsl(217 30% 70% / 0.06)',
                        }}
                    >
                        <h3 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
                            <FolioEye className="h-8 w-8 text-primary" />
                            Éléments découverts
                        </h3>
                        <div className="space-y-2">
                            {FINDINGS.map((f, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{f.label}</span>
                                    <span className="font-medium text-foreground">{f.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div
                        className="rounded-2xl p-5"
                        style={{
                            background: 'linear-gradient(135deg, hsl(38 80% 98%), hsl(38 60% 95%))',
                            border: '1px solid hsl(38 40% 88%)',
                            boxShadow: '0 2px 8px hsl(38 30% 70% / 0.08)',
                        }}
                    >
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'hsl(38, 70%, 35%)' }}>
                            <AlertTriangle className="h-8 w-8" />
                            Éléments signalés
                        </h3>
                        <div className="space-y-2">
                            {FLAGGED.map((f, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <span style={{ color: 'hsl(38, 50%, 35%)' }}>{f.label}</span>
                                    <span className="font-medium" style={{ color: 'hsl(38, 60%, 25%)' }}>
                                        {f.count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
