import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

export interface LiveExploreData {
    explorations?: Array<{
        dataSourceId: Id<'data_sources'>;
        metrics: Record<string, unknown>;
        status: 'running' | 'completed' | 'failed';
    }> | null;
    agentEvents?: Array<{
        message: string;
        agentName: string;
        _creationTime: number;
    }> | null;
}
import {
    FolioMail as Mail,
    FolioHardDrive as HardDrive,
    FolioFileSpreadsheet as FileSpreadsheet,
    FolioFileText as FileText,
    FolioEye,
    FolioAlertTriangle as AlertTriangle,
    FolioCheckCircle2 as CheckCircle2,
    FolioZap,
    FolioArrowRight as ArrowRight,
} from '@/components/icons/FolioIcons';
import { useComposioConnect } from '@/hooks/useComposioConnect';
import { useCountUp } from '@/hooks/useCountUp';
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

const SCAN_LOG = [
    { icon: '📄', name: 'vat_return_Q2_2024_draft.pdf', path: 'Finance / TVA' },
    { icon: '📊', name: 'cashflow_forecast_v3_FINAL.xlsx', path: 'Finance / Trésorerie' },
    { icon: '📧', name: 'Re: Contrôle fiscal 2024 — HMRC', path: 'Gmail / Inbox' },
    { icon: '📄', name: 'HMRC_response_draft.docx', path: 'Drive / Compliance' },
    { icon: '📊', name: 'payroll_march_2024.xlsx', path: 'Sheets / Paie' },
    { icon: '📧', name: 'Fw: Invoice Acme Ltd Q1', path: 'Gmail / Clients' },
    { icon: '📄', name: 'vat_Q2_2024_AMENDED.pdf', path: 'Finance (Old) / VAT Returns' },
    { icon: '📊', name: 'expenses_march_2024.pdf', path: 'Drive / Comptabilité' },
    { icon: '📧', name: 'Pennylane export — Avril 2024', path: 'Gmail / Exports' },
    { icon: '📄', name: 'invoice_acme_march.pdf', path: 'Drive / Misc' },
];

const FINDINGS = [
    { label: 'Fichiers PDF', count: 124 },
    { label: 'Feuilles Excel', count: 47 },
    { label: 'Emails', count: 847 },
    { label: 'Présentations', count: 23 },
];

const FLAGGED = [
    { label: 'Données manquantes', count: 12 },
    { label: 'Contradictions', count: 7 },
    { label: 'Doublons potentiels', count: 8 },
];

const STEPS = [
    { id: 1, label: 'Connexion', desc: "Accès sécurisé aux sources" },
    { id: 2, label: 'Exploration', desc: 'Cartographie des données' },
    { id: 3, label: 'Bilan', desc: "Vue d'ensemble" },
];

interface Props {
    clientId: string;
    animationStep?: number;
    onNextPhase?: () => void;
    liveData?: LiveExploreData;
}

