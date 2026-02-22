import { Search, GitBranch, ClipboardCheck, Zap, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

const phaseKeys = ['explore', 'structure', 'verify', 'use'] as const;

type Phase = 'onboard' | 'explore' | 'structure' | 'verify' | 'use';

interface PhaseIndicatorProps {
  currentPhase: Phase;
}

const icons = [Search, GitBranch, ClipboardCheck, Zap];

export function PhaseIndicator({ currentPhase }: PhaseIndicatorProps) {
  const { t } = useTranslation();
  const phaseOrder: Phase[] = ['onboard', 'explore', 'structure', 'verify', 'use'];
  const currentIndex = phaseOrder.indexOf(currentPhase);

  return (
    <div className="flex items-center gap-2">
      {phaseKeys.map((key, i) => {
        const phaseIndex = phaseOrder.indexOf(key);
        const isCurrent = key === currentPhase;
        const isPast = phaseIndex < currentIndex;
        const isFuture = phaseIndex > currentIndex;
        const Icon = icons[i];

        return (
          <div key={key} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={clsx('w-8 h-0.5 rounded-full', isPast || isCurrent ? 'bg-blue-500' : 'bg-slate-700')}
              />
            )}
            <div
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isCurrent && 'bg-blue-600/20 text-blue-300 border border-blue-500/30',
                isPast && 'bg-emerald-600/10 text-emerald-400',
                isFuture && 'text-slate-500',
              )}
            >
              <div
                className={clsx(
                  'w-6 h-6 rounded-full flex items-center justify-center',
                  isCurrent && 'bg-blue-500 text-white',
                  isPast && 'bg-emerald-500 text-white',
                  isFuture && 'bg-slate-700 text-slate-500',
                )}
              >
                {isPast ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              <span className="hidden sm:inline">{t(`phase.${key}`)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
