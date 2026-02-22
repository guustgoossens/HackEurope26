import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Id } from '../convex/_generated/dataModel';
import Landing from '@/pages/Landing';
import DemoIndex from '@/pages/DemoIndex';
import { ClientDetail } from '@/pages/ClientDetail';

const DEMO_NARRATIVE_PATH = '/demo/narrative';
const DASHBOARD_PATH = '/dashboard';
const OLD_DEMO_NAME = 'Cabinet Dupont & Associés';

/**
 * In demo mode (VITE_DEMO_SKIP_AUTH=true):
 * - / or "" → Landing (design marketing)
 * - /demo/narrative → Scripted animation
 * - /dashboard → Real pipeline view
 */
export function DemoApp() {
  const [path, setPath] = useState(() => {
    const p = window.location.pathname;
    if (p === '/demo') return DEMO_NARRATIVE_PATH;
    if (p.startsWith('/demo') || p === DASHBOARD_PATH) return p;
    return '/';
  });

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const goToNarrative = () => {
    window.history.pushState({}, '', DEMO_NARRATIVE_PATH);
    setPath(DEMO_NARRATIVE_PATH);
  };

  const goToDashboard = () => {
    window.history.pushState({}, '', DASHBOARD_PATH);
    setPath(DASHBOARD_PATH);
  };

  const goToLanding = () => {
    window.history.pushState({}, '', '/');
    setPath('/');
  };

  if (path === '/' || (!path.startsWith('/demo') && path !== DASHBOARD_PATH)) {
    return (
      <Landing
        onSignIn={goToNarrative}
        authLoading={false}
      />
    );
  }

  if (path === DASHBOARD_PATH) {
    return (
      <LivePipelineView
        onBack={goToLanding}
        onSwitchToNarrative={goToNarrative}
      />
    );
  }

  return (
    <NarrativeClientView
      onBack={goToLanding}
      onSwitchToLive={goToDashboard}
    />
  );
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
          name: 'Cabinet Dupont & Associés',
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
            className="text-xs px-3 py-1.5 btn-organic-secondary transition-colors disabled:opacity-50"
          >
            {resetting ? 'Réinitialisation…' : 'Réinitialiser'}
          </button>
          <button
            onClick={onSwitchToNarrative}
            className="text-xs text-white px-3 py-1.5 btn-organic transition-all duration-200"
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

// (DemoClientView removed, replaced by DemoApp routing directly inside there)
