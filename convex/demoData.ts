/**
 * DEMO DATA — demoData.ts
 *
 * Seed file for the HackEurope26 demo narrative.
 * Targets the CURRENT schema: clients, knowledge_tree, knowledge_entries,
 * contradictions, data_sources, agent_events, pipeline_status.
 *
 * Two states:
 *   insertDemoMessy  — Phase: explore. Flat, chaotic, contradictions everywhere.
 *   insertDemoClean  — Phase: structure. Hierarchy, entries, contradictions resolved.
 *
 * Usage:
 *   npx convex run demoData:createDemoClient   ← creates the client, prints its ID
 *   npx convex run demoData:insertDemoMessy '{"clientId":"<id>"}'
 *   npx convex run demoData:clearDemo '{"clientId":"<id>"}'
 *   npx convex run demoData:insertDemoClean '{"clientId":"<id>"}'
 *
 * DELETE THIS FILE after the hackathon.
 */

import { mutation } from './_generated/server';
import { v } from 'convex/values';

// ─── CREATE CLIENT ────────────────────────────────────────────────────────────

export const createDemoClient = mutation({
  args: {},
  returns: v.object({ clientId: v.id('clients'), message: v.string() }),
  handler: async (ctx) => {
    const clientId = await ctx.db.insert('clients', {
      name: 'Hartley & Associates LLP',
      industry: 'Accountancy',
      phase: 'explore',
      createdBy: 'demo',
    });
    return { clientId, message: 'Demo client created: Hartley & Associates LLP' };
  },
});

// ─── CLEAR ───────────────────────────────────────────────────────────────────

export const clearDemo = mutation({
  args: { clientId: v.id('clients') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tables = [
      'agent_events',
      'pipeline_status',
      'contradictions',
      'knowledge_entries',
      'knowledge_tree',
      'explorations',
      'data_sources',
    ] as const;

    for (const table of tables) {
      const rows = await ctx.db
        .query(table)
        .withIndex('by_clientId', (q) => q.eq('clientId', args.clientId))
        .collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
    }

    return null;
  },
});

// ─── MESSY ───────────────────────────────────────────────────────────────────

/**
 * WHY IS THIS MESSY?
 *
 * 1. DUPLICATE NODES — The AI dumped every folder/file as a separate
 *    knowledge_tree node. "Acme", "Acme Ltd", "acme_stuff" are the same
 *    client. "VAT", "VAT Returns", "vat_Q2_AMENDED" are the same concept.
 *    A human knows this. The agent doesn't yet.
 *
 * 2. FLAT HIERARCHY — Everything is a root node (no parentId). The tree
 *    has no structure — it's just a pile of labels.
 *
 * 3. CRYPTIC NAMES — "scan0042", "New folder (2)", "tmp" — real drives
 *    are full of these. They add visual noise with zero semantic value.
 *
 * 4. CONTRADICTIONS — The agent found the same value (Q2 VAT liability)
 *    reported differently in two source files. It can't resolve this
 *    alone — it needs a human. These show as red edges in the graph.
 *
 * 5. ALL UNVERIFIED — Every entry has verified: false, confidence < 0.5.
 *    Nothing has been signed off. The graph is uniformly untrustworthy.
 *
 * Visual result: a dense, flat blob of grey nodes with red contradiction
 * edges criss-crossing. No clusters, no hierarchy, no colour variation.
 */
