import { query, internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';

const pipelineDocValidator = v.object({
  _id: v.id('pipeline_status'),
  _creationTime: v.number(),
  clientId: v.id('clients'),
  currentPhase: v.union(
    v.literal('explore'),
    v.literal('structure'),
    v.literal('verify'),
    v.literal('use'),
  ),
  phaseProgress: v.number(),
  activeAgents: v.array(v.string()),
  lastActivity: v.number(),
});

export const get = internalQuery({
  args: {
    clientId: v.id('clients'),
  },
  returns: v.union(pipelineDocValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('pipeline_status')
      .withIndex('by_clientId', (q) => q.eq('clientId', args.clientId))
      .first();
  },
});

export const getByClient = query({
  args: {
    clientId: v.id('clients'),
  },
  returns: v.union(pipelineDocValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('pipeline_status')
      .withIndex('by_clientId', (q) => q.eq('clientId', args.clientId))
      .first();
  },
});

export const update = internalMutation({
  args: {
    clientId: v.id('clients'),
    currentPhase: v.union(
      v.literal('explore'),
      v.literal('structure'),
      v.literal('verify'),
      v.literal('use'),
    ),
    phaseProgress: v.number(),
    activeAgents: v.array(v.string()),
    lastActivity: v.optional(v.number()),
  },
  returns: v.id('pipeline_status'),
  handler: async (ctx, args) => {
    const now = args.lastActivity ?? Date.now();
    const existing = await ctx.db
      .query('pipeline_status')
      .withIndex('by_clientId', (q) => q.eq('clientId', args.clientId))
      .first();

    let id: Id<'pipeline_status'>;
    if (existing) {
      await ctx.db.patch(existing._id, {
        currentPhase: args.currentPhase,
        phaseProgress: args.phaseProgress,
        activeAgents: args.activeAgents,
        lastActivity: now,
      });
      id = existing._id;
    } else {
      id = await ctx.db.insert('pipeline_status', {
        clientId: args.clientId,
        currentPhase: args.currentPhase,
        phaseProgress: args.phaseProgress,
        activeAgents: args.activeAgents,
        lastActivity: now,
      });
    }

    // Atomically sync client phase so the UI renders the correct panel
    await ctx.db.patch(args.clientId, { phase: args.currentPhase });

    return id;
  },
});
