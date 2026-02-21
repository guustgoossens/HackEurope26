import { query, mutation, internalMutation } from './_generated/server';
import { v } from 'convex/values';

export const create = mutation({
  args: {
    name: v.string(),
    industry: v.string(),
    createdBy: v.string(),
  },
  returns: v.id('clients'),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('clients', {
      name: args.name,
      industry: args.industry,
      phase: 'onboard',
      createdBy: args.createdBy,
    });
    return id;
  },
});

export const get = query({
  args: {
    id: v.id('clients'),
  },
  returns: v.union(
    v.object({
      _id: v.id('clients'),
      _creationTime: v.number(),
      name: v.string(),
      industry: v.string(),
      phase: v.union(
        v.literal('onboard'),
        v.literal('explore'),
        v.literal('structure'),
        v.literal('verify'),
        v.literal('use'),
      ),
      createdBy: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const list = query({
  args: {
    createdBy: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id('clients'),
      _creationTime: v.number(),
      name: v.string(),
      industry: v.string(),
      phase: v.union(
        v.literal('onboard'),
        v.literal('explore'),
        v.literal('structure'),
        v.literal('verify'),
        v.literal('use'),
      ),
      createdBy: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('clients')
      .withIndex('by_createdBy', (q) => q.eq('createdBy', args.createdBy))
      .collect();
  },
});

export const updatePhase = mutation({
  args: {
    id: v.id('clients'),
    phase: v.union(
      v.literal('onboard'),
      v.literal('explore'),
      v.literal('structure'),
      v.literal('verify'),
      v.literal('use'),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { phase: args.phase });
    return null;
  },
});

export const internalUpdatePhase = internalMutation({
  args: {
    id: v.id('clients'),
    phase: v.union(
      v.literal('onboard'),
      v.literal('explore'),
      v.literal('structure'),
      v.literal('verify'),
      v.literal('use'),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { phase: args.phase });
    return null;
  },
});
