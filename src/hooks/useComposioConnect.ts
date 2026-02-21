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
    async (sourceType: 'gmail' | 'drive' | 'sheets') => {
      setConnecting(sourceType);
      try {
        // Create the data source record first
        const sourceId = await createDataSource({
          clientId,
          type: sourceType,
          label: `${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} Connection`,
        });

        const redirectUrl = window.location.href;

        // Initiate Composio OAuth
        const result = await initiateConnection({
          clientId,
          sourceType,
          redirectUrl,
        });

        if (result.redirectUrl) {
          // Open OAuth popup
          const popup = window.open(result.redirectUrl, 'composio-oauth', 'width=600,height=700,popup=1');

          // Poll for popup close
          const pollInterval = setInterval(async () => {
            if (!popup || popup.closed) {
              clearInterval(pollInterval);
              // Optimistically mark as connected
              await updateConnection({
                id: sourceId,
                connectionStatus: 'connected',
                composioEntityId: result.entityId,
              });
              setConnecting(null);
              onSuccess?.();
            }
          }, 1000);

          // Timeout after 5 minutes
          setTimeout(() => {
            clearInterval(pollInterval);
            if (connecting) {
              setConnecting(null);
            }
          }, 300000);
        } else {
          // No redirect URL — direct connection (unlikely but handle gracefully)
          await updateConnection({
            id: sourceId,
            connectionStatus: 'connected',
            composioEntityId: result.entityId,
          });
          setConnecting(null);
          onSuccess?.();
        }
      } catch (e) {
        setConnecting(null);
        const message = e instanceof Error ? e.message : String(e);
        onError?.(message);
      }
    },
    [clientId, connecting, createDataSource, initiateConnection, updateConnection, onSuccess, onError],
  );

  return { connect, connecting };
}
