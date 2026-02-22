import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LandingGraph from '@/components/landing/LandingGraph';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { SORTED_NODES } from '@/data/landingGraphData';
import { useInView } from '@/hooks/useInView';
import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/utils';
import {
  FolioCheck as Check,
  FolioX as X,
  FolioArrowRight as ArrowRight,
  FolioMail as Mail,
  FolioHardDrive as HardDrive,
  FolioFileSpreadsheet as FileSpreadsheet,
  FolioCloud as Cloud,
  FolioSend as Send,
  FolioFileText as FileText,
  FolioSparkles,
  FolioEye,
  FolioZap,
  FolioShield,
  FolioBuilding,
  FolioGlobe,
  FolioLink,
  FolioCompass,
  FolioDatabase,
  FolioScale,
} from '@/components/icons/FolioIcons';
import folioMark from '@/assets/folio-mark.svg';

const TOTAL = SORTED_NODES.length;

interface LandingProps {
  onSignIn: () => void;
  authLoading?: boolean;
}

/* ─── Shared ─── */
function FadeIn({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isInView } = useInView(0.1);
  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        isInView ? 'opacity-100 translate-y-0 scale-100 blur-0' : 'opacity-0 translate-y-8 scale-[0.98] blur-[4px]',
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── Step visuals ─── */
function ConnectVisual() {
  const { ref, isInView } = useInView(0.2);
  const tools: { name: string; icon: React.ReactNode }[] = [
    { name: 'Gmail', icon: <Mail className="h-8 w-8" style={{ color: 'hsl(var(--muted-foreground))' }} /> },
    { name: 'Drive', icon: <HardDrive className="h-8 w-8" style={{ color: 'hsl(var(--muted-foreground))' }} /> },
    { name: 'Pennylane', icon: <FileSpreadsheet className="h-8 w-8" style={{ color: 'hsl(var(--muted-foreground))' }} /> },
    { name: 'OneDrive', icon: <Cloud className="h-8 w-8" style={{ color: 'hsl(var(--muted-foreground))' }} /> },
    { name: 'Outlook', icon: <Send className="h-8 w-8" style={{ color: 'hsl(var(--muted-foreground))' }} /> },
    { name: 'Meeting notes', icon: <FileText className="h-8 w-8" style={{ color: 'hsl(var(--muted-foreground))' }} /> },
  ];
  return (
    <div ref={ref} className="flex flex-wrap gap-3 justify-center">
      {tools.map((t, i) => (
        <div
          key={t.name}
          className={cn(
            'flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-all duration-500 shadow-sm',
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
          )}
          style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            transitionDelay: `${i * 100}ms`,
          }}
        >
          {t.icon}
          <span className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>{t.name}</span>
          <Check
            className={cn('h-7 w-7', isInView && 'animate-pulse-glow')}
            style={{ color: 'hsl(var(--primary))', opacity: isInView ? 1 : 0, transitionDelay: `${i * 100 + 300}ms` }}
          />
        </div>
      ))}
    </div>
  );
}

function BubbleItem({ item, index, isInView }: { item: { name: string; count: number; size: number }; index: number; isInView: boolean }) {
  const count = useCountUp(item.count, 1800, isInView);
  const blobs = [
    'M50 4C72 3 96 14 98 38C100 62 84 96 54 98C24 100 4 78 2 52C0 26 28 5 50 4Z',
    'M48 2C76 0 98 20 99 46C100 72 80 98 52 99C24 100 2 76 3 48C4 20 20 4 48 2Z',
    'M52 3C74 2 97 18 98 44C99 70 78 97 50 98C22 99 3 74 2 46C1 18 30 4 52 3Z',
    'M46 3C70 1 96 16 98 42C100 68 82 96 56 98C30 100 4 80 2 54C0 28 22 5 46 3Z',
  ];
  return (
    <div
      className="flex flex-col items-center gap-2 transition-all duration-700"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : 'translateY(20px)',
        transitionDelay: `${index * 120}ms`,
        animation: isInView ? `float 3s ease-in-out ${index * 0.4}s infinite` : 'none',
      }}
    >
      <div
        className="relative flex items-center justify-center transition-all duration-700"
        style={{ width: isInView ? item.size : 0, height: isInView ? item.size : 0, transitionDelay: `${index * 120 + 80}ms` }}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <path d={blobs[index % blobs.length]} fill="hsl(var(--primary) / 0.06)" stroke="hsl(var(--primary) / 0.2)" strokeWidth="1.5" />
        </svg>
        <span className="text-xs font-bold relative z-10" style={{ color: 'hsl(var(--primary))' }}>
          {isInView ? count.toLocaleString() : '0'}
        </span>
      </div>
      <span className="text-[11px]" style={{ color: 'hsl(var(--muted-foreground))' }}>{item.name}</span>
    </div>
  );
}

