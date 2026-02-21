"use node";

import { action } from './_generated/server';
import { v } from 'convex/values';

const COMPOSIO_TOOLKIT_MAP: Record<string, string> = {
  gmail: 'gmail',
  drive: 'googledrive',
  sheets: 'googlesheets',
};

export const initiateConnection = action({
  args: {
    clientId: v.id('clients'),
    sourceType: v.union(v.literal('gmail'), v.literal('drive'), v.literal('sheets')),
    redirectUrl: v.string(),
  },
  returns: v.object({
    redirectUrl: v.string(),
    entityId: v.string(),
  }),
  handler: async (_ctx, args) => {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new Error('COMPOSIO_API_KEY not configured');
    }

    const toolkit = COMPOSIO_TOOLKIT_MAP[args.sourceType];
    const entityId = `hackeurope26_${args.clientId}`;

    // Call Composio REST API to initiate OAuth connection
    const response = await fetch('https://backend.composio.dev/api/v1/connectedAccounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        integrationId: toolkit,
        entityId,
        redirectUri: args.redirectUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Composio connection failed: ${errorText}`);
    }

    const result = await response.json();

    return {
      redirectUrl: result.redirectUrl ?? result.connectionUrl ?? '',
      entityId,
    };
  },
});
