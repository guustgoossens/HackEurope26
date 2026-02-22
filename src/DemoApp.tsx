import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useEffect, useState, useRef } from 'react';
import type { Id } from '../convex/_generated/dataModel';
import Landing from '@/pages/Landing';
import DemoIndex from '@/pages/DemoIndex';

const DEMO_PATH = '/demo';
const OLD_DEMO_NAME = 'Cabinet Dupont & Associés';

/**
 * In demo mode (VITE_DEMO_SKIP_AUTH=true):
 * - / or "" → Landing (design marketing)
 * - /demo → DemoIndex (app démo branchée Convex avec design Lovable)
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

  // Landing first: / or ""
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

function DemoClientView({ onBack }: { onBack: () => void }) {
  const demoClient = useQuery(api.clients.getDemo);
  const createDemoClient = useMutation(api.demoData.createDemoClient);
  const insertDemoMessy = useMutation(api.demoData.insertDemoMessy);
  const clearDemo = useMutation(api.demoData.clearDemo);
  const updateDemoClient = useMutation(api.clients.updateDemoClient);
  const [reseedInProgress, setReseedInProgress] = useState(false);
  const reseedStarted = useRef(false);

  // Create demo when none exists
  useEffect(() => {
    if (demoClient === null && !reseedInProgress) {
      void (async () => {
        const { clientId } = await createDemoClient();
        await insertDemoMessy({ clientId });
      })();
    }
  }, [demoClient, createDemoClient, insertDemoMessy, reseedInProgress]);

  // Reseed when existing demo is the old minimal one (Cabinet Dupont)
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
        <div className="text-slate-400">Chargement de la démo…</div>
      </div>
    );
  }

  if (demoClient === null || reseedInProgress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">
          {reseedInProgress ? 'Mise à jour des données démo…' : 'Création des données démo…'}
        </div>
      </div>
    );
  }

  return <DemoIndex clientId={demoClient._id} onBack={onBack} />;
}
