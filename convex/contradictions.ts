import { query, mutation, internalMutation } from './_generated/server';
import { v } from 'convex/values';

export const add = internalMutation({
  args: {
    clientId: v.id('clients'),
    description: v.string(),
    sourceA: v.string(),
    sourceB: v.string(),
    valueA: v.string(),
    valueB: v.string(),
  },
  returns: v.id('contradictions'),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('contradictions', {
      clientId: args.clientId,
      description: args.description,
      sourceA: args.sourceA,
      sourceB: args.sourceB,
      valueA: args.valueA,
      valueB: args.valueB,
      status: 'open',
    });
    return id;
  },
});

export const resolve = mutation({
  args: {
    id: v.id('contradictions'),
    resolution: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: 'resolved' as const,
      resolution: args.resolution,
    });
    return null;
  },
});

export const dismiss = mutation({
  args: {
    id: v.id('contradictions'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: 'dismissed' as const,
    });
    return null;
  },
});

export const listByClient = query({
  args: {
    clientId: v.id('clients'),
  },
  returns: v.array(
    v.object({
      _id: v.id('contradictions'),
      _creationTime: v.number(),
      clientId: v.id('clients'),
      description: v.string(),
      sourceA: v.string(),
      sourceB: v.string(),
      valueA: v.string(),
      valueB: v.string(),
      status: v.union(v.literal('open'), v.literal('resolved'), v.literal('dismissed')),
      resolution: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('contradictions')
      .withIndex('by_clientId', (q) => q.eq('clientId', args.clientId))
      .collect();
  },
});

export const listOpenByClient = query({
  args: {
    clientId: v.id('clients'),
  },
  returns: v.array(
    v.object({
      _id: v.id('contradictions'),
      _creationTime: v.number(),
      clientId: v.id('clients'),
      description: v.string(),
      sourceA: v.string(),
      sourceB: v.string(),
      valueA: v.string(),
      valueB: v.string(),
      status: v.union(v.literal('open'), v.literal('resolved'), v.literal('dismissed')),
      resolution: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('contradictions')
      .withIndex('by_clientId_and_status', (q) => q.eq('clientId', args.clientId).eq('status', 'open'))
      .collect();
  },
});
