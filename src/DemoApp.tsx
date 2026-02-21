import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useEffect, useState } from 'react';
import Landing from '@/pages/Landing';
import DemoIndex from '@/pages/DemoIndex';

const DEMO_PATH = '/demo';

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
  const createDemo = useMutation(api.clients.createDemo);

  useEffect(() => {
    if (demoClient === null) {
      void createDemo();
    }
  }, [demoClient, createDemo]);

  if (demoClient === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Chargement de la démo…</div>
      </div>
    );
  }

  if (demoClient === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Création des données démo…</div>
      </div>
    );
  }

  return <DemoIndex clientId={demoClient._id} onBack={onBack} />;
}