export const insertDemoMessy = mutation({
  args: { clientId: v.id('clients') },
  returns: v.object({ message: v.string(), nodesCreated: v.number() }),
  handler: async (ctx, args) => {
    const now = Date.now();

    // ── Data Sources ──────────────────────────────────────────────
    const drive = await ctx.db.insert('data_sources', {
      clientId: args.clientId,
      type: 'drive',
      label: 'Hartley Main Drive',
      connectionStatus: 'connected',
    });

    await ctx.db.insert('data_sources', {
      clientId: args.clientId,
      type: 'gmail',
      label: 'Partners Gmail',
      connectionStatus: 'connected',
    });

    await ctx.db.insert('data_sources', {
      clientId: args.clientId,
      type: 'sheets',
      label: 'Client Comms Sheets',
      connectionStatus: 'error',
    });

    // ── Exploration (running) ─────────────────────────────────────
    await ctx.db.insert('explorations', {
      clientId: args.clientId,
      dataSourceId: drive,
      metrics: { filesFound: 47, filesProcessed: 29, errored: 6 },
      status: 'running',
    });

    // ── Knowledge Tree — flat dump, all root nodes ─────────────
    const n = (name: string, type: 'domain' | 'skill' | 'entry_group', order: number) =>
      ctx.db.insert('knowledge_tree', {
        clientId: args.clientId,
        name,
        type,
        order,
        // No parentId — everything is root level
      });

    // Real concepts — duplicated as agent would dump them
    const nFinance      = await n('Finance', 'domain', 0);
    const nInvoices     = await n('Invoices', 'domain', 1);
    const nInvoicesOld  = await n('Invoices (old)', 'domain', 2);
    const nInv2024      = await n('invoices_2024', 'entry_group', 3);
    const nVAT          = await n('VAT', 'domain', 4);
    const nVATReturns   = await n('VAT Returns', 'domain', 5);
    const nVATAmended   = await n('vat_Q2_AMENDED', 'entry_group', 6);
    const nVAT2024      = await n('VAT 2024', 'domain', 7);
    const nClients      = await n('Clients', 'domain', 8);
    const nAcme         = await n('Acme', 'domain', 9);
    const nAcmeLtd      = await n('Acme Ltd', 'domain', 10);
    const nAcme2024     = await n('Acme Ltd (2024)', 'domain', 11);
    const nAcmeStuff    = await n('acme_stuff', 'entry_group', 12);
    const nBright       = await n('Brightfield', 'domain', 13);
    const nBrightCo     = await n('Brightfield Co', 'domain', 14);
    const nBrightEng    = await n('brightfield_engagement', 'entry_group', 15);
    const nHMRC         = await n('HMRC', 'domain', 16);
    const nHMRCComms    = await n('HMRC Comms', 'domain', 17);
    const nHMRCFiles    = await n('hmrc_jan_feb', 'entry_group', 18);
    const nEmails       = await n('Emails', 'domain', 19);
    const nEmailAtt     = await n('Email Attachments', 'entry_group', 20);
    const nExpenses     = await n('Expenses', 'domain', 21);
    const nHR           = await n('HR', 'domain', 22);
    const nPayroll      = await n('Payroll', 'domain', 23);
    const nMgmtAccts    = await n('Management Accounts', 'domain', 24);
    const nReports      = await n('Reports', 'domain', 25);
    const nCompliance   = await n('Compliance', 'domain', 26);
    // Junk nodes
    const nMisc         = await n('Misc', 'entry_group', 27);
    const nOther        = await n('Other', 'entry_group', 28);
    const nUncat        = await n('Uncategorised', 'entry_group', 29);
    const nNewFolder    = await n('New folder', 'entry_group', 30);
    const nNewFolder2   = await n('New folder (2)', 'entry_group', 31);
    const nCopyFin      = await n('Copy of Finance', 'domain', 32);
    const nArchive      = await n('Archive', 'entry_group', 33);
    const nOldStuff     = await n('Old Stuff', 'entry_group', 34);
    const nScans        = await n('Scans', 'entry_group', 35);
    const nScan0042     = await n('scan0042', 'entry_group', 36);
    const nUntitled     = await n('Untitled', 'entry_group', 37);
    const nDocs         = await n('Documents', 'entry_group', 38);
    const nTmp          = await n('tmp', 'entry_group', 39);
    const nStaff        = await n('Staff', 'domain', 40);
    const nBoardRep     = await n('Board Reports', 'entry_group', 41);

    // Total: 42 nodes
    void [nFinance, nInvoices, nInvoicesOld, nInv2024, nVAT, nVATReturns, nVATAmended,
      nVAT2024, nClients, nAcme, nAcmeLtd, nAcme2024, nAcmeStuff, nBright, nBrightCo,
      nBrightEng, nHMRC, nHMRCComms, nHMRCFiles, nEmails, nEmailAtt, nExpenses, nHR,
      nPayroll, nMgmtAccts, nReports, nCompliance, nMisc, nOther, nUncat, nNewFolder,
      nNewFolder2, nCopyFin, nArchive, nOldStuff, nScans, nScan0042, nUntitled, nDocs,
      nTmp, nStaff, nBoardRep];

    // ── Knowledge Entries — low confidence, unverified ────────────
    // A few entries to show the agent has done some work but not clean
    const messyEntries = [
      { treeNodeId: nVAT,       title: 'Q2 VAT Liability', content: 'Q2 2024 VAT liability: £84,200 (from vat_return_Q2_2024_draft.pdf)', confidence: 0.41, verified: false },
      { treeNodeId: nVATAmended,title: 'Q2 VAT Amended',   content: 'Q2 2024 VAT liability: £91,500 (from vat_Q2_AMENDED.pdf). Conflicts with draft.', confidence: 0.38, verified: false },
      { treeNodeId: nAcmeLtd,   title: 'Acme Engagement',  content: 'Engagement letter signed Jan 2024. Invoice dispute on March invoice.', confidence: 0.55, verified: false },
      { treeNodeId: nInvoices,  title: 'March Invoice',     content: 'invoice_acme_march.pdf — amount unclear, possible duplicate of invoice_acme_feb_FINAL_v2.pdf', confidence: 0.29, verified: false },
      { treeNodeId: nHMRC,      title: 'HMRC Q3 Query',    content: 'HMRC queried Q3 VAT return. Response deadline unknown.', confidence: 0.44, verified: false },
    ];

    for (const e of messyEntries) {
      await ctx.db.insert('knowledge_entries', {
        clientId: args.clientId,
        treeNodeId: e.treeNodeId,
        title: e.title,
        content: e.content,
        confidence: e.confidence,
        verified: e.verified,
      });
    }

    // ── Contradictions — the red edges in the graph ───────────────
    await ctx.db.insert('contradictions', {
      clientId: args.clientId,
      description: 'Q2 2024 VAT liability reported with two different figures',
      sourceA: 'vat_return_Q2_2024_draft.pdf',
      sourceB: 'vat_Q2_AMENDED.pdf',
      valueA: '£84,200',
      valueB: '£91,500',
      status: 'open',
    });

    await ctx.db.insert('contradictions', {
      clientId: args.clientId,
      description: 'Cashflow forecast: two files, cannot determine canonical version',
      sourceA: 'cashflow_forecast_v1.xlsx',
      sourceB: 'cashflow_forecast_v3_FINAL.xlsx',
      valueA: 'Forecast created Jan 2024',
      valueB: 'Forecast created Mar 2024 (labelled FINAL)',
      status: 'open',
    });

    await ctx.db.insert('contradictions', {
      clientId: args.clientId,
      description: 'Trial balance duplicated across two files',
      sourceA: 'trial_balance_2024.xlsx',
      sourceB: 'trial_balance_2024_COPY.xlsx',
      valueA: 'Modified 14 Mar 2024',
      valueB: 'Modified 15 Mar 2024 (copy — which is authoritative?)',
      status: 'open',
    });

    await ctx.db.insert('contradictions', {
      clientId: args.clientId,
      description: 'Acme Ltd invoice — possible duplicate across folders',
      sourceA: 'invoice_acme_feb_FINAL_v2.pdf',
      sourceB: 'invoice_acme_march.pdf',
      valueA: 'Found in /Drive/Invoices Old/',
      valueB: 'Found in /Drive/Random Stuff/ — same amount, different date?',
      status: 'open',
    });

    // ── Pipeline Status ───────────────────────────────────────────
    await ctx.db.insert('pipeline_status', {
      clientId: args.clientId,
      currentPhase: 'explore',
      phaseProgress: 62,
      activeAgents: ['explorer-agent-1'],
      lastActivity: now - 1000 * 60 * 3,
    });

    // ── Agent Events — the live feed ──────────────────────────────
    const events: Array<{ eventType: 'info' | 'progress' | 'warning' | 'error' | 'complete'; message: string }> = [
      { eventType: 'info',     message: 'Connected to Google Drive. Scanning 4 top-level folders...' },
      { eventType: 'progress', message: 'Found 47 files across 12 folders. Beginning classification.' },
      { eventType: 'warning',  message: "Duplicate: 'cashflow_forecast_v1.xlsx' vs 'cashflow_forecast_v3_FINAL.xlsx' — cannot determine canonical." },
      { eventType: 'warning',  message: "Duplicate: 'trial_balance_2024.xlsx' vs 'trial_balance_2024_COPY.xlsx' — files appear identical." },
      { eventType: 'error',    message: "Conflict: 'vat_return_Q2_2024_draft.pdf' (£84,200) vs 'vat_Q2_AMENDED.pdf' (£91,500) — different figures for Q2 VAT." },
      { eventType: 'error',    message: "Cannot read 'scan0042.pdf' — blank scan, no extractable text." },
      { eventType: 'error',    message: "Cannot read 'Untitled document.docx' — file is empty." },
      { eventType: 'warning',  message: 'Sheets source connection failed (OAuth expired). 0 spreadsheets retrieved.' },
      { eventType: 'progress', message: 'Identified 42 candidate KB nodes. Hierarchy unclear — overlapping categories detected.' },
      { eventType: 'warning',  message: 'Found 4 near-duplicate node names: Acme / Acme Ltd / Acme Ltd (2024) / acme_stuff. Flagging for human review.' },
    ];

    for (const e of events) {
      await ctx.db.insert('agent_events', {
        clientId: args.clientId,
        agentName: 'explorer-agent-1',
        eventType: e.eventType,
        message: e.message,
      });
    }

    return { message: 'Messy demo state seeded for Hartley & Associates LLP', nodesCreated: 42 };
  },
});

