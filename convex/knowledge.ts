import { query, mutation, internalMutation } from './_generated/server';
import { v } from 'convex/values';

const treeNodeDocValidator = v.object({
  _id: v.id('knowledge_tree'),
  _creationTime: v.number(),
  clientId: v.id('clients'),
  parentId: v.optional(v.id('knowledge_tree')),
  name: v.string(),
  type: v.union(v.literal('domain'), v.literal('skill'), v.literal('entry_group')),
  readme: v.optional(v.string()),
  order: v.number(),
});

const entryDocValidator = v.object({
  _id: v.id('knowledge_entries'),
  _creationTime: v.number(),
  clientId: v.id('clients'),
  treeNodeId: v.id('knowledge_tree'),
  title: v.string(),
  content: v.string(),
  sourceRef: v.optional(v.string()),
  confidence: v.number(),
  verified: v.boolean(),
});

export const createNode = internalMutation({
  args: {
    clientId: v.id('clients'),
    parentId: v.optional(v.id('knowledge_tree')),
    name: v.string(),
    type: v.union(v.literal('domain'), v.literal('skill'), v.literal('entry_group')),
    readme: v.optional(v.string()),
    order: v.number(),
  },
  returns: v.id('knowledge_tree'),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('knowledge_tree', {
      clientId: args.clientId,
      parentId: args.parentId,
      name: args.name,
      type: args.type,
      readme: args.readme,
      order: args.order,
    });
    return id;
  },
});

export const listChildren = query({
  args: {
    clientId: v.id('clients'),
    parentId: v.optional(v.id('knowledge_tree')),
  },
  returns: v.array(treeNodeDocValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('knowledge_tree')
      .withIndex('by_clientId_and_parentId', (q) =>
        q.eq('clientId', args.clientId).eq('parentId', args.parentId),
      )
      .collect();
  },
});

export const createEntry = internalMutation({
  args: {
    clientId: v.id('clients'),
    treeNodeId: v.id('knowledge_tree'),
    title: v.string(),
    content: v.string(),
    sourceRef: v.optional(v.string()),
    confidence: v.number(),
    verified: v.boolean(),
  },
  returns: v.id('knowledge_entries'),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('knowledge_entries', {
      clientId: args.clientId,
      treeNodeId: args.treeNodeId,
      title: args.title,
      content: args.content,
      sourceRef: args.sourceRef,
      confidence: args.confidence,
      verified: args.verified,
    });
    return id;
  },
});

export const listEntriesByNode = query({
  args: {
    treeNodeId: v.id('knowledge_tree'),
  },
  returns: v.array(entryDocValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('knowledge_entries')
      .withIndex('by_treeNodeId', (q) => q.eq('treeNodeId', args.treeNodeId))
      .collect();
  },
});

export const getTree = query({
  args: {
    clientId: v.id('clients'),
  },
  returns: v.array(treeNodeDocValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('knowledge_tree')
      .withIndex('by_clientId', (q) => q.eq('clientId', args.clientId))
      .collect();
  },
});
