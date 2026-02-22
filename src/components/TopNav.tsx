import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import folioMark from '@/assets/folio-mark.svg';
import { FolioPlay as Play, FolioPause as Pause, FolioChevronLeft as ChevronLeft, FolioChevronRight as ChevronRight, FolioArrowLeft as ArrowLeft } from '@/components/icons/FolioIcons';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface TopNavProps {
    clientName: string;
    currentPhase: number;
    isPlaying: boolean;
    isComplete: boolean;
    onPhaseChange: (phase: number) => void;
    onTogglePlay: () => void;
    onBack: () => void;
    onSwitchToLive?: () => void;
    activePhaseTitle?: string;
    activePhaseSubtitle?: string;
}

const PHASE_KEYS = ['explorer', 'structurer', 'verifier', 'deployer'] as const;

export default function TopNav({
    clientName,
    currentPhase,
    isPlaying,
    isComplete,
    onPhaseChange,
    onTogglePlay,
    onBack,
    onSwitchToLive,
    activePhaseTitle,
    activePhaseSubtitle,
}: TopNavProps) {
    const { t } = useTranslation();
    const PHASES = PHASE_KEYS.map((key, i) => ({ id: i + 1, label: t(`topNav.${key}`) }));

    return (
        <header
            className="h-14 flex items-center px-6 shrink-0 z-20 relative"
            style={{
                background: 'linear-gradient(180deg, hsl(220 20% 99%), hsl(217 30% 97%))',
                boxShadow: '0 1px 3px -1px hsl(217 30% 70% / 0.12), 0 1px 0 hsl(217 20% 90% / 0.5)',
            }}
        >
            {/* Logo + back + client name (left) */}
            <div className="flex items-center gap-6 min-w-0">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0"
                    aria-label="Back to landing"
                >
                    <img src={folioMark} alt="Folio" className="w-[60px] h-[60px]" />
                    <span className="text-[34px] tracking-tight text-foreground" style={{ fontFamily: "'Newsreader', serif", fontWeight: 500 }}>
                        folio
                    </span>
                </button>
                <span className="text-sm text-muted-foreground truncate" style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic' }}>
                    {clientName}
                </span>
            </div>

            {/* Spacer so phase nav stays right */}
            <div className="flex-1 min-w-4" />

            {/* Phase navigation */}
            <div className="flex items-center gap-1">
                <button
                    className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-md disabled:opacity-30"
                    onClick={() => onPhaseChange(Math.max(1, currentPhase - 1))}
                    disabled={currentPhase === 1}
                >
                    <ChevronLeft className="h-8 w-8" />
                </button>

                <div className="flex items-center gap-1">
                    {PHASES.map((p) => {
                        const isDeployer = p.id === 4;
                        const isLocked = isDeployer && !isComplete;
                        return (
                            <div key={p.id} className="relative flex flex-col items-center">
                                <button
                                    onClick={() => !isLocked && onPhaseChange(p.id)}
                                    disabled={isLocked}
                                    className={cn(
                                        'flex items-center gap-1.5 px-3 py-1.5 btn-organic-pill text-xs font-medium transition-all duration-300',
                                        isLocked
                                            ? 'text-muted-foreground/30 cursor-not-allowed'
                                            : currentPhase === p.id
                                                ? isDeployer ? 'text-emerald-700' : 'text-primary'
                                                : currentPhase > p.id
                                                    ? 'text-muted-foreground'
                                                    : 'text-muted-foreground/60 hover:text-muted-foreground',
                                    )}
                                    style={
                                        isLocked
                                            ? {}
                                            : currentPhase === p.id
                                                ? isDeployer
                                                    ? {
                                                        background: 'linear-gradient(135deg, hsl(152 50% 94%), hsl(152 40% 91%))',
                                                        boxShadow: '0 1px 3px hsl(152 40% 70% / 0.3), inset 0 1px 0 hsl(0 0% 100% / 0.6)',
                                                    }
                                                    : {
                                                        background: 'linear-gradient(135deg, hsl(217 60% 95%), hsl(217 50% 92%))',
                                                        boxShadow: '0 1px 3px hsl(217 40% 80% / 0.3), inset 0 1px 0 hsl(0 0% 100% / 0.6)',
                                                    }
                                                : currentPhase > p.id
                                                    ? { background: 'hsl(217 20% 96%)' }
                                                    : {}
                                    }
                                >
                                    <span
                                        className={cn(
                                            'w-4 h-4 rounded-full text-[10px] flex items-center justify-center transition-all duration-300',
                                            isLocked
                                                ? 'border border-muted-foreground/10 text-muted-foreground/20'
                                                : currentPhase === p.id
                                                    ? isDeployer
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-primary text-primary-foreground'
                                                    : currentPhase > p.id
                                                        ? 'bg-muted-foreground/20 text-muted-foreground'
                                                        : 'border border-muted-foreground/20 text-muted-foreground/50',
                                        )}
                                    >
                                        {p.id}
                                    </span>
                                    <span className="hidden sm:inline">{p.label}</span>
                                </button>

                                {/* Tooltip for the active phase */}
                                {currentPhase === p.id && activePhaseTitle && activePhaseSubtitle && currentPhase !== 4 && (
                                    <div
                                        className="absolute top-14 mt-1 flex flex-col items-center pointer-events-none z-30"
                                        key={`bubble-${currentPhase}`}
                                        style={{ animation: 'fade-in 0.4s ease-out' }}
                                    >
                                        <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-primary" style={{ borderBottomColor: 'hsl(217 71% 30%)' }} />
                                        <div
                                            className="text-white text-[13px] px-4 py-2.5 rounded-xl shadow-xl w-max max-w-[280px] text-center"
                                            style={{
                                                background: 'hsl(217 71% 30%)',
                                                boxShadow: '0 4px 12px hsl(217 71% 30% / 0.25)'
                                            }}
                                        >
                                            <span className="font-semibold block mb-0.5" style={{ fontFamily: "'Newsreader', serif", fontSize: '15px' }}>{activePhaseTitle}</span>
                                            <span className="text-white/90">{activePhaseSubtitle}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <button
                    className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors btn-organic-secondary disabled:opacity-30"
                    onClick={() => onPhaseChange(Math.min(4, currentPhase + 1))}
                    disabled={currentPhase === 4 || (currentPhase === 3 && !isComplete)}
                >
                    <ChevronRight className="h-8 w-8" />
                </button>

                <div className="w-px h-5 mx-1.5" style={{ background: 'hsl(217 20% 88%)' }} />

                <button
                    onClick={onTogglePlay}
                    className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-full transition-all duration-300 text-primary"
                    style={{
                        background: 'linear-gradient(135deg, hsl(217 50% 97%), hsl(217 40% 94%))',
                        border: '1px solid hsl(217 30% 88%)',
                        boxShadow: '0 1px 2px hsl(217 40% 80% / 0.15)',
                    }}
                >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                    {isPlaying ? t('topNav.pause') : t('topNav.demo')}
                </button>

                <div className="w-px h-5 mx-1.5" style={{ background: 'hsl(217 20% 88%)' }} />

                {onSwitchToLive && (
                    <button
                        onClick={onSwitchToLive}
                        className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-full transition-all duration-300 text-white"
                        style={{
                            background: 'hsl(217 71% 30%)',
                            boxShadow: '0 1px 4px hsl(217 71% 30% / 0.25)',
                        }}
                    >
                        Workspace Dashboard →
                    </button>
                )}

                <LanguageSwitcher
                    className="h-8 px-3 text-xs font-medium rounded-full border transition-colors text-muted-foreground hover:text-foreground hover:border-primary/30"
                    style={{ borderColor: 'hsl(217 30% 88%)' }}
                />

                <button
                    onClick={onBack}
                    className="flex items-center gap-1 h-8 px-3 text-xs text-muted-foreground hover:text-foreground rounded-full transition-colors ml-1"
                >
                    <ArrowLeft className="h-6 w-6" />
                    <span className="hidden sm:inline">{t('topNav.home')}</span>
                </button>
            </div>
        </header>
    );
}
