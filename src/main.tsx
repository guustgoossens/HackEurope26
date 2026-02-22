import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthKitProvider, useAuth } from '@workos-inc/authkit-react';
import { ConvexReactClient, ConvexProvider } from 'convex/react';
import { ConvexProviderWithAuthKit } from './ConvexProviderWithAuthKit';
import './index.css';
import App from './App.tsx';
import { DemoApp } from './DemoApp';
import { ErrorBoundary } from './ErrorBoundary.tsx';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!);

const demoSkipAuth = import.meta.env.VITE_DEMO_SKIP_AUTH === 'true';

function Root() {
  if (demoSkipAuth) {
    // No AuthKitProvider in demo: avoid blank screen from WorkOS loading/redirect behavior
    return (
      <ConvexProvider client={convex}>
        <div data-demo-mode className="min-h-screen min-w-full">
          <DemoApp />
        </div>
      </ConvexProvider>
    );
  }
  return (
    <AuthKitProvider
      clientId={import.meta.env.VITE_WORKOS_CLIENT_ID!}
      redirectUri={import.meta.env.VITE_WORKOS_REDIRECT_URI}
      onRedirectCallback={() => {
        if (window.location.pathname === '/callback') {
          window.history.replaceState({}, '', '/');
        }
      }}
    >
      <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithAuthKit>
    </AuthKitProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
);
