import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import {
    FolioCheckCircle2 as CheckCircle2,
    FolioHelpCircle as HelpCircle,
    FolioSparkles,
} from '@/components/icons/FolioIcons';
import { cn } from '@/lib/utils';

interface Props {
    clientId: string;
    isComplete: boolean;
    onComplete: () => void;
}

export default function VerifyPhase({ clientId, isComplete, onComplete }: Props) {
    const questionnaires = useQuery(api.questionnaires.listByClient, {
        clientId: clientId as Id<'clients'>,
    });
    const respond = useMutation(api.questionnaires.respond);

    const questionnaire = questionnaires?.[questionnaires.length - 1];

    const data = useQuery(
        api.questionnaires.getWithResponses,
        questionnaire ? { id: questionnaire._id } : 'skip',
    );

    if (isComplete || (data && data.responses.length === data.questionnaire.questions.length && data.questionnaire.questions.length > 0)) {
        return (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div
                    className="max-w-lg w-full mx-4 pointer-events-auto rounded-2xl p-10 text-center"
                    style={{
                        animation: 'scale-in 0.4s ease-out',
                        background: 'linear-gradient(135deg, hsl(0 0% 100%), hsl(217 30% 97%))',
                        border: '1px solid hsl(217 20% 91%)',
                        boxShadow: '0 8px 32px hsl(217 30% 70% / 0.12), 0 2px 8px hsl(217 30% 70% / 0.06)',
                    }}
                >
                    <FolioSparkles className="h-24 w-24 mx-auto mb-3 text-primary" />
                    <CheckCircle2 className="h-32 w-32 mx-auto mb-4" style={{ color: 'hsl(152, 55%, 42%)' }} />
                    <h2
                        className="text-2xl font-semibold text-foreground mb-2"
                        style={{ fontFamily: "'Newsreader', serif" }}
                    >
                        Base de connaissances vérifiée
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Toutes les ambiguïtés résolues · Prête pour les agents
                    </p>
                </div>
            </div>
        );
    }

    if (!questionnaire || !data) {
        return (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div
                    className="max-w-xl w-full mx-4 pointer-events-auto rounded-2xl p-8 text-center"
                    style={{
                        background: 'linear-gradient(135deg, hsl(0 0% 100%), hsl(217 25% 97%))',
                        border: '1px solid hsl(217 20% 91%)',
                        boxShadow: '0 8px 32px hsl(217 30% 70% / 0.12)',
                    }}
                >
                    <p className="text-sm text-muted-foreground">
                        En attente de la génération du questionnaire de vérification…
                    </p>
                </div>
            </div>
        );
    }

    const { questions } = data.questionnaire;
    const responseMap = new Map(data.responses.map((r) => [r.questionId, r.selectedOption]));
    const total = questions.length;

    // Find the current unanswered question
    const currentQ = questions.find((q) => !responseMap.has(q.id));
    const questionIndex = currentQ ? questions.indexOf(currentQ) : total;

    if (!currentQ) {
        // All answered but onComplete not yet fired
        onComplete();
        return null;
    }

    const handleAnswer = async (optionText: string) => {
        await respond({
            questionnaireId: questionnaire._id,
            questionId: currentQ.id,
            selectedOption: optionText,
            respondedBy: 'demo',
        });
    };

    return (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div
                key={currentQ.id}
                className="max-w-xl w-full mx-4 pointer-events-auto rounded-2xl overflow-hidden"
                style={{
                    animation: 'scale-in 0.3s ease-out',
                    background: 'linear-gradient(135deg, hsl(0 0% 100%), hsl(217 25% 97%))',
                    border: '1px solid hsl(217 20% 91%)',
                    boxShadow: '0 8px 32px hsl(217 30% 70% / 0.12), 0 2px 8px hsl(217 30% 70% / 0.06)',
                }}
            >
                <div className="px-6 pt-6 pb-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <HelpCircle className="h-7 w-7" />
                        Question {questionIndex + 1} sur {total}
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 rounded-full mb-3 overflow-hidden" style={{ background: 'hsl(217 20% 91%)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${((questionIndex + 1) / total) * 100}%`,
                                background: 'linear-gradient(90deg, hsl(217 55% 70%), hsl(217 65% 55%))',
                            }}
                        />
                    </div>
                    <h3
                        className="text-base font-semibold text-foreground mt-2"
                        style={{ fontFamily: "'Newsreader', serif" }}
                    >
                        {currentQ.text}
                    </h3>
                </div>
                <div className="px-6 pb-6 space-y-2">
                    {currentQ.options.map((opt, i) => {
                        const answered = responseMap.get(currentQ.id);
                        const isSelected = answered === opt;
                        return (
                            <button
                                key={i}
                                onClick={() => void handleAnswer(opt)}
                                className={cn(
                                    'w-full text-left py-3 px-4 text-sm rounded-xl transition-all duration-300',
                                    isSelected ? 'text-primary font-medium' : 'text-foreground hover:-translate-y-0.5',
                                )}
                                style={
                                    isSelected
                                        ? {
                                            background: 'linear-gradient(135deg, hsl(217 60% 95%), hsl(217 50% 92%))',
                                            border: '1px solid hsl(217 40% 82%)',
                                            boxShadow: '0 2px 8px hsl(217 40% 70% / 0.15)',
                                        }
                                        : {
                                            background: 'hsl(0 0% 100%)',
                                            border: '1px solid hsl(217 20% 91%)',
                                            boxShadow: '0 1px 3px hsl(217 30% 70% / 0.06)',
                                        }
                                }
                            >
                                {opt}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
