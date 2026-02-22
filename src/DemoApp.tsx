import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Id } from '../convex/_generated/dataModel';
import Landing from '@/pages/Landing';
import DemoIndex from '@/pages/DemoIndex';
import { ClientDetail } from '@/pages/ClientDetail';

const DEMO_PATH = '/demo';
const OLD_DEMO_NAME = 'Cabinet Dupont & Associés';

/**
 * In demo mode (VITE_DEMO_SKIP_AUTH=true):
 * - / or "" → Landing (design marketing)
 * - /demo → DemoClientView (viewMode: 'live' → real pipeline, 'narrative' → scripted animation)
 * No WorkOS; "Voir la démo" envoie vers /demo.
 */
export function DemoApp() {
  const [path, setPath] = useState(() =>
    window.location.pathname === DEMO_PATH ? DEMO_PATH : '/',
  );
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const goToDemo = () => {
    window.history.pushState({}, '', DEMO_PATH);
    setPath(DEMO_PATH);
  };

  const goToLanding = () => {
    window.history.pushState({}, '', '/');
    setPath('/');
  };

  if (path !== DEMO_PATH) {
    return (
      <Landing
        onSignIn={goToDemo}
        authLoading={false}
      />
    );
  }

  return <DemoClientView onBack={goToLanding} />;
}

// ─── Scripted narrative demo (existing) ───────────────────────────────────────

function NarrativeClientView({ onBack, onSwitchToLive }: { onBack: () => void; onSwitchToLive: () => void }) {
  const { t } = useTranslation();
  const demoClient = useQuery(api.clients.getDemo);
  const createDemoClient = useMutation(api.demoData.createDemoClient);
  const insertDemoMessy = useMutation(api.demoData.insertDemoMessy);
  const clearDemo = useMutation(api.demoData.clearDemo);
  const updateDemoClient = useMutation(api.clients.updateDemoClient);
  const [reseedInProgress, setReseedInProgress] = useState(false);
  const reseedStarted = useRef(false);

  useEffect(() => {
    if (demoClient === null && !reseedInProgress) {
      void (async () => {
        const { clientId } = await createDemoClient();
        await insertDemoMessy({ clientId });
      })();
    }
  }, [demoClient, createDemoClient, insertDemoMessy, reseedInProgress]);

  useEffect(() => {
    if (
      demoClient != null &&
      demoClient.name === OLD_DEMO_NAME &&
      !reseedStarted.current
    ) {
      reseedStarted.current = true;
      setReseedInProgress(true);
      const clientId = demoClient._id as Id<'clients'>;
      void (async () => {
        await clearDemo({ clientId });
        await updateDemoClient({
          id: clientId,
          name: 'Hartley & Associates LLP',
          industry: 'Accountancy',
          phase: 'explore',
        });
        await insertDemoMessy({ clientId });
        setReseedInProgress(false);
      })();
    }
  }, [demoClient, clearDemo, updateDemoClient, insertDemoMessy]);

  if (demoClient === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">{t('demo.loading')}</div>
      </div>
    );
  }

  if (demoClient === null || reseedInProgress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">
          {reseedInProgress ? t('demo.updating') : t('demo.creating')}
        </div>
      </div>
    );
  }

  return (
    <DemoIndex
      clientId={demoClient._id}
      onBack={onBack}
      onSwitchToLive={onSwitchToLive}
    />
  );
}

// ─── Live pipeline view (real agent) ─────────────────────────────────────────

function LivePipelineView({ onBack, onSwitchToNarrative }: { onBack: () => void; onSwitchToNarrative: () => void }) {
  const liveClient = useQuery(api.demoData.getLiveClient);
  const createLiveClient = useMutation(api.demoData.createLiveClient);
  const resetLiveClient = useMutation(api.demoData.resetLiveClient);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (liveClient === null) void createLiveClient();
  }, [liveClient, createLiveClient]);

  if (liveClient === undefined || liveClient === null) {
    return (
      <div
        className="landing min-h-screen flex items-center justify-center"
        style={{ background: 'hsl(220 20% 98%)' }}
      >
        <div className="text-sm" style={{ color: 'hsl(217 20% 55%)' }}>
          Initialisation du pipeline…
        </div>
      </div>
    );
  }

  const handleReset = async () => {
    setResetting(true);
    await resetLiveClient({ clientId: liveClient._id });
    setResetting(false);
  };

  return (
    <div className="landing min-h-screen flex flex-col" style={{ background: 'hsl(220 20% 98%)' }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{
          borderBottom: '1px solid hsl(217 20% 91%)',
          background: 'hsl(0 0% 100%)',
        }}
      >
        <button
          onClick={onBack}
          className="text-sm flex items-center gap-1.5 transition-colors"
          style={{ color: 'hsl(217 20% 55%)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'hsl(217 20% 20%)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'hsl(217 20% 55%)')}
        >
          ← Accueil
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void handleReset()}
            disabled={resetting}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            style={{
              border: '1px solid hsl(217 20% 88%)',
              color: 'hsl(217 20% 50%)',
            }}
          >
            {resetting ? 'Réinitialisation…' : 'Réinitialiser'}
          </button>
          <button
            onClick={onSwitchToNarrative}
            className="text-xs text-white px-3 py-1.5 rounded-lg transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, hsl(217 65% 52%), hsl(217 75% 43%))',
              boxShadow: '0 1px 4px hsl(217 60% 50% / 0.3)',
            }}
          >
            Voir la démo narrative →
          </button>
        </div>
      </div>

      {/* Full pipeline UI */}
      <div className="flex-1 overflow-auto">
        <ClientDetail clientId={liveClient._id} onBack={onBack} />
      </div>
    </div>
  );
}

// ─── Router: picks narrative or live ─────────────────────────────────────────

function DemoClientView({ onBack }: { onBack: () => void }) {
  const [viewMode, setViewMode] = useState<'narrative' | 'live'>('live');

  if (viewMode === 'live') {
    return (
      <LivePipelineView
        onBack={onBack}
        onSwitchToNarrative={() => setViewMode('narrative')}
      />
    );
  }

  return (
    <NarrativeClientView
      onBack={onBack}
      onSwitchToLive={() => setViewMode('live')}
    />
  );
}
