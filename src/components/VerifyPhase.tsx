import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import {
    FolioCheckCircle2 as CheckCircle2,
    FolioAlertTriangle as AlertTriangle,
    FolioSparkles,
    FolioShield,
    FolioArrowRight as ArrowRight,
} from '@/components/icons/FolioIcons';
import { cn } from '@/lib/utils';

interface Props {
    clientId: string;
    isComplete: boolean;
    onComplete: () => void;
    onNextPhase?: () => void;
    respondedBy?: string;
}

export default function VerifyPhase({ clientId, isComplete, onComplete, onNextPhase, respondedBy = 'demo' }: Props) {
    const { t } = useTranslation();
    const questionnaires = useQuery(api.questionnaires.listByClient, {
        clientId: clientId as Id<'clients'>,
    });
    const contradictions = useQuery(api.contradictions.listByClient, {
        clientId: clientId as Id<'clients'>,
    });
    const respond = useMutation(api.questionnaires.respond);

    const questionnaire = questionnaires?.[questionnaires.length - 1];
    const data = useQuery(
        api.questionnaires.getWithResponses,
        questionnaire ? { id: questionnaire._id } : 'skip',
    );

    const contradictionMap = new Map((contradictions ?? []).map(c => [c._id, c]));

    const allAnswered =
        data &&
        data.responses.length === data.questionnaire.questions.length &&
        data.questionnaire.questions.length > 0;

    const panelStyle: React.CSSProperties = {
        background: 'linear-gradient(180deg, hsl(0 0% 100%), hsl(217 25% 97%))',
        borderLeft: '1px solid hsl(217 20% 91%)',
    };

    if (isComplete || allAnswered) {
        if (allAnswered && !isComplete) onComplete();
        return (
            <div className="h-full flex flex-col w-96 shrink-0" style={panelStyle}>
                <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
                    <div
                        className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, hsl(152 60% 94%), hsl(152 50% 90%))' }}
                    >
                        <CheckCircle2 className="h-8 w-8" style={{ color: 'hsl(152, 55%, 38%)' }} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground mb-1" style={{ fontFamily: "'Newsreader', serif" }}>
                            {t('verify.baseVerified')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {t('verify.allResolved')}<br />{t('verify.readyForAgents')}
                        </p>
                    </div>
                    <div
                        className="flex items-center gap-2 px-4 py-2 card-organic text-xs"
                        style={{
                            background: 'hsl(152 40% 96%)',
                            border: '1px solid hsl(152 35% 85%)',
                            color: 'hsl(152 50% 32%)',
                        }}
                    >
                        <FolioSparkles className="h-5 w-5" />
                        <span>{t('verify.kbOperational')}</span>
                    </div>
                    {onNextPhase && (
                        <button
                            onClick={onNextPhase}
                            className="flex items-center gap-2 px-6 py-3 btn-organic-pill text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
                            style={{
                                background: 'linear-gradient(145deg, hsl(152 55% 42%), hsl(152 65% 35%))',
                                color: 'hsl(0 0% 100%)',
                                boxShadow: '0 4px 20px hsl(152 55% 40% / 0.35), 0 1px 3px hsl(152 50% 25% / 0.2)',
                            }}
                        >
                            {t('verify.goToDeploy')}
                            <ArrowRight className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (!questionnaire || !data) {
        return (
            <div className="h-full flex flex-col w-96 shrink-0" style={panelStyle}>
                <div className="flex-1 flex items-center justify-center px-6">
                    <p className="text-sm text-muted-foreground text-center">
                        {t('verify.generating')}
                    </p>
                </div>
            </div>
        );
    }

    const { questions } = data.questionnaire;
    const responseMap = new Map(data.responses.map(r => [r.questionId, r.selectedOption]));
    const total = questions.length;
    const answeredCount = data.responses.length;
    const currentQ = questions.find(q => !responseMap.has(q.id));
    const questionIndex = currentQ ? questions.indexOf(currentQ) : total;

    if (!currentQ) {
        onComplete();
        return null;
    }

    const contradiction = currentQ.contradictionId
        ? contradictionMap.get(currentQ.contradictionId)
        : undefined;

    const handleAnswer = async (optionText: string) => {
        await respond({
            questionnaireId: questionnaire._id,
            questionId: currentQ.id,
            selectedOption: optionText,
            respondedBy,
        });
    };

    return (
        <div className="h-full flex flex-col w-96 shrink-0" style={panelStyle}>
            {/* Header */}
            <div className="px-5 py-4 shrink-0" style={{ borderBottom: '1px solid hsl(217 20% 91%)' }}>
                <div className="flex items-center gap-2 mb-1.5">
                    <FolioShield className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Newsreader', serif" }}>
                        {t('verify.title')}
                    </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                    {t('verify.subtitle')}
                </p>
                {/* Progress bar */}
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(217 20% 91%)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${(answeredCount / total) * 100}%`,
                                background: 'linear-gradient(90deg, hsl(217 55% 70%), hsl(217 65% 52%))',
                            }}
                        />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{answeredCount}/{total}</span>
                </div>
            </div>

            {/* Scrollable question content */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                <div key={currentQ.id} style={{ animation: 'fade-in 0.3s ease-out' }}>
                    {/* Contradiction badge */}
                    {contradiction && (
                        <div
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 card-organic mb-3 font-medium"
                            style={{
                                background: 'hsl(38 80% 96%)',
                                border: '1px solid hsl(38 40% 86%)',
                                color: 'hsl(38 70% 32%)',
                            }}
                        >
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            {t('verify.contradictionDetected')}
                        </div>
                    )}

                    {/* Question text */}
                    <p
                        className="text-sm font-semibold text-foreground leading-snug mb-4"
                        style={{ fontFamily: "'Newsreader', serif" }}
                    >
                        {currentQ.text}
                    </p>

                    {/* Source context blocks */}
                    {contradiction && (
                        <div className="space-y-2 mb-4">
                            <SourceBlock label={t('verify.sourceA')} filename={contradiction.sourceA} value={contradiction.valueA} />
                            <SourceBlock label={t('verify.sourceB')} filename={contradiction.sourceB} value={contradiction.valueB} />
                        </div>
                    )}

                    {/* Answer options */}
                    <div className="space-y-2">
                        {currentQ.options.map((opt, i) => {
                            const isSelected = responseMap.get(currentQ.id) === opt;
                            return (
                                <button
                                    key={i}
                                    onClick={() => void handleAnswer(opt)}
                                    className={cn(
                                        'w-full text-left py-2.5 px-4 text-sm card-organic transition-all duration-200 flex items-start gap-2.5',
                                        isSelected ? 'text-primary font-medium' : 'text-foreground hover:-translate-y-0.5',
                                    )}
                                    style={
                                        isSelected
                                            ? {
                                                background: 'linear-gradient(135deg, hsl(217 60% 95%), hsl(217 50% 92%))',
                                                border: '1.5px solid hsl(217 40% 80%)',
                                                boxShadow: '0 2px 8px hsl(217 40% 70% / 0.15)',
                                            }
                                            : {
                                                background: 'hsl(0 0% 100%)',
                                                border: '1px solid hsl(217 20% 90%)',
                                                boxShadow: '0 1px 3px hsl(217 30% 70% / 0.05)',
                                            }
                                    }
                                >
                                    <span
                                        className={cn(
                                            'w-4 h-4 rounded-full border shrink-0 mt-0.5 flex items-center justify-center transition-all',
                                            isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30',
                                        )}
                                    >
                                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </span>
                                    <span className="leading-snug">{opt}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div
                className="px-5 py-3 shrink-0 text-xs text-muted-foreground text-center"
                style={{ borderTop: '1px solid hsl(217 20% 92%)' }}
            >
                {t('verify.questionOf', { current: questionIndex + 1, total })}
            </div>
        </div>
    );
}

function SourceBlock({ label, filename, value }: { label: string; filename: string; value: string }) {
    return (
        <div
            className="card-organic px-3 py-2.5 text-xs space-y-0.5"
            style={{
                background: 'hsl(217 30% 97%)',
                border: '1px solid hsl(217 20% 91%)',
            }}
        >
            <div className="text-muted-foreground font-medium">{label}</div>
            <div className="text-foreground font-medium truncate">{filename}</div>
            <div style={{ color: 'hsl(217 50% 45%)' }}>→ {value}</div>
        </div>
    );
}
