import { Authenticated, Unauthenticated } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { ClientDetail } from '@/pages/ClientDetail';
import { ForumPanel } from '@/components/ForumPanel';

type Page = { type: 'dashboard' } | { type: 'client'; clientId: string };

export default function App() {
  const [page, setPage] = useState<Page>({ type: 'dashboard' });
  const [showForum, setShowForum] = useState(false);

  return (
    <>
      <Authenticated>
        <Layout
          onNavigateHome={() => setPage({ type: 'dashboard' })}
          onToggleForum={() => setShowForum((v) => !v)}
          forumOpen={showForum}
        >
          {page.type === 'dashboard' && (
            <Dashboard onSelectClient={(id) => setPage({ type: 'client', clientId: id })} />
          )}
          {page.type === 'client' && (
            <ClientDetail clientId={page.clientId} onBack={() => setPage({ type: 'dashboard' })} />
          )}
        </Layout>
        {showForum && <ForumPanel onClose={() => setShowForum(false)} />}
      </Authenticated>
      <Unauthenticated>
        <LandingPage />
      </Unauthenticated>
    </>
  );
}

function LandingPage() {
  const { signIn } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold text-white">HackEurope26</h1>
        <p className="text-xl text-slate-300">Make your company data AI-ready</p>
        <button
          onClick={() => void signIn()}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
