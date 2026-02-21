import { query, mutation, internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

const forumEntryDocValidator = v.object({
  _id: v.id('forum_entries'),
  _creationTime: v.number(),
  title: v.string(),
  category: v.string(),
  content: v.string(),
  authorAgent: v.string(),
  tags: v.array(v.string()),
  upvotes: v.number(),
  sourceType: v.optional(v.string()),
  phase: v.optional(v.string()),
  fileType: v.optional(v.string()),
});

export const search = internalQuery({
  args: {
    query: v.string(),
    sourceType: v.optional(v.string()),
    phase: v.optional(v.string()),
    fileType: v.optional(v.string()),
  },
  returns: v.array(forumEntryDocValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('forum_entries')
      .withSearchIndex('search_content', (q) => {
        let query = q.search('content', args.query);
        if (args.sourceType !== undefined) query = query.eq('sourceType', args.sourceType);
        if (args.phase !== undefined) query = query.eq('phase', args.phase);
        if (args.fileType !== undefined) query = query.eq('fileType', args.fileType);
        return query;
      })
      .take(20);
  },
});

export const create = internalMutation({
  args: {
    title: v.string(),
    category: v.string(),
    content: v.string(),
    authorAgent: v.string(),
    tags: v.array(v.string()),
    sourceType: v.optional(v.string()),
    phase: v.optional(v.string()),
    fileType: v.optional(v.string()),
  },
  returns: v.id('forum_entries'),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('forum_entries', {
      title: args.title,
      category: args.category,
      content: args.content,
      authorAgent: args.authorAgent,
      tags: args.tags,
      upvotes: 0,
      ...(args.sourceType !== undefined && { sourceType: args.sourceType }),
      ...(args.phase !== undefined && { phase: args.phase }),
      ...(args.fileType !== undefined && { fileType: args.fileType }),
    });
    return id;
  },
});

export const list = query({
  args: {},
  returns: v.array(forumEntryDocValidator),
  handler: async (ctx) => {
    return await ctx.db.query('forum_entries').order('desc').take(50);
  },
});

export const publicSearch = query({
  args: {
    query: v.string(),
    sourceType: v.optional(v.string()),
    phase: v.optional(v.string()),
    fileType: v.optional(v.string()),
  },
  returns: v.array(forumEntryDocValidator),
  handler: async (ctx, args) => {
    if (!args.query.trim()) {
      return await ctx.db.query('forum_entries').order('desc').take(50);
    }
    return await ctx.db
      .query('forum_entries')
      .withSearchIndex('search_content', (q) => {
        let query = q.search('content', args.query);
        if (args.sourceType !== undefined) query = query.eq('sourceType', args.sourceType);
        if (args.phase !== undefined) query = query.eq('phase', args.phase);
        if (args.fileType !== undefined) query = query.eq('fileType', args.fileType);
        return query;
      })
      .take(20);
  },
});

export const update = mutation({
  args: {
    id: v.id('forum_entries'),
    title: v.optional(v.string()),
    category: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    upvotes: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const updates: Record<string, unknown> = {};
    if (fields.title !== undefined) updates.title = fields.title;
    if (fields.category !== undefined) updates.category = fields.category;
    if (fields.content !== undefined) updates.content = fields.content;
    if (fields.tags !== undefined) updates.tags = fields.tags;
    if (fields.upvotes !== undefined) updates.upvotes = fields.upvotes;
    await ctx.db.patch(id, updates);
    return null;
  },
});
