"use node";

import { action } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';

export const start = action({
  args: {
    clientId: v.id('clients'),
  },
  returns: v.object({
    status: v.string(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const serverUrl = process.env.AGENT_SERVER_URL ?? 'http://localhost:8000';
    const authToken = process.env.AGENT_AUTH_TOKEN ?? '';

    // Update client phase to 'explore' first
    await ctx.runMutation(internal.clients.internalUpdatePhase, {
      id: args.clientId,
      phase: 'explore',
    });

    // Call the Python agent server
    try {
      const response = await fetch(`${serverUrl}/api/pipeline/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: args.clientId,
          auth_token: authToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { status: 'error', message: `Agent server error: ${errorText}` };
      }

      const result = await response.json();
      return { status: result.status ?? 'started', message: result.message ?? 'Pipeline started' };
    } catch (e) {
      return {
        status: 'error',
        message: `Failed to connect to agent server at ${serverUrl}: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  },
});
