import { query, internalMutation } from './_generated/server';
import { v } from 'convex/values';

export const emit = internalMutation({
  args: {
    clientId: v.id('clients'),
    agentName: v.string(),
    eventType: v.union(
      v.literal('info'),
      v.literal('progress'),
      v.literal('warning'),
      v.literal('error'),
      v.literal('complete'),
    ),
    message: v.string(),
    metadata: v.optional(v.any()),
  },
  returns: v.id('agent_events'),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('agent_events', {
      clientId: args.clientId,
      agentName: args.agentName,
      eventType: args.eventType,
      message: args.message,
      metadata: args.metadata,
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
      _id: v.id('agent_events'),
      _creationTime: v.number(),
      clientId: v.id('clients'),
      agentName: v.string(),
      eventType: v.union(
        v.literal('info'),
        v.literal('progress'),
        v.literal('warning'),
        v.literal('error'),
        v.literal('complete'),
      ),
      message: v.string(),
      metadata: v.optional(v.any()),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('agent_events')
      .withIndex('by_clientId', (q) => q.eq('clientId', args.clientId))
      .order('desc')
      .take(50);
  },
});
