import { mutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Seed function to create demo knowledge base data for an accounting firm.
 * Run this once to populate the graph with realistic sample data.
 *
 * Usage: Call this mutation from the Convex dashboard with an orgId
 */
export const seedAccountingFirmKB = mutation({
  args: { orgId: v.id('organizations') },
  handler: async (ctx, args) => {
    // Root level nodes
    const financeRoot = await ctx.db.insert('knowledgeBaseNodes', {
      orgId: args.orgId,
      name: 'Finance',
      depth: 0,
      orderIndex: 0,
      status: 'verified',
      readme: 'Root node for all financial documents, processes, and accounting workflows.',
    });

    const clientsRoot = await ctx.db.insert('knowledgeBaseNodes', {
      orgId: args.orgId,
      name: 'Clients',
      depth: 0,
      orderIndex: 1,
      status: 'verified',
      readme: 'Client management, contracts, and communication records.',
    });

    const complianceRoot = await ctx.db.insert('knowledgeBaseNodes', {
      orgId: args.orgId,
      name: 'Compliance & Regulations',
      depth: 0,
      orderIndex: 2,
      status: 'verified',
      readme: 'Legal requirements, RGPD documentation, and regulatory compliance.',
    });

    // Level 1 - Finance children
    const invoices = await ctx.db.insert('knowledgeBaseNodes', {
      orgId: args.orgId,
      parentId: financeRoot,
      name: 'Invoices',
      depth: 1,
      orderIndex: 0,
      status: 'draft',
      readme: 'Client invoices, payment tracking, and billing history. Includes both sent and received invoices.',
    });

    const expenses = await ctx.db.insert('knowledgeBaseNodes', {
      orgId: args.orgId,
      parentId: financeRoot,
      name: 'Expenses',
      depth: 1,
      orderIndex: 1,
      status: 'draft',
      readme: 'Office expenses, subscriptions, and operational costs.',
    });

    const taxReturns = await ctx.db.insert('knowledgeBaseNodes', {
      orgId: args.orgId,
      parentId: financeRoot,
      name: 'Tax Returns',
      depth: 1,
      orderIndex: 2,
      status: 'verified',
      readme: 'Annual tax filings, quarterly reports, and tax optimization documentation.',
    });

    // Level 1 - Client children
    const contracts = await ctx.db.insert('knowledgeBaseNodes', {
      orgId: args.orgId,
      parentId: clientsRoot,
      name: 'Contracts',
      depth: 1,
      orderIndex: 0,
      status: 'verified',
      readme: 'Service agreements, engagement letters, and contractual terms.',
    });

    const correspondence = await ctx.db.insert('knowledgeBaseNodes', {
      orgId: args.orgId,
      parentId: clientsRoot,
      name: 'Email Correspondence',
      depth: 1,
      orderIndex: 1,
      status: 'draft',
      readme: 'Client communications, questions, and ongoing discussions.',
    });

    // Level 2 - deeper nodes
    const paymentTracking = await ctx.db.insert('knowledgeBaseNodes', {
      orgId: args.orgId,
      parentId: invoices,
      name: 'Payment Tracking',
      depth: 2,
      orderIndex: 0,
      status: 'draft',
      readme: 'Outstanding payments, payment schedules, and collection follow-ups.',
    });

    // Create relationships
    await ctx.db.insert('knowledgeBaseLinks', {
      orgId: args.orgId,
      sourceNodeId: financeRoot,
      targetNodeId: invoices,
      relationship: 'parent_of',
    });

    await ctx.db.insert('knowledgeBaseLinks', {
      orgId: args.orgId,
      sourceNodeId: financeRoot,
      targetNodeId: expenses,
      relationship: 'parent_of',
    });

    await ctx.db.insert('knowledgeBaseLinks', {
      orgId: args.orgId,
      sourceNodeId: financeRoot,
      targetNodeId: taxReturns,
      relationship: 'parent_of',
    });

    await ctx.db.insert('knowledgeBaseLinks', {
      orgId: args.orgId,
      sourceNodeId: clientsRoot,
      targetNodeId: contracts,
      relationship: 'parent_of',
    });

    await ctx.db.insert('knowledgeBaseLinks', {
      orgId: args.orgId,
      sourceNodeId: clientsRoot,
      targetNodeId: correspondence,
      relationship: 'parent_of',
    });

    await ctx.db.insert('knowledgeBaseLinks', {
      orgId: args.orgId,
      sourceNodeId: invoices,
      targetNodeId: paymentTracking,
      relationship: 'parent_of',
    });

    // Cross-references
    await ctx.db.insert('knowledgeBaseLinks', {
      orgId: args.orgId,
      sourceNodeId: taxReturns,
      targetNodeId: invoices,
      relationship: 'depends_on',
    });

    await ctx.db.insert('knowledgeBaseLinks', {
      orgId: args.orgId,
      sourceNodeId: taxReturns,
      targetNodeId: expenses,
      relationship: 'depends_on',
    });

    await ctx.db.insert('knowledgeBaseLinks', {
      orgId: args.orgId,
      sourceNodeId: contracts,
      targetNodeId: invoices,
      relationship: 'related_to',
    });

    await ctx.db.insert('knowledgeBaseLinks', {
      orgId: args.orgId,
      sourceNodeId: complianceRoot,
      targetNodeId: contracts,
      relationship: 'see_also',
    });

    return {
      message: 'Successfully seeded accounting firm knowledge base',
      nodesCreated: 9,
      linksCreated: 11,
    };
  },
});
