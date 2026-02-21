import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { CheckCircle2, Circle } from 'lucide-react';
import clsx from 'clsx';
import type { Id } from '../../convex/_generated/dataModel';

interface Question {
  id: string;
  text: string;
  options: string[];
  contradictionId?: Id<'contradictions'>;
}

interface QuestionCardProps {
  questionnaireId: string;
  question: Question;
  existingResponse?: string;
  respondedBy: string;
}

export function QuestionCard({ questionnaireId, question, existingResponse, respondedBy }: QuestionCardProps) {
  const respond = useMutation(api.questionnaires.respond);
  const [selected, setSelected] = useState<string | null>(existingResponse ?? null);
  const [submitting, setSubmitting] = useState(false);

  const handleSelect = async (option: string) => {
    if (existingResponse || submitting) return;
    setSelected(option);
    setSubmitting(true);
    try {
      await respond({
        questionnaireId: questionnaireId as Id<'questionnaires'>,
        questionId: question.id,
        selectedOption: option,
        respondedBy,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isAnswered = !!existingResponse || !!selected;

  return (
    <div className={clsx('bg-slate-800 border rounded-xl p-5', isAnswered ? 'border-emerald-500/30' : 'border-slate-700')}>
      <div className="flex items-start gap-3 mb-4">
        {isAnswered ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <Circle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
        )}
        <p className="text-sm text-white font-medium">{question.text}</p>
      </div>
      <div className="space-y-2 ml-8">
        {question.options.map((option) => {
          const isSelected = (existingResponse ?? selected) === option;
          return (
            <button
              key={option}
              disabled={isAnswered && !isSelected}
              onClick={() => void handleSelect(option)}
              className={clsx(
                'w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all border',
                isSelected
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                  : isAnswered
                    ? 'bg-slate-900 border-slate-700 text-slate-500 cursor-default'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800 cursor-pointer',
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                    isSelected ? 'border-blue-400' : 'border-slate-600',
                  )}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                </div>
                {option}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
