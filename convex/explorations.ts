import { query, internalMutation } from './_generated/server';
import { v } from 'convex/values';

export const upsert = internalMutation({
  args: {
    clientId: v.id('clients'),
    dataSourceId: v.id('data_sources'),
    metrics: v.any(),
    status: v.union(v.literal('running'), v.literal('completed'), v.literal('failed')),
  },
  returns: v.id('explorations'),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('explorations')
      .withIndex('by_clientId_and_dataSourceId', (q) =>
        q.eq('clientId', args.clientId).eq('dataSourceId', args.dataSourceId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        metrics: args.metrics,
        status: args.status,
      });
      return existing._id;
    }

    const id = await ctx.db.insert('explorations', {
      clientId: args.clientId,
      dataSourceId: args.dataSourceId,
      metrics: args.metrics,
      status: args.status,
    });
    return id;
  },
});

export const getBySource = query({
  args: {
    clientId: v.id('clients'),
    dataSourceId: v.id('data_sources'),
  },
  returns: v.union(
    v.object({
      _id: v.id('explorations'),
      _creationTime: v.number(),
      clientId: v.id('clients'),
      dataSourceId: v.id('data_sources'),
      metrics: v.any(),
      status: v.union(v.literal('running'), v.literal('completed'), v.literal('failed')),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('explorations')
      .withIndex('by_clientId_and_dataSourceId', (q) =>
        q.eq('clientId', args.clientId).eq('dataSourceId', args.dataSourceId),
      )
      .first();
  },
});