export default function ExplorePhase({ clientId, animationStep, onNextPhase, liveData }: Props) {
    const dataSources = useQuery(api.dataSources.listByClient, {
        clientId: clientId as Id<'clients'>,
    });
    const [connectError, setConnectError] = useState<string | null>(null);
    const { connect, connecting } = useComposioConnect({
        clientId: clientId as Id<'clients'>,
        onError: (err) => setConnectError(err),
        onSuccess: () => setConnectError(null),
    });

    // Derive effective animation step from live data when provided
    const effectiveAnimStep = (() => {
        if (!liveData) return animationStep ?? 0;
        const exps = liveData.explorations ?? [];
        if (exps.some(e => e.status === 'running')) return 3;
        if (exps.length > 0 && exps.every(e => e.status !== 'running')) return 5;
        return 1;
    })();

    // Build exploration lookup by dataSourceId for live count overrides
    const explorationBySourceId: Map<string, NonNullable<LiveExploreData['explorations']>[0]> | null = liveData?.explorations
        ? new Map(liveData.explorations.map(e => [e.dataSourceId as string, e]))
        : null;

    const getSourceCount = (source: { _id: Id<'data_sources'>; type: string }): number => {
        if (explorationBySourceId) {
            const exp = explorationBySourceId.get(source._id);
            if (exp) {
                const m = exp.metrics as Record<string, unknown>;
                const val = (m.email_count ?? m.file_count ?? m.total_items) as number | undefined;
                return val ?? SOURCE_COUNTS[source.type] ?? 50;
            }
        }
        return SOURCE_COUNTS[source.type] ?? 50;
    };

    const sources = dataSources ?? [];
    const currentStep = effectiveAnimStep < 2 ? 1 : effectiveAnimStep < 4 ? 2 : 3;

    const liveTotal = liveData?.explorations?.reduce((sum, exp) => {
        const m = exp.metrics as Record<string, unknown>;
        return sum + ((m.email_count ?? m.file_count ?? m.total_items ?? 0) as number);
    }, 0) ?? 0;
    const totalItems = liveTotal > 0 ? liveTotal : sources.reduce((sum, s) => sum + getSourceCount(s), 0) || 1297;
    const animatedTotal = useCountUp(totalItems, 1800, currentStep === 3);
    const maxCount = Math.max(...sources.map((s) => getSourceCount(s)), 1);

    // Scan log: use live agent events when available
    const effectiveScanLog = liveData?.agentEvents
        ? liveData.agentEvents.slice(0, 10).map(e => ({ icon: '📧', name: e.message, path: e.agentName }))
        : SCAN_LOG;

    // Findings: aggregate from live metrics when available
    const effectiveFindings = (() => {
        if (!liveData?.explorations || liveData.explorations.length === 0) return FINDINGS;
        const totals: Record<string, number> = {};
        for (const exp of liveData.explorations) {
            for (const [k, v] of Object.entries(exp.metrics)) {
                if (typeof v === 'number') totals[k] = (totals[k] ?? 0) + v;
            }
        }
        const found: Array<{ label: string; count: number }> = [
            totals.email_count ? { label: 'Emails', count: totals.email_count } : null,
            totals.file_count ? { label: 'Fichiers', count: totals.file_count } : null,
            totals.total_items ? { label: 'Éléments totaux', count: totals.total_items } : null,
        ].filter(Boolean) as Array<{ label: string; count: number }>;
        return found.length > 0 ? found : FINDINGS;
    })();

    // Rich metrics: data categories aggregated across explorations
    const liveCategories = (() => {
        if (!liveData?.explorations) return null;
        const catMap = new Map<string, { count: number; samples: string[] }>();
        for (const exp of liveData.explorations) {
            const cats = exp.metrics.data_categories;
            if (!Array.isArray(cats)) continue;
            for (const c of cats as Array<{ category: string; count: number; sample_names?: string[] }>) {
                const existing = catMap.get(c.category);
                if (existing) {
                    existing.count += c.count ?? 0;
                    if (c.sample_names) existing.samples.push(...c.sample_names);
                } else {
                    catMap.set(c.category, { count: c.count ?? 0, samples: c.sample_names?.slice(0, 3) ?? [] });
                }
            }
        }
        if (catMap.size === 0) return null;
        return [...catMap.entries()]
            .sort((a, b) => b[1].count - a[1].count)
            .map(([category, { count, samples }]) => ({ category, count, samples: samples.slice(0, 3) }));
    })();

    // Rich metrics: key entities
    const liveEntities = (() => {
        if (!liveData?.explorations) return null;
        const entityMap = new Map<string, { type: string; mentions: number }>();
        for (const exp of liveData.explorations) {
            const ents = exp.metrics.key_entities;
            if (!Array.isArray(ents)) continue;
            for (const e of ents as Array<{ name: string; type: string; mention_count?: number }>) {
                const existing = entityMap.get(e.name);
                if (existing) {
                    existing.mentions += e.mention_count ?? 1;
                } else {
                    entityMap.set(e.name, { type: e.type, mentions: e.mention_count ?? 1 });
                }
            }
        }
        if (entityMap.size === 0) return null;
        return [...entityMap.entries()]
            .sort((a, b) => b[1].mentions - a[1].mentions)
            .slice(0, 12)
            .map(([name, { type, mentions }]) => ({ name, type, mentions }));
    })();

    // Rich metrics: date range
    const liveDateRange = (() => {
        if (!liveData?.explorations) return null;
        let earliest: string | null = null;
        let latest: string | null = null;
        for (const exp of liveData.explorations) {
            const dr = exp.metrics.date_range as { earliest?: string; latest?: string } | undefined;
            if (!dr) continue;
            if (dr.earliest && (!earliest || dr.earliest < earliest)) earliest = dr.earliest;
            if (dr.latest && (!latest || dr.latest > latest)) latest = dr.latest;
        }
        return earliest && latest ? { earliest, latest } : null;
    })();

    // Rich metrics: languages
    const liveLanguages = (() => {
        if (!liveData?.explorations) return null;
        const langs = new Set<string>();
        for (const exp of liveData.explorations) {
            const l = exp.metrics.languages;
            if (Array.isArray(l)) l.forEach((lang) => { if (typeof lang === 'string') langs.add(lang); });
        }
        return langs.size > 0 ? [...langs] : null;
    })();

    // Rich metrics: quality flags
    const liveQualityFlags = (() => {
        if (!liveData?.explorations) return null;
        const flagMap = new Map<string, { count: number; description: string }>();
        for (const exp of liveData.explorations) {
            const flags = exp.metrics.quality_flags;
            if (!Array.isArray(flags)) continue;
            for (const f of flags as Array<{ flag: string; count?: number; description: string }>) {
                const existing = flagMap.get(f.flag);
                if (existing) {
                    existing.count += f.count ?? 1;
                } else {
                    flagMap.set(f.flag, { count: f.count ?? 1, description: f.description });
                }
            }
        }
        if (flagMap.size === 0) return null;
        return [...flagMap.entries()].map(([flag, { count, description }]) => ({ flag, count, description }));
    })();

    return (
        <div className="h-full w-full flex overflow-hidden">
            {/* Left: Vertical stepper */}
            <div
                className="w-52 shrink-0 flex flex-col justify-center px-7 py-10"
                style={{ borderRight: '1px solid hsl(217 20% 91%)' }}
            >
                {STEPS.map((step, i) => {
                    const isDone = currentStep > step.id;
                    const isActive = currentStep === step.id;
                    return (
                        <div key={step.id} className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                                <div
                                    className={cn(
                                        'w-7 h-7 step-dot-organic flex items-center justify-center text-xs font-semibold shrink-0 transition-all duration-500',
                                        isDone ? 'bg-primary text-primary-foreground' : 'text-muted-foreground/40',
                                    )}
                                    style={
                                        isActive
                                            ? {
                                                background: 'linear-gradient(135deg, hsl(217 60% 95%), hsl(217 50% 92%))',
                                                border: '1.5px solid hsl(217 50% 75%)',
                                                color: 'hsl(217 60% 45%)',
                                                boxShadow: '0 0 0 4px hsl(217 60% 92% / 0.5)',
                                            }
                                            : isDone
                                                ? {}
                                                : { border: '1.5px solid hsl(217 20% 85%)' }
                                    }
                                >
                                    {isDone ? <CheckCircle2 className="h-5 w-5" /> : step.id}
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div
                                        className="w-px transition-all duration-700 my-1.5"
                                        style={{
                                            height: '40px',
                                            background: isDone ? 'hsl(217 50% 70%)' : 'hsl(217 20% 88%)',
                                        }}
                                    />
                                )}
                            </div>
                            <div className="pt-0.5 pb-1 min-w-0">
                                <p
                                    className={cn(
                                        'text-sm font-medium transition-colors duration-300',
                                        isActive ? 'text-foreground' : isDone ? 'text-foreground/70' : 'text-muted-foreground/40',
                                    )}
                                >
                                    {step.label}
                                </p>
                                <p className={cn('text-xs transition-colors duration-300', isActive || isDone ? 'text-muted-foreground' : 'text-muted-foreground/30')}>
                                    {step.desc}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Right: Step content */}
            <div className="flex-1 overflow-auto flex items-center justify-center px-10 py-10">

                {/* ── Step 1: Connection ── */}
                {currentStep === 1 && (
                    <div className="max-w-xl w-full space-y-6" style={{ animation: 'fade-in 0.4s ease-out' }}>
                        <div>
                            <h2 className="text-xl font-semibold text-foreground mb-1" style={{ fontFamily: "'Newsreader', serif" }}>
                                Connexion des sources
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Folio accède à vos outils existants sans migration. Vos données restent chez vous.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {sources.map((source, i) => {
                                const Icon = SOURCE_TYPE_ICONS[source.type] ?? FileText;
                                const count = getSourceCount(source);
                                const visible = effectiveAnimStep > i;
                                const isConnected = source.connectionStatus === 'connected';
                                const isConnecting = connecting === source.type;

                                return (
                                    <div
                                        key={source._id}
                                        className={cn('transition-all duration-500', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')}
                                    >
                                        <div
                                            className="card-organic-elevated p-4 flex flex-col gap-3 h-full"
                                            style={{
                                                background: 'linear-gradient(135deg, hsl(0 0% 100%), hsl(217 30% 97%))',
                                                border: isConnected ? '1px solid hsl(152 40% 78%)' : '1px solid hsl(217 20% 91%)',
                                                boxShadow: '0 2px 8px hsl(217 30% 70% / 0.06)',
                                            }}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 step-icon-organic flex items-center justify-center shrink-0" style={{ background: 'hsl(217 60% 95%)' }}>
                                                    <Icon className="h-5 w-5 text-primary" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-foreground capitalize truncate">{source.label}</p>
                                                    <p className="text-xs text-muted-foreground">{count.toLocaleString('fr-FR')} éléments</p>
                                                </div>
                                            </div>

                                            {isConnected ? (
                                                <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-2.5 py-1.5">
                                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                                    <span>Connecté</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => void connect(source.type)}
                                                    disabled={isConnecting}
                                                    className={cn(
                                                        'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all duration-200 w-full justify-center font-medium',
                                                        isConnecting ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-0.5',
                                                    )}
                                                    style={{
                                                        background: 'linear-gradient(135deg, hsl(217 55% 96%), hsl(217 45% 93%))',
                                                        border: '1px solid hsl(217 35% 85%)',
                                                        color: 'hsl(217 60% 45%)',
                                                    }}
                                                >
                                                    {isConnecting ? (
                                                        <>
                                                            <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                                                            Connexion…
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FolioZap className="h-4 w-4" />
                                                            Connecter via Composio
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {connectError && (
                            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                                {connectError}
                            </p>
                        )}

                        <p className="text-xs text-muted-foreground/50 text-center">
                            Connexion OAuth · Lecture seule · Aucune donnée modifiée
                        </p>
                    </div>
                )}

                {/* ── Step 2: Exploration ── */}
                {currentStep === 2 && (
                    <div className="max-w-xl w-full space-y-5" style={{ animation: 'fade-in 0.4s ease-out' }}>
                        <div>
                            <h2 className="text-xl font-semibold text-foreground mb-1" style={{ fontFamily: "'Newsreader', serif" }}>
                                Exploration en cours
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                L'agent cartographie vos données sans en modifier une seule ligne.
                            </p>
                        </div>

                        {/* Progress per source */}
                        <div className="space-y-3">
                            {sources.map((source) => {
                                const count = getSourceCount(source);
                                const pct = Math.round((count / maxCount) * 100);
                                const active = effectiveAnimStep >= 3;
                                return (
                                    <div key={source._id} className="flex items-center gap-3">
                                        <span className="text-xs w-28 text-muted-foreground capitalize truncate">{source.label}</span>
                                        <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'hsl(217 20% 93%)' }}>
                                            <div
                                                style={{
                                                    height: '100%',
                                                    borderRadius: '9999px',
                                                    width: active ? `${pct}%` : '0%',
                                                    transition: 'width 1.3s ease-out',
                                                    background: 'linear-gradient(90deg, hsl(217 55% 72%), hsl(217 70% 52%))',
                                                    backgroundSize: '200% 100%',
                                                    animation: active ? 'shimmer 2s linear infinite' : 'none',
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs font-medium w-10 text-right tabular-nums" style={{ color: 'hsl(217 20% 55%)' }}>{count.toLocaleString('fr-FR')}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Scan log */}
                        <div
                            className="card-organic overflow-hidden"
                            style={{
                                background: 'linear-gradient(135deg, hsl(0 0% 100%), hsl(217 30% 97%))',
                                border: '1px solid hsl(217 20% 91%)',
                            }}
                        >
                            <div
                                className="px-4 py-2.5 flex items-center gap-2 text-xs font-medium"
                                style={{ borderBottom: '1px solid hsl(217 20% 93%)', color: 'hsl(217 50% 48%)' }}
                            >
                                <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{
                                        background: 'hsl(217 65% 55%)',
                                        boxShadow: '0 0 0 3px hsl(217 60% 90%)',
                                        animation: 'pulse 1.5s ease-in-out infinite',
                                    }}
                                />
                                Découverte de fichiers…
                            </div>
                            <div className="divide-y" style={{ borderColor: 'hsl(217 20% 95%)' }}>
                                {effectiveScanLog.slice(0, effectiveAnimStep >= 3 ? effectiveScanLog.length : 4).map((item, i) => (
                                    <div
                                        key={i}
                                        className="px-4 py-2 flex items-center justify-between"
                                        style={{ animation: `fade-in 0.3s ease-out ${i * 70}ms both` }}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-sm shrink-0">{item.icon}</span>
                                            <span className="text-xs text-foreground/80 truncate">{item.name}</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground shrink-0 ml-3">{item.path}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Step 3: Bilan ── */}
                {currentStep === 3 && (
                    <div className="max-w-xl w-full space-y-6" style={{ animation: 'fade-in 0.4s ease-out' }}>
                        <div>
                            <h2 className="text-xl font-semibold text-foreground mb-1" style={{ fontFamily: "'Newsreader', serif" }}>
                                Bilan de l'exploration
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Base de départ identifiée. L'agent peut maintenant construire la structure.
                            </p>
                        </div>

                        {/* Big number — count-up animation */}
                        <div className="text-center py-2">
                            <div className="text-6xl font-bold text-foreground tracking-tight" style={{ fontFamily: "'Newsreader', serif" }}>
                                {animatedTotal.toLocaleString('fr-FR')}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">éléments analysés</p>
                            {liveDateRange && (
                                <p className="text-xs text-muted-foreground/70 mt-0.5">
                                    {liveDateRange.earliest} — {liveDateRange.latest}
                                </p>
                            )}
                            {liveLanguages && (
                                <div className="flex items-center justify-center gap-1.5 mt-2">
                                    {liveLanguages.map((lang) => (
                                        <span
                                            key={lang}
                                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                                            style={{
                                                background: 'hsl(217 55% 94%)',
                                                color: 'hsl(217 55% 42%)',
                                                border: '1px solid hsl(217 40% 88%)',
                                            }}
                                        >
                                            {lang.toUpperCase()}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Category breakdown (horizontal bars) — from live data or fallback */}
                        {liveCategories ? (
                            <div
                                className="card-organic-elevated p-5"
                                style={{
                                    background: 'linear-gradient(135deg, hsl(0 0% 100%), hsl(217 30% 97%))',
                                    border: '1px solid hsl(217 20% 91%)',
                                    boxShadow: '0 2px 8px hsl(217 30% 70% / 0.06)',
                                }}
                            >
                                <h3 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
                                    <FolioEye className="h-6 w-6 text-primary" />
                                    Catégories de données
                                </h3>
                                <div className="space-y-2.5">
                                    {liveCategories.map((cat, i) => {
                                        const maxCat = liveCategories[0]?.count || 1;
                                        const pct = Math.round((cat.count / maxCat) * 100);
                                        return (
                                            <div key={i}>
                                                <div className="flex items-center justify-between text-sm mb-1">
                                                    <span className="text-muted-foreground">{cat.category}</span>
                                                    <span className="font-medium text-foreground tabular-nums">{cat.count}</span>
                                                </div>
                                                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'hsl(217 20% 93%)' }}>
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            width: `${pct}%`,
                                                            background: 'linear-gradient(90deg, hsl(217 55% 72%), hsl(217 70% 52%))',
                                                            transition: 'width 0.8s ease-out',
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div
                                className="card-organic-elevated p-5"
                                style={{
                                    background: 'linear-gradient(135deg, hsl(0 0% 100%), hsl(217 30% 97%))',
                                    border: '1px solid hsl(217 20% 91%)',
                                    boxShadow: '0 2px 8px hsl(217 30% 70% / 0.06)',
                                }}
                            >
                                <h3 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
                                    <FolioEye className="h-6 w-6 text-primary" />
                                    Éléments découverts
                                </h3>
                                <div className="space-y-2">
                                    {effectiveFindings.map((f, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">{f.label}</span>
                                            <span className="font-medium text-foreground">{f.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Key entities + Quality flags row */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            {/* Key entities */}
                            {liveEntities ? (
                                <div
                                    className="card-organic-elevated p-5"
                                    style={{
                                        background: 'linear-gradient(135deg, hsl(0 0% 100%), hsl(262 30% 97%))',
                                        border: '1px solid hsl(262 20% 91%)',
                                        boxShadow: '0 2px 8px hsl(262 30% 70% / 0.06)',
                                    }}
                                >
                                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'hsl(262 50% 45%)' }}>
                                        Entités clés
                                    </h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {liveEntities.map((ent, i) => {
                                            const typeStyles: Record<string, { bg: string; color: string; border: string }> = {
                                                company: { bg: 'hsl(217 55% 95%)', color: 'hsl(217 55% 40%)', border: 'hsl(217 40% 88%)' },
                                                person: { bg: 'hsl(152 40% 94%)', color: 'hsl(152 40% 32%)', border: 'hsl(152 30% 85%)' },
                                                product: { bg: 'hsl(38 60% 94%)', color: 'hsl(38 60% 32%)', border: 'hsl(38 40% 85%)' },
                                            };
                                            const s = typeStyles[ent.type] ?? typeStyles.company;
                                            return (
                                                <span
                                                    key={i}
                                                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                                                    style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                                                    title={`${ent.type} · ${ent.mentions} mention${ent.mentions > 1 ? 's' : ''}`}
                                                >
                                                    {ent.name}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="card-organic-elevated p-5"
                                    style={{
                                        background: 'linear-gradient(135deg, hsl(0 0% 100%), hsl(217 30% 97%))',
                                        border: '1px solid hsl(217 20% 91%)',
                                        boxShadow: '0 2px 8px hsl(217 30% 70% / 0.06)',
                                    }}
                                >
                                    <h3 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
                                        <FolioEye className="h-6 w-6 text-primary" />
                                        Éléments découverts
                                    </h3>
                                    <div className="space-y-2">
                                        {effectiveFindings.map((f, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">{f.label}</span>
                                                <span className="font-medium text-foreground">{f.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quality flags */}
                            <div
                                className="card-organic-elevated p-5"
                                style={{
                                    background: 'linear-gradient(135deg, hsl(38 80% 98%), hsl(38 60% 95%))',
                                    border: '1px solid hsl(38 40% 88%)',
                                    boxShadow: '0 2px 8px hsl(38 30% 70% / 0.08)',
                                }}
                            >
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'hsl(38, 70%, 35%)' }}>
                                    <AlertTriangle className="h-6 w-6" />
                                    Signalés par l'agent
                                </h3>
                                <div className="space-y-2">
                                    {(liveQualityFlags ?? FLAGGED).map((f, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm">
                                            <span style={{ color: 'hsl(38, 50%, 35%)' }}>
                                                {'flag' in f ? f.description : (f as { label: string }).label}
                                            </span>
                                            <span className="font-medium" style={{ color: 'hsl(38, 60%, 25%)' }}>{f.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                        {onNextPhase && (
                            <div className="flex justify-center pt-1">
                                <button
                                    onClick={onNextPhase}
                                    className="flex items-center gap-2 px-6 py-3 btn-organic-pill text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
                                    style={{
                                        background: 'hsl(217 71% 30%)',
                                        color: 'hsl(0 0% 100%)',
                                        boxShadow: '0 4px 12px hsl(217 71% 30% / 0.25)',
                                    }}
                                >
                                    Passer à la structuration
                                    <ArrowRight className="h-5 w-5" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
