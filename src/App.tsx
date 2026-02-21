import { Authenticated, Unauthenticated } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { ClientDetail } from '@/pages/ClientDetail';
import { ForumPanel } from '@/components/ForumPanel';
import Landing from '@/pages/Landing';

type Page = { type: 'dashboard' } | { type: 'client'; clientId: string };

export default function App() {
  const [page, setPage] = useState<Page>({ type: 'dashboard' });
  const [showForum, setShowForum] = useState(false);
  const { signIn, isLoading: authLoading } = useAuth();

  const handleSignIn = () => {
    if (authLoading) return;
    void signIn();
  };

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
        <Landing onSignIn={handleSignIn} authLoading={authLoading} />
      </Unauthenticated>
    </>
  );
}
