import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

export const seedDemoData = internalMutation({
  args: {
    createdBy: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Create demo client
    const clientId = await ctx.db.insert('clients', {
      name: 'Acme Accounting',
      industry: 'Accounting',
      phase: 'verify',
      createdBy: args.createdBy,
    });

    // Data sources
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

    // Explorations
    await ctx.db.insert('explorations', {
      clientId,
      dataSourceId: gmailId,
      metrics: { email_count: 247, summary: 'Found 247 emails with financial attachments' },
      status: 'completed',
    });
    await ctx.db.insert('explorations', {
      clientId,
      dataSourceId: driveId,
      metrics: { file_count: 89, folder_structure: '3 top-level folders: Clients, Internal, Templates' },
      status: 'completed',
    });

    // Knowledge tree
    const financeDomain = await ctx.db.insert('knowledge_tree', {
      clientId,
      name: 'Financial Operations',
      type: 'domain',
      readme: 'Core financial processes and data',
      order: 0,
    });
    const taxSkill = await ctx.db.insert('knowledge_tree', {
      clientId,
      parentId: financeDomain,
      name: 'Tax Compliance',
      type: 'skill',
      readme: 'Tax filing and regulatory compliance',
      order: 0,
    });
    const taxEntries = await ctx.db.insert('knowledge_tree', {
      clientId,
      parentId: taxSkill,
      name: 'VAT Returns',
      type: 'entry_group',
      readme: 'Quarterly VAT return processes',
      order: 0,
    });
    const invoicingSkill = await ctx.db.insert('knowledge_tree', {
      clientId,
      parentId: financeDomain,
      name: 'Invoicing',
      type: 'skill',
      readme: 'Invoice processing and management',
      order: 1,
    });
    const clientDomain = await ctx.db.insert('knowledge_tree', {
      clientId,
      name: 'Client Management',
      type: 'domain',
      readme: 'Client relationships and onboarding',
      order: 1,
    });
    await ctx.db.insert('knowledge_tree', {
      clientId,
      parentId: clientDomain,
      name: 'Client Onboarding',
      type: 'skill',
      readme: 'New client onboarding procedures',
      order: 0,
    });

    // Knowledge entries
    await ctx.db.insert('knowledge_entries', {
      clientId,
      treeNodeId: taxEntries,
      title: 'Quarterly VAT Filing Process',
      content:
        'VAT returns are filed quarterly using the standard HMRC portal. Deadline is one month and seven days after the end of each VAT quarter. Current filing method: MTD-compliant software submission.',
      sourceRef: 'Email: tax-returns@acme.co / Drive: Templates/VAT-Return-Template.xlsx',
      confidence: 0.92,
      verified: true,
    });
    await ctx.db.insert('knowledge_entries', {
      clientId,
      treeNodeId: taxEntries,
      title: 'VAT Rate Application',
      content:
        'Standard rate: 20%. Reduced rate (5%) applied for energy-saving materials. Zero-rated items include most food and children\'s clothing. Exempt supplies: insurance, education, health services.',
      sourceRef: 'Drive: Internal/Tax-Rates-2025.pdf',
      confidence: 0.88,
      verified: false,
    });
    await ctx.db.insert('knowledge_entries', {
      clientId,
      treeNodeId: invoicingSkill,
      title: 'Invoice Numbering Convention',
      content:
        'Format: INV-{YEAR}-{SEQ} (e.g., INV-2026-00142). Sequential numbering resets annually. Credit notes use CN- prefix.',
      sourceRef: 'Sheet: Financial Reports / Invoice Log',
      confidence: 0.95,
      verified: true,
    });

    // Contradictions
    const c1 = await ctx.db.insert('contradictions', {
      clientId,
      description: 'Conflicting payment terms found between client contracts and invoice templates',
      sourceA: 'Drive: Templates/Standard-Contract.docx',
      sourceB: 'Sheet: Invoice Log / Terms column',
      valueA: 'Net 30 days',
      valueB: 'Net 45 days',
      status: 'open',
    });
    const c2 = await ctx.db.insert('contradictions', {
      clientId,
      description: 'Different VAT registration numbers in different documents',
      sourceA: 'Email: HMRC confirmation (Jan 2025)',
      sourceB: 'Drive: Internal/Company-Details.pdf',
      valueA: 'GB 123 456 789',
      valueB: 'GB 123 456 780',
      status: 'open',
    });
    await ctx.db.insert('contradictions', {
      clientId,
      description: 'Inconsistent fiscal year end date',
      sourceA: 'Email: Accountant correspondence',
      sourceB: 'Sheet: Annual Summary',
      valueA: '31 March',
      valueB: '5 April',
      status: 'resolved',
      resolution: 'Fiscal year end is 31 March (company year), 5 April is the tax year end.',
    });

    // Questionnaire
    await ctx.db.insert('questionnaires', {
      clientId,
      title: 'Data Verification - Acme Accounting',
      questions: [
        {
          id: 'q1',
          text: 'What are the standard payment terms for Acme Accounting clients?',
          options: ['Net 30 days', 'Net 45 days', 'Both are used for different client tiers', "I don't know"],
          contradictionId: c1,
        },
        {
          id: 'q2',
          text: 'What is the correct VAT registration number?',
          options: ['GB 123 456 789', 'GB 123 456 780', 'Neither / need to check', "I don't know"],
          contradictionId: c2,
        },
        {
          id: 'q3',
          text: 'Which accounting software is primarily used for VAT submissions?',
          options: ['Xero', 'QuickBooks', 'Sage', 'FreeAgent'],
        },
      ],
      status: 'sent',
    });

    // Pipeline status
    await ctx.db.insert('pipeline_status', {
      clientId,
      currentPhase: 'verify',
      phaseProgress: 50,
      activeAgents: ['master'],
      lastActivity: Date.now(),
    });

    // Agent events
    const events = [
      { agent: 'master', type: 'info' as const, msg: 'Starting explore phase with 3 data sources' },
      { agent: 'explorer-gmail', type: 'info' as const, msg: 'Starting exploration of Company Inbox' },
      { agent: 'explorer-drive', type: 'info' as const, msg: 'Starting exploration of Shared Drive' },
      { agent: 'explorer-gmail', type: 'progress' as const, msg: 'Found 247 emails with financial keywords' },
      { agent: 'explorer-drive', type: 'progress' as const, msg: 'Found 89 files across 3 folders' },
      { agent: 'explorer-gmail', type: 'complete' as const, msg: 'Exploration complete: 247 emails catalogued' },
      { agent: 'explorer-drive', type: 'complete' as const, msg: 'Exploration complete: 89 files catalogued' },
      { agent: 'master', type: 'complete' as const, msg: 'Explore phase complete. 2 sources explored.' },
      { agent: 'master', type: 'info' as const, msg: 'Starting structure phase' },
      { agent: 'master', type: 'progress' as const, msg: 'Knowledge tree created with 6 nodes' },
      { agent: 'structurer', type: 'info' as const, msg: 'Processing 89 files from Drive' },
      { agent: 'structurer', type: 'progress' as const, msg: 'Found contradiction: payment terms mismatch' },
      { agent: 'structurer', type: 'progress' as const, msg: 'Found contradiction: VAT number discrepancy' },
      { agent: 'structurer', type: 'complete' as const, msg: 'Structuring complete: 12 findings, 3 contradictions' },
      { agent: 'master', type: 'complete' as const, msg: 'Structure phase complete. 6 tree nodes, 3 contradictions.' },
      { agent: 'master', type: 'info' as const, msg: 'Starting verify phase' },
      { agent: 'master', type: 'progress' as const, msg: 'Questionnaire created with 3 questions' },
      { agent: 'master', type: 'info' as const, msg: 'Waiting for human verification responses...' },
    ];

    for (const e of events) {
      await ctx.db.insert('agent_events', {
        clientId,
        agentName: e.agent,
        eventType: e.type,
        message: e.msg,
      });
    }

    // Forum entries
    await ctx.db.insert('forum_entries', {
      title: 'UK VAT Filing Best Practices',
      category: 'tax',
      content:
        'When processing UK VAT returns, always verify the VAT registration number against HMRC records. Common pitfall: transposed digits in VAT numbers from older documents.',
      authorAgent: 'structurer',
      tags: ['vat', 'uk', 'compliance'],
      upvotes: 3,
    });
    await ctx.db.insert('forum_entries', {
      title: 'Payment Terms Inconsistency Pattern',
      category: 'invoicing',
      content:
        'Accounting firms often have different payment terms for different client tiers. Check if the company uses tiered pricing before flagging as a contradiction.',
      authorAgent: 'explorer-gmail',
      tags: ['invoicing', 'payment-terms'],
      upvotes: 1,
    });

    return null;
  },
});
