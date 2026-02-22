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
    return (
      <ConvexProvider client={convex}>
        <AuthKitProvider
          clientId={import.meta.env.VITE_WORKOS_CLIENT_ID ?? ''}
          redirectUri={import.meta.env.VITE_WORKOS_REDIRECT_URI ?? 'http://localhost:5173/callback'}
        >
          <DemoApp />
        </AuthKitProvider>
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
