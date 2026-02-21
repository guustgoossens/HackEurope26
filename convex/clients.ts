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

/** Returns the demo client (createdBy === "demo") for unauthenticated demo mode. */
export const getDemo = query({
  args: {},
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
  handler: async (ctx) => {
    return await ctx.db
      .query('clients')
      .withIndex('by_createdBy', (q) => q.eq('createdBy', 'demo'))
      .first();
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

/** Creates demo client + minimal data for unauthenticated demo mode. */
export const createDemo = mutation({
  args: {},
  returns: v.id('clients'),
  handler: async (ctx) => {
    const existing = await ctx.db
      .query('clients')
      .withIndex('by_createdBy', (q) => q.eq('createdBy', 'demo'))
      .first();
    if (existing) return existing._id;

    const clientId = await ctx.db.insert('clients', {
      name: 'Cabinet Dupont & Associés',
      industry: 'Accounting',
      phase: 'structure',
      createdBy: 'demo',
    });

    const gmailId = await ctx.db.insert('data_sources', {
      clientId,
      type: 'gmail',
      label: 'Company Inbox',
      connectionStatus: 'connected',
    });
    const driveId = await ctx.db.insert('data_sources', {
      clientId,
      type: 'drive',
      label: 'Shared Drive',
      connectionStatus: 'connected',
    });
    await ctx.db.insert('data_sources', {
      clientId,
      type: 'sheets',
      label: 'Financial Reports',
      connectionStatus: 'connected',
    });

    await ctx.db.insert('explorations', {
      clientId,
      dataSourceId: gmailId,
      metrics: { email_count: 247, file_count: 12 },
      status: 'completed',
    });
    await ctx.db.insert('explorations', {
      clientId,
      dataSourceId: driveId,
      metrics: { file_count: 89 },
      status: 'completed',
    });

    const domainId = await ctx.db.insert('knowledge_tree', {
      clientId,
      name: 'Financial Operations',
      type: 'domain',
      readme: 'Core financial processes and data.',
      order: 0,
    });
    const skillId = await ctx.db.insert('knowledge_tree', {
      clientId,
      parentId: domainId,
      name: 'Tax Compliance',
      type: 'skill',
      readme: 'Tax filing and regulatory compliance.',
      order: 0,
    });
    await ctx.db.insert('knowledge_tree', {
      clientId,
      parentId: skillId,
      name: 'VAT Returns',
      type: 'entry_group',
      readme: 'Quarterly VAT return processes.',
      order: 0,
    });
    await ctx.db.insert('knowledge_tree', {
      clientId,
      name: 'Client Management',
      type: 'domain',
      readme: 'Client relationships and onboarding.',
      order: 1,
    });

    await ctx.db.insert('agent_events', {
      clientId,
      agentName: 'master',
      eventType: 'info',
      message: 'Starting structure phase',
    });
    await ctx.db.insert('agent_events', {
      clientId,
      agentName: 'structurer',
      eventType: 'complete',
      message: 'Knowledge tree created with 6 nodes',
    });

    await ctx.db.insert('questionnaires', {
      clientId,
      title: 'Data Verification - Cabinet Dupont',
      questions: [
        { id: 'q1', text: 'Standard payment terms for clients?', options: ['Net 30 days', 'Net 45 days', 'Both'] },
        { id: 'q2', text: 'Which accounting software for VAT?', options: ['Xero', 'QuickBooks', 'Sage'] },
      ],
      status: 'sent',
    });

    return clientId;
  },
});
