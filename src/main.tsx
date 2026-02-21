import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthKitProvider, useAuth } from '@workos-inc/authkit-react';
import { ConvexReactClient } from 'convex/react';
import { ConvexProvider } from 'convex/react';
import { ConvexProviderWithAuthKit } from './ConvexProviderWithAuthKit';
import './index.css';
import App from './App.tsx';
import GraphTest from './GraphTest.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
const devBypass = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

// Standalone graph test — no auth, no providers needed beyond its own ConvexProvider
if (window.location.pathname === '/graph-test') {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <GraphTest />
    </StrictMode>,
  );
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        {devBypass ? (
          <ConvexProvider client={convex}>
            <App devBypass />
          </ConvexProvider>
        ) : (
          <AuthKitProvider
            clientId={import.meta.env.VITE_WORKOS_CLIENT_ID}
            redirectUri={import.meta.env.VITE_WORKOS_REDIRECT_URI}
          >
            <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
              <App />
            </ConvexProviderWithAuthKit>
          </AuthKitProvider>
        )}
      </ErrorBoundary>
    </StrictMode>,
  );
}
