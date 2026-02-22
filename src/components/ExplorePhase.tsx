import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
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


interface Props {
    clientId: string;
    animationStep: number;
    onNextPhase?: () => void;
}

export default function ExplorePhase({ clientId, animationStep, onNextPhase }: Props) {
    const { t, i18n } = useTranslation();
    const dataSources = useQuery(api.dataSources.listByClient, {
        clientId: clientId as Id<'clients'>,
    });
    const [connectError, setConnectError] = useState<string | null>(null);

    const STEPS = useMemo(() => [
        { id: 1, label: t('explore.step1Label'), desc: t('explore.step1Desc') },
        { id: 2, label: t('explore.step2Label'), desc: t('explore.step2Desc') },
        { id: 3, label: t('explore.step3Label'), desc: t('explore.step3Desc') },
    ], [t]);

    const FINDINGS = useMemo(() => [
        { label: t('explore.findingPDF'), count: 124 },
        { label: t('explore.findingExcel'), count: 47 },
        { label: t('explore.findingEmails'), count: 847 },
        { label: t('explore.findingPresentations'), count: 23 },
    ], [t]);

    const FLAGGED = useMemo(() => [
        { label: t('explore.flaggedMissing'), count: 12 },
        { label: t('explore.flaggedContradictions'), count: 7 },
        { label: t('explore.flaggedDuplicates'), count: 8 },
    ], [t]);
    const { connect, connecting } = useComposioConnect({
        clientId: clientId as Id<'clients'>,
        onError: (err) => setConnectError(err),
        onSuccess: () => setConnectError(null),
    });

    const sources = dataSources ?? [];
    const currentStep = animationStep < 2 ? 1 : animationStep < 4 ? 2 : 3;
    const totalItems = sources.reduce((sum, s) => sum + (SOURCE_COUNTS[s.type] ?? 50), 0) || 1297;
    const animatedTotal = useCountUp(totalItems, 1800, currentStep === 3);
    const maxCount = Math.max(...sources.map((s) => SOURCE_COUNTS[s.type] ?? 50), 1);

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
                                        'w-8 h-8 step-dot-organic flex items-center justify-center text-xs font-semibold shrink-0 transition-all duration-500',
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
                                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : step.id}
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div
                                        className="w-px transition-all duration-700 my-1.5"
                                        style={{
                                            height: '40px',
                                            background: isDone ? 'linear-gradient(180deg, hsl(217 50% 72%), hsl(217 45% 85%))' : 'linear-gradient(180deg, hsl(217 22% 88%), hsl(217 20% 92%))',
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
                                {t('explore.step1Title')}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {t('explore.step1Sub')}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {sources.map((source, i) => {
                                const Icon = SOURCE_TYPE_ICONS[source.type] ?? FileText;
                                const count = SOURCE_COUNTS[source.type] ?? 50;
                                const visible = animationStep > i;
                                const isConnected = source.connectionStatus === 'connected';
                                const isConnecting = connecting === source.type;

                                return (
                                    <div
                                        key={source._id}
                                        className={cn('transition-all duration-500', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')}
                                    >
                                        <div
                                            className="card-organic p-4 flex flex-col gap-3 h-full"
                                            style={{
                                                background: 'linear-gradient(135deg, hsl(0 0% 100%), hsl(217 30% 97%))',
                                                border: isConnected ? '1px solid hsl(152 40% 78%)' : '1px solid hsl(217 20% 91%)',
                                                boxShadow: '0 2px 8px hsl(217 30% 70% / 0.06)',
                                            }}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'hsl(217 60% 95%)' }}>
                                                    <Icon className="h-5 w-5 text-primary" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-foreground capitalize truncate">{source.label}</p>
                                                    <p className="text-xs text-muted-foreground">{count.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} {t('explore.elements')}</p>
                                                </div>
                                            </div>

                                            {isConnected ? (
                                                <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 card-organic px-2.5 py-1.5">
                                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                                    <span>{t('explore.connected')}</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => void connect(source.type)}
                                                    disabled={isConnecting}
                                                    className={cn(
                                                        'flex items-center gap-1.5 text-xs px-3 py-1.5 btn-organic-secondary transition-all duration-200 w-full justify-center font-medium',
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
                                                            {t('explore.connecting')}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FolioZap className="h-4 w-4" />
                                                            {t('explore.connectVia')}
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
                            <p className="text-xs text-amber-600 bg-amber-50 card-organic px-3 py-2 border border-amber-100">
                                {connectError}
                            </p>
                        )}

                        <p className="text-xs text-muted-foreground/50 text-center">
                            {t('explore.oauthNote')}
                        </p>
                    </div>
                )}

                {/* ── Step 2: Exploration ── */}
                {currentStep === 2 && (
                    <div className="max-w-xl w-full space-y-5" style={{ animation: 'fade-in 0.4s ease-out' }}>
                        <div>
                            <h2 className="text-xl font-semibold text-foreground mb-1" style={{ fontFamily: "'Newsreader', serif" }}>
                                {t('explore.step2Title')}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {t('explore.step2Sub')}
                            </p>
                        </div>

                        {/* Progress per source */}
                        <div className="space-y-3">
                            {sources.map((source) => {
                                const count = SOURCE_COUNTS[source.type] ?? 50;
                                const pct = Math.round((count / maxCount) * 100);
                                const active = animationStep >= 3;
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
                                        <span className="text-xs font-medium w-10 text-right tabular-nums" style={{ color: 'hsl(217 20% 55%)' }}>{count}</span>
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
                                {t('explore.discovering')}
                            </div>
                            <div className="divide-y" style={{ borderColor: 'hsl(217 20% 95%)' }}>
                                {SCAN_LOG.slice(0, animationStep >= 3 ? SCAN_LOG.length : 4).map((item, i) => (
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
                            <h2 className="text-xl font-semibold text-foreground mb-1.5" style={{ fontFamily: "'Newsreader', serif", letterSpacing: '-0.01em' }}>
                                {t('explore.step3Title')}
                            </h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {t('explore.step3Sub')}
                            </p>
                        </div>

                        {/* Big number — count-up animation */}
                        <div className="text-center py-4">
                            <div
                                className="text-6xl font-bold tracking-tight tabular-nums"
                                style={{ fontFamily: "'Newsreader', serif", color: 'hsl(217 45% 28%)', letterSpacing: '-0.02em' }}
                            >
                                {animatedTotal.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2 font-medium">{t('explore.totalAnalyzed')}</p>
                        </div>

                        {/* Two mini-cards */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div
                                className="card-organic card-organic-elevated p-5"
                                style={{
                                    background: 'linear-gradient(160deg, hsl(0 0% 100%), hsl(217 28% 98%))',
                                    border: '1px solid hsl(217 22% 90%)',
                                }}
                            >
                                <div className="flex items-center gap-2.5 mb-4">
                                    <span className="step-icon-organic">
                                        <FolioEye className="h-5 w-5 text-primary" />
                                    </span>
                                    <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Newsreader', serif" }}>
                                        {t('explore.discoveredTitle')}
                                    </h3>
                                </div>
                                <div className="space-y-2.5">
                                    {FINDINGS.map((f, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm py-0.5">
                                            <span className="text-muted-foreground">{f.label}</span>
                                            <span className="font-semibold tabular-nums text-foreground">{f.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div
                                className="card-organic card-organic-elevated p-5"
                                style={{
                                    background: 'linear-gradient(160deg, hsl(38 85% 98%), hsl(38 65% 96%))',
                                    border: '1px solid hsl(38 45% 88%)',
                                }}
                            >
                                <div className="flex items-center gap-2.5 mb-4">
                                    <span className="step-icon-organic" style={{ background: 'hsl(38 70% 92%)' }}>
                                        <AlertTriangle className="h-5 w-5" style={{ color: 'hsl(38, 60%, 38%)' }} />
                                    </span>
                                    <h3 className="text-sm font-semibold" style={{ fontFamily: "'Newsreader', serif", color: 'hsl(38, 70%, 32%)' }}>
                                        {t('explore.flaggedTitle')}
                                    </h3>
                                </div>
                                <div className="space-y-2.5">
                                    {FLAGGED.map((f, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm py-0.5">
                                            <span style={{ color: 'hsl(38, 45%, 38%)' }}>{f.label}</span>
                                            <span className="font-semibold tabular-nums" style={{ color: 'hsl(38, 55%, 28%)' }}>{f.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                        {onNextPhase && (
                            <div className="flex justify-center pt-4">
                                <button
                                    onClick={onNextPhase}
                                    className="flex items-center gap-2 px-8 py-3.5 btn-organic-pill text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
                                    style={{
                                        background: 'linear-gradient(145deg, hsl(217 65% 50%), hsl(217 72% 42%))',
                                        color: 'hsl(0 0% 100%)',
                                        boxShadow: '0 4px 20px hsl(217 60% 45% / 0.35), 0 1px 3px hsl(217 50% 30% / 0.2)',
                                    }}
                                >
                                    {t('explore.goToStructure')}
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
