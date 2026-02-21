import { query, mutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

export const create = mutation({
  args: {
    clientId: v.id('clients'),
    type: v.union(v.literal('gmail'), v.literal('drive'), v.literal('sheets')),
    label: v.string(),
  },
  returns: v.id('data_sources'),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('data_sources', {
      clientId: args.clientId,
      type: args.type,
      label: args.label,
      connectionStatus: 'pending',
    });
    return id;
  },
});

export const listByClient = query({
  args: {
    clientId: v.id('clients'),
  },
  returns: v.array(
    v.object({
      _id: v.id('data_sources'),
      _creationTime: v.number(),
      clientId: v.id('clients'),
      type: v.union(v.literal('gmail'), v.literal('drive'), v.literal('sheets')),
      label: v.string(),
      connectionStatus: v.union(v.literal('pending'), v.literal('connected'), v.literal('error')),
      composioEntityId: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('data_sources')
      .withIndex('by_clientId', (q) => q.eq('clientId', args.clientId))
      .collect();
  },
});

export const internalListByClient = internalQuery({
  args: {
    clientId: v.id('clients'),
  },
  returns: v.array(
    v.object({
      _id: v.id('data_sources'),
      _creationTime: v.number(),
      clientId: v.id('clients'),
      type: v.union(v.literal('gmail'), v.literal('drive'), v.literal('sheets')),
      label: v.string(),
      connectionStatus: v.union(v.literal('pending'), v.literal('connected'), v.literal('error')),
      composioEntityId: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('data_sources')
      .withIndex('by_clientId', (q) => q.eq('clientId', args.clientId))
      .collect();
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id('data_sources'),
    connectionStatus: v.union(v.literal('pending'), v.literal('connected'), v.literal('error')),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { connectionStatus: args.connectionStatus });
    return null;
  },
});

export const updateConnection = mutation({
  args: {
    id: v.id('data_sources'),
    connectionStatus: v.union(v.literal('pending'), v.literal('connected'), v.literal('error')),
    composioEntityId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { connectionStatus: args.connectionStatus };
    if (args.composioEntityId !== undefined) {
      updates.composioEntityId = args.composioEntityId;
    }
    await ctx.db.patch(args.id, updates);
    return null;
  },
});