function BubbleChart() {
  const { ref, isInView } = useInView(0.2);
  const items = [
    { name: 'Pennylane', count: 1200, size: 100 },
    { name: 'Gmail', count: 847, size: 82 },
    { name: 'Drive', count: 203, size: 54 },
    { name: 'Excel', count: 47, size: 38 },
  ];
  return (
    <div ref={ref} className="flex items-end justify-center gap-5 py-4">
      {items.map((item, i) => (
        <BubbleItem key={item.name} item={item} index={i} isInView={isInView} />
      ))}
    </div>
  );
}

function HierarchyVisual() {
  const { t } = useTranslation();
  const { isInView } = useInView(0.2);
  const lines = [
    <div key="root" className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-full" style={{ background: 'hsl(var(--primary))' }} />
      <span className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>{t('landing.hierarchyFinance')}</span>
      <span className="ml-auto text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('landing.hierarchyDocs')}</span>
    </div>,
    <div key="inv" className="flex items-center gap-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
      <span className="w-2 h-2 rounded-full" style={{ background: 'hsl(var(--primary))' }} />
      {t('landing.hierarchyInvoices')}
      <span className="ml-auto text-[10px] font-medium" style={{ color: 'hsl(var(--primary))' }}>{t('landing.hierarchyVerified')}</span>
    </div>,
    <div key="q" className="text-xs" style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}>
      <div>├── Q1 2024</div><div>├── Q2 2024</div><div>└── Q3 2024</div>
    </div>,
    <div key="vat" className="flex items-center gap-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
      <span className="w-2 h-2 rounded-full" style={{ background: 'hsl(var(--accent))' }} />
      {t('landing.hierarchyVat')}
      <span className="ml-auto text-[10px] font-medium" style={{ color: 'hsl(var(--accent))' }}>{t('landing.hierarchyDraft')}</span>
    </div>,
    <div key="ann" className="flex items-center gap-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
      <span className="w-2 h-2 rounded-full" style={{ background: 'hsl(var(--accent))' }} />
      {t('landing.hierarchyAnnual')}
    </div>,
  ];

  return (
    <div className="rounded-xl border p-5 font-mono text-sm shadow-sm" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
      {lines.map((line, i) => (
        <div
          key={i}
          className={cn('transition-all duration-500', i > 0 && 'ml-5 pl-4', isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4')}
          style={{
            transitionDelay: `${i * 100}ms`,
            marginTop: i > 0 ? '6px' : 0,
            borderLeft: i > 0 ? '1px solid hsl(var(--border))' : undefined,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

function VerifyCard({ selected, onSelect }: { selected: number | null; onSelect: (i: number) => void }) {
  const { t } = useTranslation();
  const opts = [t('landing.verifyOptRef'), t('landing.verifyOptClient'), t('landing.verifyOptBatch')];
  return (
    <div className="rounded-xl border p-6 space-y-4 shadow-sm" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
      <div className="text-[11px] font-mono tracking-wider uppercase" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('landing.verifyRequired')}</div>
      <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground))' }}>
        {t('landing.verifyQuestion')}
      </p>
      <div className="space-y-2">
        {opts.map((o, i) => (
          <button
            key={o}
            onClick={() => onSelect(i)}
            className={cn('btn-organic-secondary w-full text-left px-4 py-2.5 border text-sm hover:shadow-sm')}
            style={
              selected === i
                ? { borderColor: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.05)', color: 'hsl(var(--foreground))' }
                : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))', background: 'transparent' }
            }
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function DeployVisual() {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border p-5 font-mono text-sm space-y-3 shadow-sm" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
      <div style={{ color: 'hsl(var(--muted-foreground))' }}>
        <span className="font-semibold" style={{ color: 'hsl(var(--primary))' }}>→</span> {t('landing.deployQuery')}
        <span className="inline-block w-[2px] h-4 ml-0.5 align-middle animate-cursor" style={{ background: 'hsl(var(--primary))' }} />
      </div>
      <div className="leading-relaxed" style={{ color: 'hsl(var(--foreground))' }}>
        {t('landing.deployResult')}<br />
        {t('landing.deployStatus')} <span className="font-medium" style={{ color: 'hsl(var(--primary))' }}>{t('landing.deployPaid')}</span> · €12,400 · VAT 20%
      </div>
      <div className="text-xs pt-2" style={{ borderTop: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground) / 0.5)' }}>
        {t('landing.deploySource')}
      </div>
    </div>
  );
}

function ComparisonCard({ title, items, icon, highlight }: { title: React.ReactNode; items: string[]; icon: 'check' | 'x'; highlight?: boolean }) {
  const { ref, isInView } = useInView(0.15);
  return (
    <div
      ref={ref}
      className={cn('rounded-xl border p-8 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md')}
      style={{
        background: 'hsl(var(--card))',
        borderColor: highlight ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--border))',
        borderWidth: highlight ? '2px' : '1px',
      }}
    >
      <h3 className="text-base font-semibold mb-6" style={{ color: 'hsl(var(--foreground))' }}>{title}</h3>
      <div className="space-y-3.5">
        {items.map((p, i) => (
          <div
            key={p}
            className={cn('flex items-start gap-3 transition-all duration-500', isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3')}
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            {icon === 'check' ? (
              <Check className="h-8 w-8 shrink-0 mt-0.5" style={{ color: 'hsl(var(--primary))' }} />
            ) : (
              <X className="h-8 w-8 shrink-0 mt-0.5" style={{ color: 'hsl(0, 84%, 60%)' }} />
            )}
            <span className="text-sm" style={{ color: highlight ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}>{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataMoatFlow() {
  const { t } = useTranslation();
  const { ref, isInView } = useInView(0.2);
  const steps = [t('landing.dataMoatStep1'), t('landing.dataMoatStep2'), t('landing.dataMoatStep3'), t('landing.dataMoatStep4')];
  return (
    <div ref={ref} className="flex items-center justify-center gap-2 flex-wrap">
      {steps.map((s, i, a) => (
        <div
          key={s}
          className={cn('flex items-center gap-2 transition-all duration-500', isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3')}
          style={{ transitionDelay: `${i * 120}ms` }}
        >
          <div className="px-3 py-1.5 rounded-md border text-sm shadow-sm" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
            {s}
          </div>
          {i < a.length - 1 && <ArrowRight className={cn('h-7 w-7 shrink-0', isInView && 'animate-arrow-pulse')} style={{ color: 'hsl(var(--primary))' }} />}
        </div>
      ))}
    </div>
  );
}

/* ─── Page ─── */
export default function Landing({ onSignIn, authLoading = false }: LandingProps) {
  const { t } = useTranslation();
  const [gVis, setGVis] = useState(0);
  const [navVisible] = useState(true); // true on first paint so content is never blank
  const [verifyOpt, setVerifyOpt] = useState<number | null>(null);
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  useEffect(() => {
    // already true; kept in case we want a short delay again later
  }, []);

  useEffect(() => {
    let active = true;
    let i = 0;
    const iv = setInterval(() => {
      if (!active) { clearInterval(iv); return; }
      if (++i <= TOTAL) { setGVis(i); }
      else { clearInterval(iv); }
    }, 150);
    return () => { active = false; clearInterval(iv); };
  }, []);

  const stepIcons = [
    <FolioLink className="h-8 w-8" />,
    <FolioEye className="h-8 w-8" />,
    <FolioCompass className="h-8 w-8" />,
    <FolioShield className="h-8 w-8" />,
    <FolioSparkles className="h-8 w-8" />,
  ];
  const flatLeft = [t('landing.flat1'), t('landing.flat2'), t('landing.flat3'), t('landing.flat4'), t('landing.flat5')];
  const folioRight = [t('landing.folio1'), t('landing.folio2'), t('landing.folio3'), t('landing.folio4'), t('landing.folio5')];

  const steps = [
    { n: '01', name: t('landing.step01'), text: t('landing.step01Text'), visual: <ConnectVisual />, flip: false, icon: stepIcons[0] },
    { n: '02', name: t('landing.step02'), text: t('landing.step02Text'), visual: <BubbleChart />, flip: true, icon: stepIcons[1] },
    { n: '03', name: t('landing.step03'), text: t('landing.step03Text'), visual: <HierarchyVisual />, flip: false, icon: stepIcons[2] },
    { n: '04', name: t('landing.step04'), text: t('landing.step04Text'), visual: <VerifyCard selected={verifyOpt} onSelect={setVerifyOpt} />, flip: true, icon: stepIcons[3] },
    { n: '05', name: t('landing.step05'), text: t('landing.step05Text'), visual: <DeployVisual />, flip: false, icon: stepIcons[4] },
  ];

  return (
    <div className="landing relative min-h-screen overflow-x-hidden" style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
      {/* ─── Nav ─── */}
      <nav
        className={cn('fixed top-0 inset-x-0 z-50 backdrop-blur-xl transition-all duration-700', navVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4')}
        style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)', background: 'hsl(var(--background) / 0.8)' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={folioMark} alt="Folio" className="w-[60px] h-[60px]" />
            <span className="text-[38px] tracking-tight" style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, color: 'hsl(var(--foreground))' }}>folio</span>
          </div>
          <div className="flex items-center gap-6">
            <LanguageSwitcher className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: 'hsl(var(--muted-foreground))' }} />
            <a href="#product" className="text-sm hidden sm:block transition-colors" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('landing.product')}</a>
            <a href="#vision" className="text-sm hidden sm:block transition-colors" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('landing.vision')}</a>
            <a href="#early-access" className="text-sm hidden sm:block transition-colors" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('landing.earlyAccess')}</a>
            <button
              onClick={onSignIn}
              disabled={authLoading}
              className="btn-organic px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
            >
              {authLoading ? t('common.loading') : t('landing.getStarted')}
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="pt-28 md:pt-36 pb-4 px-6 relative z-[1]">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-[-0.03em] leading-[1.05]" style={{ fontFamily: "'Newsreader', serif", color: 'hsl(var(--foreground))' }}>
            {[t('landing.hero1'), t('landing.hero2')].map((line, i) => (
              <span
                key={i}
                className="block transition-all duration-700 ease-out"
                style={{
                  opacity: navVisible ? 1 : 0,
                  transform: navVisible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.98)',
                  filter: navVisible ? 'blur(0)' : 'blur(4px)',
                  transitionDelay: `${200 + i * 150}ms`,
                }}
              >
                {line}
              </span>
            ))}
          </h1>
          <p
            className="mt-6 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed transition-all duration-700"
            style={{ color: 'hsl(var(--muted-foreground))', opacity: navVisible ? 1 : 0, transform: navVisible ? 'translateY(0)' : 'translateY(12px)', transitionDelay: '500ms' }}
          >
            {t('landing.heroSub')}
          </p>
          <div
            className="mt-8 flex items-center justify-center gap-4 flex-wrap transition-all duration-700"
            style={{ opacity: navVisible ? 1 : 0, transform: navVisible ? 'translateY(0)' : 'translateY(12px)', transitionDelay: '650ms' }}
          >
            <button
              onClick={onSignIn}
              disabled={authLoading}
              className="btn-organic px-6 py-3 font-medium transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
            >
              {authLoading ? t('common.loading') : t('landing.seeDemo')}
            </button>
            <a
              href="#product"
              className="btn-organic-secondary px-6 py-3 font-medium transition-colors text-sm border"
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))', background: 'transparent' }}
            >
              {t('landing.seeHowItWorks')}
            </a>
          </div>
        </div>
        <div
          className="relative mt-12 md:mt-16 max-w-5xl mx-auto group"
        >
          <LandingGraph visibleCount={gVis} className="w-full h-[380px] md:h-[520px]" />
          <div
            className="btn-organic-pill absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-4 py-2 backdrop-blur-md text-sm shadow-sm transition-colors cursor-pointer hover:bg-black/5"
            style={{
              background: 'hsl(var(--card) / 0.9)',
              border: '1px solid hsl(var(--border))',
              cursor: authLoading ? 'wait' : 'pointer'
            }}
            onClick={() => !authLoading && onSignIn()}
            onKeyDown={(e) => e.key === 'Enter' && !authLoading && onSignIn()}
            role="button"
            tabIndex={0}
            aria-label={t('landing.viewDemo')}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full animate-ping opacity-50" style={{ background: 'hsl(var(--primary))' }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: 'hsl(var(--primary))' }} />
            </span>
            <span className="text-xs sm:text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('landing.agentStructuring')} <span className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>Cabinet Dupont &amp; Associés</span>…
            </span>
            <ArrowRight className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'hsl(var(--primary))' }} />
          </div>
        </div>
      </section>

      {/* ─── Problem ─── */}
      <section className="py-28 md:py-40 px-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <FadeIn>
            <div className="flex items-center gap-3 mb-4">
              <FolioEye className="h-14 w-14" style={{ color: 'hsl(var(--primary))' }} />
              <span className="text-xs font-mono tracking-widest uppercase" style={{ color: 'hsl(var(--primary))' }}>{t('landing.theProblem')}</span>
            </div>
            <h2 className="text-3xl md:text-[2.5rem] leading-tight tracking-tight" style={{ fontFamily: "'Newsreader', serif", color: 'hsl(var(--foreground))' }}>
              {t('landing.problemTitle')}
            </h2>
          </FadeIn>
          <FadeIn delay={150}>
            <p className="text-lg md:text-xl leading-relaxed max-w-2xl" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('landing.problemP1')}
            </p>
          </FadeIn>
          <FadeIn delay={300}>
            <p className="text-lg md:text-xl leading-relaxed max-w-2xl" style={{ color: 'hsl(var(--muted-foreground))' }}>
              <span className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>{t('landing.problemP2')}</span>
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="product" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="flex items-center gap-2 justify-center mb-3">
              <FolioCompass className="h-10 w-10" style={{ color: 'hsl(var(--primary))' }} />
              <p className="text-xs font-mono tracking-widest uppercase" style={{ color: 'hsl(var(--primary))' }}>{t('landing.howItWorks')}</p>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-20" style={{ fontFamily: "'Newsreader', serif", color: 'hsl(var(--foreground))' }}>
              {t('landing.fiveSteps')}
            </h2>
          </FadeIn>
          <div className="space-y-28">
            {steps.map((s) => (
              <FadeIn key={s.n}>
                <div className={cn('grid md:grid-cols-2 gap-12 items-center', s.flip && 'direction-rtl')}>
                  <div className={cn(s.flip && 'md:order-2')} style={{ direction: 'ltr' }}>
                    <div className="flex items-center gap-2 text-xs font-mono mb-3" style={{ color: 'hsl(var(--primary))' }}>
                      {s.icon}{s.n} — {s.name}
                    </div>
                    <p className="text-lg leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>{s.text}</p>
                  </div>
                  <div style={{ direction: 'ltr' }}>{s.visual}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Comparison ─── */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-16" style={{ fontFamily: "'Newsreader', serif", color: 'hsl(var(--foreground))' }}>
              {t('landing.comparisonTitle')}
            </h2>
          </FadeIn>
          <FadeIn delay={100}>
            <div className="grid md:grid-cols-2 gap-6">
              <ComparisonCard title={<>{t('landing.flatSearch')} <span style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 400 }}>{t('landing.everyoneElse')}</span></>} items={flatLeft} icon="x" />
              <ComparisonCard title={t('landing.folioKb')} items={folioRight} icon="check" highlight />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── Data Moat ─── */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <FadeIn>
            <FolioDatabase className="h-10 w-10 mx-auto mb-4" style={{ color: 'hsl(var(--primary))' }} />
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-8" style={{ fontFamily: "'Newsreader', serif", color: 'hsl(var(--foreground))' }}>
              {t('landing.dataMoatTitle')}
            </h2>
            <p className="text-lg leading-relaxed mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('landing.dataMoatP1')}
            </p>
            <p className="text-lg leading-relaxed mb-12" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('landing.dataMoatP2')}
            </p>
          </FadeIn>
          <FadeIn delay={200}>
            <DataMoatFlow />
            <p className="text-xs mt-3" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('landing.dataMoatLoop')}</p>
          </FadeIn>
        </div>
      </section>

      {/* ─── Who It's For ─── */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <FolioBuilding className="h-10 w-10 mx-auto mb-3" style={{ color: 'hsl(var(--primary))' }} />
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-6" style={{ fontFamily: "'Newsreader', serif", color: 'hsl(var(--foreground))' }}>
              {t('landing.whoTitle')}
            </h2>
            <p className="text-base text-center max-w-3xl mx-auto mb-4 leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('landing.whoP1')}
            </p>
            <p className="text-sm text-center max-w-3xl mx-auto mb-16 leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('landing.whoP2')}
            </p>
          </FadeIn>
          <FadeIn delay={150}>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { t: t('landing.whoExpertise'), p: t('landing.whoExpertiseP'), icon: <FileSpreadsheet className="h-10 w-10" style={{ color: 'hsl(var(--primary))' }} /> },
                { t: t('landing.whoCabinet'), p: t('landing.whoCabinetP'), icon: <FolioScale className="h-10 w-10" style={{ color: 'hsl(var(--primary))' }} /> },
                { t: t('landing.whoConseil'), p: t('landing.whoConseilP'), icon: <FolioGlobe className="h-10 w-10" style={{ color: 'hsl(var(--primary))' }} /> },
              ].map((c) => (
                <div
                  key={c.t}
                  className="rounded-xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                  style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: 'hsl(var(--primary) / 0.1)' }}>
                    {c.icon}
                  </div>
                  <h3 className="text-base font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>{c.t}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>{c.p}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── Vision ─── */}
      <section id="vision" className="py-32 px-6" style={{ background: 'hsl(var(--secondary))' }}>
        <div className="max-w-3xl mx-auto text-center space-y-10">
          <FadeIn>
            <FolioZap className="h-16 w-16 mx-auto mb-4" style={{ color: 'hsl(var(--primary))' }} />
            <p className="text-3xl md:text-[2.5rem] font-light leading-snug" style={{ fontFamily: "'Newsreader', serif", color: 'hsl(var(--foreground))' }}>
              {t('landing.visionTitle')}
            </p>
          </FadeIn>
          <FadeIn delay={150}>
            <p className="text-lg leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('landing.visionP1')}</p>
            <p className="text-lg leading-relaxed mt-4" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('landing.visionP2')}</p>
          </FadeIn>
          <FadeIn delay={300}>
            <p className="text-xl font-semibold" style={{ fontFamily: "'Newsreader', serif", color: 'hsl(var(--foreground))' }}>{t('landing.visionP3')}</p>
          </FadeIn>
          <FadeIn delay={380}>
            <div className="flex items-center justify-center gap-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {[
                { icon: <FolioLink className="h-10 w-10" />, label: t('landing.visionConnected') },
                { icon: <FolioShield className="h-10 w-10" />, label: t('landing.visionVerified') },
                { icon: <FolioSparkles className="h-10 w-10" />, label: t('landing.visionNavigable') },
              ].map(({ icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  {icon}
                  <span className="text-[10px]">{label}</span>
                </div>
              ))}
            </div>
          </FadeIn>
          <FadeIn delay={450}>
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('landing.visionTagline')}</p>
          </FadeIn>
        </div>
      </section>

      {/* ─── Early Access ─── */}
      <section id="early-access" className="py-28 px-6">
        <div className="max-w-xl mx-auto text-center">
          <FadeIn>
            {demoSubmitted ? (
              <>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'hsl(var(--primary) / 0.1)' }}>
                  <Check className="w-12 h-12" style={{ color: 'hsl(var(--primary))' }} />
                </div>
                <h2 className="text-3xl font-semibold tracking-tight mb-4" style={{ fontFamily: "'Newsreader', serif", color: 'hsl(var(--foreground))' }}>{t('landing.earlyAccessDone')}</h2>
                <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('landing.earlyAccessDoneP')}</p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-semibold tracking-tight mb-6" style={{ fontFamily: "'Newsreader', serif", color: 'hsl(var(--foreground))' }}>
                  {t('landing.earlyAccessTitle')}
                </h2>
                <div className="flex gap-3 mt-6">
                  <input
                    type="email"
                    placeholder={t('landing.earlyAccessPlaceholder')}
                    className="input-organic flex-1 px-4 py-3 text-sm shadow-sm outline-none"
                    style={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <button
                    onClick={() => setDemoSubmitted(true)}
                    className="btn-organic px-6 py-3 font-medium transition-colors text-sm whitespace-nowrap"
                    style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                  >
                    {t('landing.earlyAccessSubmit')}
                  </button>
                </div>
                <p className="text-sm mt-4" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('landing.earlyAccessNote')}</p>
                <p className="text-xs mt-2" style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}>{t('landing.earlyAccessPrivacy')}</p>
              </>
            )}
          </FadeIn>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative border-t py-12 px-6" style={{ borderColor: 'hsl(var(--border))', background: 'linear-gradient(to bottom, hsl(220 20% 98%), hsl(220 25% 95%))' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="flex items-center gap-2.5">
              <img src={folioMark} alt="Folio" className="w-[54px] h-[54px]" />
              <span className="text-[38px]" style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, color: 'hsl(var(--foreground))' }}>folio</span>
            </div>
            <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('landing.footerTagline')}</p>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
            <a href="#product" className="transition-colors hover:text-foreground">{t('landing.product')}</a>
            <a href="#vision" className="transition-colors hover:text-foreground">{t('landing.vision')}</a>
            <span>{t('landing.footerPrivacy')}</span>
            <span>product@folio.ai</span>
          </div>
          <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground) / 0.4)' }}>{t('landing.footerCopyright')}</p>
        </div>
      </footer>
    </div>
  );
}
