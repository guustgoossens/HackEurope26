import { cn } from '@/lib/utils';
import folioMark from '@/assets/folio-mark.svg';
import { FolioPlay as Play, FolioPause as Pause, FolioChevronLeft as ChevronLeft, FolioChevronRight as ChevronRight, FolioArrowLeft as ArrowLeft } from '@/components/icons/FolioIcons';

const PHASES = [
    { id: 1, label: 'Explorer' },
    { id: 2, label: 'Structurer' },
    { id: 3, label: 'Vérifier' },
];

interface TopNavProps {
    clientName: string;
    currentPhase: number;
    isPlaying: boolean;
    isComplete: boolean;
    onPhaseChange: (phase: number) => void;
    onTogglePlay: () => void;
    onBack: () => void;
}

export default function TopNav({
    clientName,
    currentPhase,
    isPlaying,
    onPhaseChange,
    onTogglePlay,
    onBack,
}: TopNavProps) {
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
                    {PHASES.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => onPhaseChange(p.id)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300',
                                currentPhase === p.id
                                    ? 'text-primary'
                                    : currentPhase > p.id
                                        ? 'text-muted-foreground'
                                        : 'text-muted-foreground/60 hover:text-muted-foreground',
                            )}
                            style={
                                currentPhase === p.id
                                    ? {
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
                                    currentPhase === p.id
                                        ? 'bg-primary text-primary-foreground'
                                        : currentPhase > p.id
                                            ? 'bg-muted-foreground/20 text-muted-foreground'
                                            : 'border border-muted-foreground/20 text-muted-foreground/50',
                                )}
                            >
                                {p.id}
                            </span>
                            <span className="hidden sm:inline">{p.label}</span>
                        </button>
                    ))}
                </div>

                <button
                    className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-md disabled:opacity-30"
                    onClick={() => onPhaseChange(Math.min(3, currentPhase + 1))}
                    disabled={currentPhase === 3}
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
                    {isPlaying ? 'Pause' : 'Démo'}
                </button>

                <div className="w-px h-5 mx-1.5" style={{ background: 'hsl(217 20% 88%)' }} />

                <button
                    onClick={onBack}
                    className="flex items-center gap-1 h-8 px-3 text-xs text-muted-foreground hover:text-foreground rounded-full transition-colors ml-1"
                >
                    <ArrowLeft className="h-6 w-6" />
                    <span className="hidden sm:inline">Accueil</span>
                </button>
            </div>
        </header>
    );
}
