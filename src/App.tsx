import { Authenticated, Unauthenticated } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { ClientDetail } from '@/pages/ClientDetail';
import { ForumPanel } from '@/components/ForumPanel';
import Landing from '@/pages/Landing';

type Page = { type: 'dashboard' } | { type: 'client'; clientId: string };

// DEV_BYPASS_USER is the fake user ID used when VITE_DEV_BYPASS_AUTH=true.
// Demo clients with createdBy matching this value will appear in the dashboard.
export const DEV_BYPASS_USER = 'test-check';

export default function App({ devBypass = false }: { devBypass?: boolean }) {
  const [page, setPage] = useState<Page>({ type: 'dashboard' });
  const [showForum, setShowForum] = useState(false);
  const { signIn, isLoading: authLoading } = useAuth();

  const handleSignIn = () => {
    if (authLoading) return;
    void signIn();
  };

  const appContent = (
    <Layout
      onNavigateHome={() => setPage({ type: 'dashboard' })}
      onToggleForum={() => setShowForum((v) => !v)}
      forumOpen={showForum}
    >
      {page.type === 'dashboard' && (
        <Dashboard
          onSelectClient={(id) => setPage({ type: 'client', clientId: id })}
          devBypassUser={devBypass ? DEV_BYPASS_USER : undefined}
        />
      )}
      {page.type === 'client' && (
        <ClientDetail clientId={page.clientId} onBack={() => setPage({ type: 'dashboard' })} />
      )}
    </Layout>
  );

  if (devBypass) {
    // Skip WorkOS auth entirely — render app directly
    return (
      <>
        {appContent}
        {showForum && <ForumPanel onClose={() => setShowForum(false)} />}
      </>
    );
  }

  return (
    <>
      <Authenticated>
        {appContent}
        {showForum && <ForumPanel onClose={() => setShowForum(false)} />}
      </Authenticated>
      <Unauthenticated>
        <Landing onSignIn={handleSignIn} authLoading={authLoading} />
      </Unauthenticated>
    </>
  );
}
