"use node";

import { action } from './_generated/server';
import { v } from 'convex/values';
import { Composio } from '@composio/core';

const AUTH_CONFIG_ENV_MAP: Record<string, string> = {
  gmail: 'COMPOSIO_GMAIL_AUTH_CONFIG_ID',
  drive: 'COMPOSIO_DRIVE_AUTH_CONFIG_ID',
  sheets: 'COMPOSIO_SHEETS_AUTH_CONFIG_ID',
};

export const initiateConnection = action({
  args: {
    clientId: v.id('clients'),
    sourceType: v.union(v.literal('gmail'), v.literal('drive'), v.literal('sheets')),
    redirectUrl: v.string(),
  },
  returns: v.object({
    redirectUrl: v.string(),
    userId: v.string(),
  }),
  handler: async (_ctx, args) => {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new Error('COMPOSIO_API_KEY not configured. Set it in the Convex dashboard.');
    }

    const envVar = AUTH_CONFIG_ENV_MAP[args.sourceType];
    const authConfigId = process.env[envVar];
    if (!authConfigId) {
      throw new Error(`${envVar} not configured. Set it in the Convex dashboard.`);
    }

    const composio = new Composio({ apiKey });
    const userId = `hackeurope26_${args.clientId}`;

    const connectionRequest = await composio.connectedAccounts.initiate(userId, authConfigId, {
      callbackUrl: args.redirectUrl,
      allowMultiple: true,
    });

    console.log('Composio connectionRequest:', JSON.stringify(connectionRequest.toJSON()));

    const redirectUrl = connectionRequest.redirectUrl;
    if (!redirectUrl) {
      throw new Error(`Composio returned no redirect URL. Status: ${connectionRequest.status}, ID: ${connectionRequest.id}`);
    }

    return {
      redirectUrl,
      userId,
    };
  },
});