// ─── CLEAN ────────────────────────────────────────────────────────────────────

/**
 * The "after" state. Same firm, same data — now structured.
 * Run clearDemo first, then insertDemoClean.
 *
 * WHY IS THIS CLEAN?
 * - 42 flat nodes → 12 nodes in a 3-level hierarchy
 * - All duplicates merged (Acme/Acme Ltd/acme_stuff → "Acme Ltd")
 * - Every node has a parent — the tree has clear shape
 * - 4 open contradictions → 3 resolved, 1 still pending human input
 * - Knowledge entries are verified with high confidence
 * - Agent job completed, no errors in feed
 */
export const insertDemoClean = mutation({
  args: { clientId: v.id('clients') },
  returns: v.object({ message: v.string(), nodesCreated: v.number() }),
  handler: async (ctx, args) => {
    const now = Date.now();

    // ── Data Sources — all connected ──────────────────────────────
    const drive = await ctx.db.insert('data_sources', {
      clientId: args.clientId,
      type: 'drive',
      label: 'Hartley Main Drive',
      connectionStatus: 'connected',
    });

    await ctx.db.insert('data_sources', {
      clientId: args.clientId,
      type: 'gmail',
      label: 'Partners Gmail',
      connectionStatus: 'connected',
    });

    // ── Exploration — completed ───────────────────────────────────
    await ctx.db.insert('explorations', {
      clientId: args.clientId,
      dataSourceId: drive,
      metrics: { filesFound: 47, filesProcessed: 45, errored: 2 },
      status: 'completed',
    });

    // ── Knowledge Tree — clean 3-level hierarchy ──────────────────
    // Level 0: Domains
    const finance = await ctx.db.insert('knowledge_tree', {
      clientId: args.clientId, name: 'Finance', type: 'domain', order: 0,
      readme: 'All financial records for Hartley & Associates LLP. Covers invoices, VAT, management accounts, and expenses.',
    });
    const clients = await ctx.db.insert('knowledge_tree', {
      clientId: args.clientId, name: 'Clients', type: 'domain', order: 1,
      readme: 'Client records, engagement letters, and correspondence.',
    });
    const compliance = await ctx.db.insert('knowledge_tree', {
      clientId: args.clientId, name: 'Compliance', type: 'domain', order: 2,
      readme: 'Regulatory and HMRC-related documents.',
    });

    // Level 1: Skills under Finance
    const invoices = await ctx.db.insert('knowledge_tree', {
      clientId: args.clientId, name: 'Invoices', type: 'skill', order: 0, parentId: finance,
      readme: 'Client invoices by year and quarter. All duplicates resolved.',
    });
    const vat = await ctx.db.insert('knowledge_tree', {
      clientId: args.clientId, name: 'VAT Filings', type: 'skill', order: 1, parentId: finance,
      readme: 'VAT returns by quarter. Q2 2024 uses amended figure of £91,500 (confirmed by user).',
    });
    const mgmtAccts = await ctx.db.insert('knowledge_tree', {
      clientId: args.clientId, name: 'Management Accounts', type: 'skill', order: 2, parentId: finance,
      readme: 'Trial balance, P&L, and cashflow forecasts. Canonical cashflow: v3_FINAL (March 2024).',
    });
    const expenses = await ctx.db.insert('knowledge_tree', {
      clientId: args.clientId, name: 'Expenses', type: 'skill', order: 3, parentId: finance,
      readme: 'Staff expenses and payroll.',
    });

    // Level 1: Skills under Clients
    const acme = await ctx.db.insert('knowledge_tree', {
      clientId: args.clientId, name: 'Acme Ltd', type: 'skill', order: 0, parentId: clients,
      readme: 'Engagement letter signed Jan 2024. Active invoice dispute on March invoice.',
    });
    const brightfield = await ctx.db.insert('knowledge_tree', {
      clientId: args.clientId, name: 'Brightfield Co', type: 'skill', order: 1, parentId: clients,
      readme: 'Engagement letter signed Feb 2024. No outstanding disputes.',
    });

    // Level 1: Skills under Compliance
    const hmrc = await ctx.db.insert('knowledge_tree', {
      clientId: args.clientId, name: 'HMRC Correspondence', type: 'skill', order: 0, parentId: compliance,
      readme: 'All HMRC inbound/outbound correspondence. Q3 VAT query open.',
    });

    // Level 2: Entry groups under Invoices
    const inv2024 = await ctx.db.insert('knowledge_tree', {
      clientId: args.clientId, name: '2024 Invoices', type: 'entry_group', order: 0, parentId: invoices,
      readme: 'All 2024 invoices. Q1: 3 (Acme Ltd). Q2: 1 (Acme Ltd).',
    });

    // ── Knowledge Entries — verified, high confidence ─────────────
    const cleanEntries = [
      { treeNodeId: vat,      title: 'Q1 2024 VAT Return', content: 'VAT Return Q1 2024. Submitted on time. No outstanding queries.', confidence: 0.97, verified: true },
      { treeNodeId: vat,      title: 'Q2 2024 VAT Return (Amended)', content: 'Q2 2024 VAT liability confirmed: £91,500 (amended figure, user-verified). Original draft (£84,200) deprecated.', confidence: 0.99, verified: true },
      { treeNodeId: mgmtAccts,title: 'Cashflow Forecast 2024', content: 'Canonical version: cashflow_forecast_v3_FINAL.xlsx (March 2024). Earlier versions deprecated.', confidence: 0.98, verified: true },
      { treeNodeId: mgmtAccts,title: 'Trial Balance 2024', content: 'Canonical version: trial_balance_2024.xlsx. The _COPY version has been removed.', confidence: 0.96, verified: true },
      { treeNodeId: mgmtAccts,title: "P&L 2023", content: 'Full P&L for FY2023. Clean, no duplicates.', confidence: 0.99, verified: true },
      { treeNodeId: acme,     title: 'Acme Ltd — Engagement', content: 'Engagement letter signed Jan 2024. Invoice dispute on March invoice — see HMRC/Acme email thread.', confidence: 0.98, verified: true },
      { treeNodeId: inv2024,  title: 'Acme Ltd — Feb Invoice', content: 'Invoice for Feb 2024 services. Amount: £12,400. Canonical: invoice_acme_feb_FINAL_v2.pdf', confidence: 0.97, verified: true },
      { treeNodeId: inv2024,  title: 'Acme Ltd — March Invoice', content: 'Invoice for March 2024. Disputed by client — see email thread.', confidence: 0.91, verified: true },
      { treeNodeId: hmrc,     title: 'HMRC Q3 VAT Query', content: 'HMRC queried Q3 VAT return. Response deadline: 14 March 2025. Supporting docs: Q3 VAT filing + management accounts.', confidence: 0.95, verified: true },
      { treeNodeId: hmrc,     title: 'HMRC Jan Correspondence', content: 'Routine correspondence from HMRC re: annual review. No action required.', confidence: 0.99, verified: true },
      { treeNodeId: brightfield, title: 'Brightfield Co — Engagement', content: 'Engagement letter signed Feb 2024. No outstanding disputes.', confidence: 0.99, verified: true },
      { treeNodeId: expenses, title: 'Staff Expenses March 2024', content: 'Staff expenses for March 2024. Verified against payroll summary.', confidence: 0.96, verified: true },
    ];

    for (const e of cleanEntries) {
      await ctx.db.insert('knowledge_entries', {
        clientId: args.clientId,
        treeNodeId: e.treeNodeId,
        title: e.title,
        content: e.content,
        confidence: e.confidence,
        verified: e.verified,
      });
    }

    // ── Contradictions — mostly resolved ──────────────────────────
    await ctx.db.insert('contradictions', {
      clientId: args.clientId,
      description: 'Q2 2024 VAT liability — two different figures',
      sourceA: 'vat_return_Q2_2024_draft.pdf',
      sourceB: 'vat_Q2_AMENDED.pdf',
      valueA: '£84,200',
      valueB: '£91,500',
      status: 'resolved',
      resolution: 'User confirmed £91,500 (amended) is correct. Draft deprecated.',
    });

    await ctx.db.insert('contradictions', {
      clientId: args.clientId,
      description: 'Cashflow forecast — two versions',
      sourceA: 'cashflow_forecast_v1.xlsx',
      sourceB: 'cashflow_forecast_v3_FINAL.xlsx',
      valueA: 'Jan 2024 version',
      valueB: 'Mar 2024 version (FINAL)',
      status: 'resolved',
      resolution: 'v3_FINAL selected as canonical. v1 archived.',
    });

    await ctx.db.insert('contradictions', {
      clientId: args.clientId,
      description: 'Trial balance duplicated',
      sourceA: 'trial_balance_2024.xlsx',
      sourceB: 'trial_balance_2024_COPY.xlsx',
      valueA: 'Original',
      valueB: 'Copy (same content)',
      status: 'resolved',
      resolution: 'Original confirmed canonical. Copy removed.',
    });

    // One still open — shows work isn't fully done
    await ctx.db.insert('contradictions', {
      clientId: args.clientId,
      description: 'Acme invoice: possible duplicate across folders',
      sourceA: 'invoice_acme_feb_FINAL_v2.pdf',
      sourceB: 'invoice_acme_march.pdf',
      valueA: 'Found in /Drive/Invoices Old/',
      valueB: 'Found in /Drive/Random Stuff/',
      status: 'open',
    });

    // ── Pipeline Status ───────────────────────────────────────────
    await ctx.db.insert('pipeline_status', {
      clientId: args.clientId,
      currentPhase: 'structure',
      phaseProgress: 100,
      activeAgents: [],
      lastActivity: now - 1000 * 60 * 2,
    });

    // ── Agent Events — success story ──────────────────────────────
    const events: Array<{ eventType: 'info' | 'progress' | 'warning' | 'error' | 'complete'; message: string }> = [
      { eventType: 'info',     message: 'Structure job started. Processing 42 discovered nodes.' },
      { eventType: 'progress', message: "Merging duplicates: 'Acme' + 'Acme Ltd' + 'Acme Ltd (2024)' + 'acme_stuff' → 'Acme Ltd'" },
      { eventType: 'progress', message: "Merging: 'VAT' + 'VAT Returns' + 'vat_Q2_AMENDED' + 'VAT 2024' → 'VAT Filings'" },
      { eventType: 'info',     message: 'Contradiction resolved via user input: Q2 VAT = £91,500 (amended). Draft deprecated.' },
      { eventType: 'info',     message: 'Canonical cashflow confirmed: v3_FINAL. Earlier version archived.' },
      { eventType: 'progress', message: 'Built Finance hierarchy: Invoices → 2024 Invoices, VAT Filings, Management Accounts, Expenses.' },
      { eventType: 'progress', message: 'Built Clients hierarchy: Acme Ltd, Brightfield Co.' },
      { eventType: 'progress', message: 'Built Compliance hierarchy: HMRC Correspondence.' },
      { eventType: 'info',     message: 'Generated READMEs for 12 nodes. 11 verified, 1 pending.' },
      { eventType: 'complete', message: 'Structure complete. 42 nodes → 12. 3 contradictions resolved. Knowledge base ready for verification.' },
    ];

    for (const e of events) {
      await ctx.db.insert('agent_events', {
        clientId: args.clientId,
        agentName: 'structure-agent-1',
        eventType: e.eventType,
        message: e.message,
      });
    }

    return { message: 'Clean demo state seeded for Hartley & Associates LLP', nodesCreated: 12 };
  },
});
