import { useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState, useCallback } from 'react';
import type { Id } from '../../convex/_generated/dataModel';

interface UseComposioConnectOptions {
  clientId: Id<'clients'>;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useComposioConnect({ clientId, onSuccess, onError }: UseComposioConnectOptions) {
  const [connecting, setConnecting] = useState<string | null>(null);
  const initiateConnection = useAction(api.composio.initiateConnection);
  const createDataSource = useMutation(api.dataSources.create);
  const updateConnection = useMutation(api.dataSources.updateConnection);

  const connect = useCallback(
    async (sourceType: 'gmail' | 'drive' | 'sheets', label?: string) => {
      console.log('[composio] connect called:', sourceType, label);
      setConnecting(sourceType);
      let sourceId: Id<'data_sources'> | null = null;

      // Open popup immediately on user click — browsers block popups after async delays
      const popup = window.open('about:blank', 'composio-oauth', 'width=600,height=700,popup=1');
      console.log('[composio] popup opened:', !!popup, popup);

      try {
        sourceId = await createDataSource({
          clientId,
          type: sourceType,
          label: label || `${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} Connection`,
        });
        console.log('[composio] data source created:', sourceId);

        const redirectUrl = window.location.href;

        const result = await initiateConnection({
          clientId,
          sourceType,
          redirectUrl,
        });
        console.log('[composio] initiateConnection result:', result);

        if (result.redirectUrl && popup) {
          console.log('[composio] navigating popup to:', result.redirectUrl);
          popup.location.href = result.redirectUrl;

          const pollInterval = setInterval(async () => {
            const closed = popup.closed;
            console.log('[composio] polling popup.closed:', closed);
            if (closed) {
              clearInterval(pollInterval);
              console.log('[composio] popup closed, updating connection to connected');
              await updateConnection({
                id: sourceId!,
                connectionStatus: 'connected',
                composioEntityId: result.userId,
              });
              setConnecting(null);
              onSuccess?.();
            }
          }, 1000);

          setTimeout(() => {
            clearInterval(pollInterval);
            setConnecting(null);
          }, 300000);
        } else {
          console.log('[composio] no redirectUrl or no popup:', { redirectUrl: result.redirectUrl, popup: !!popup });
          popup?.close();
          if (sourceId) {
            await updateConnection({ id: sourceId, connectionStatus: 'error' });
          }
          setConnecting(null);
          onError?.(popup ? 'No redirect URL received from Composio' : 'Popup was blocked by the browser.');
        }
      } catch (e) {
        console.error('[composio] error:', e);
        popup?.close();
        if (sourceId) {
          await updateConnection({ id: sourceId, connectionStatus: 'error' }).catch(() => {});
        }
        setConnecting(null);
        const message = e instanceof Error ? e.message : String(e);
        onError?.(message);
      }
    },
    [clientId, createDataSource, initiateConnection, updateConnection, onSuccess, onError],
  );

  return { connect, connecting };
}
