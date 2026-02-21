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
 * This is a real accounting firm that has been running for 10+ years.
 * Files have accumulated across Google Drive with no naming convention,
 * duplicated across folders, and organised by whoever was working that day.
 *
 * The KNOWLEDGE GRAPH shows:
 *   - Folder nodes (domain/skill) connected by parentId (blue edges)
 *   - File nodes (entry_group) often placed in the WRONG folder
 *   - Green (relates_to) edges where the same file is referenced from
 *     multiple parts of the tree — agent spotted the cross-reference
 *
 * The CONTRADICTIONS GRAPH shows:
 *   - File nodes (sources) connected by red edges where values conflict
 *   - E.g. the same VAT figure appears as £84,200 in one doc and £91,500
 *     in another — a human must decide which is correct
 *
 * Visual result: a tangled web of blue parent edges and green cross-links,
 * with the contradictions view showing a dense red collision network.
 */
export const insertDemoMessy = mutation({
  args: { clientId: v.id('clients') },
  returns: v.object({ message: v.string(), nodesCreated: v.number() }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const cid = args.clientId;

    // ── Data Sources ──────────────────────────────────────────────
    const drive = await ctx.db.insert('data_sources', {
      clientId: cid, type: 'drive', label: 'Hartley Main Drive', connectionStatus: 'connected',
    });
    await ctx.db.insert('data_sources', {
      clientId: cid, type: 'gmail', label: 'Partners Gmail', connectionStatus: 'connected',
    });
    await ctx.db.insert('data_sources', {
      clientId: cid, type: 'sheets', label: 'Client Comms Sheets', connectionStatus: 'error',
    });

    // ── Exploration (running) ─────────────────────────────────────
    await ctx.db.insert('explorations', {
      clientId: cid, dataSourceId: drive,
      metrics: { filesFound: 84, filesProcessed: 51, errored: 9 },
      status: 'running',
    });

    // ── Helper ────────────────────────────────────────────────────
    const node = (
      name: string,
      type: 'domain' | 'skill' | 'entry_group',
      order: number,
      parentId?: string,
      readme?: string,
    ) =>
      ctx.db.insert('knowledge_tree', {
        clientId: cid, name, type, order,
        ...(parentId ? { parentId: parentId as Parameters<typeof ctx.db.insert<'knowledge_tree'>>[1]['parentId'] } : {}),
        ...(readme ? { readme } : {}),
      });

    // ── FOLDER STRUCTURE (as the agent found it on Drive) ─────────
    //
    // Top-level "domains" — these are the real Google Drive top folders.
    // A human set them up years ago with no consistent scheme.

    const fFinance    = await node('Finance',           'domain', 0,  undefined, 'Top-level folder. Created 2014. Multiple sub-folders added by different staff over the years.');
    const fOldFinance = await node('Finance (Old)',     'domain', 1,  undefined, 'Archived by James in 2019. Still has active files in it.');
    const fClients    = await node('Clients',           'domain', 2,  undefined, 'Client engagement files. Not all clients are here — some are in Misc.');
    const fHR         = await node('HR',                'domain', 3,  undefined, 'Staff records and payroll. Mixed with expenses in some subfolders.');
    const fCompliance = await node('Compliance',        'domain', 4,  undefined, 'HMRC correspondence and regulatory filings.');
    const fMisc       = await node('Misc',              'domain', 5,  undefined, 'Catch-all folder. Contains ~30 files with no obvious home.');
    const fArchive    = await node('Archive',           'domain', 6,  undefined, 'Supposedly archived. Some files here are still in active use.');
    const fShared     = await node('Shared with me',   'domain', 7,  undefined, 'Files shared by clients directly. Some duplicated into other folders.');

    // ── Sub-folders ───────────────────────────────────────────────
    // Finance sub-folders (some sensible, some not)
    const fVAT        = await node('VAT',               'skill',  0,  fFinance,    'VAT returns. Q2 2024 figure is disputed — see contradictions.');
    const fVATOld     = await node('VAT Returns',       'skill',  1,  fOldFinance, 'Old VAT folder. Should be archived but still referenced.');
    const fInvoices   = await node('Invoices',          'skill',  2,  fFinance,    'Client invoices. Acme invoices also appear in Misc.');
    const fInvOld     = await node('Invoices Old',      'skill',  3,  fOldFinance, 'Pre-2022 invoices. Agent found 3 post-2022 files here.');
    const fMgmt       = await node('Management Accts',  'skill',  4,  fFinance,    'Trial balance, P&L, cashflow. Two conflicting cashflow versions found.');
    const fExpenses   = await node('Expenses',          'skill',  5,  fHR,         'Staff expenses. Mixed with payroll records.');
    const fPayroll    = await node('Payroll',           'skill',  6,  fHR,         'Monthly payroll summaries. Some in HR/Expenses by mistake.');

    // Clients sub-folders
    const fAcme       = await node('Acme Ltd',          'skill',  0,  fClients,    'Engagement letter Jan 2024. Active invoice dispute. Some files in Misc.');
    const fAcmeOld    = await node('Acme (2021-2023)',  'skill',  1,  fArchive,    'Old Acme files. Should be archived but invoice_acme_feb referenced here.');
    const fBright     = await node('Brightfield Co',   'skill',  2,  fClients,    'Engagement letter Feb 2024. No disputes. Trial balance shared directly.');
    const fNorton     = await node('Norton & Sons',    'skill',  3,  fMisc,       'New client. Files dropped into Misc — not yet organised.');

    // Compliance sub-folders
    const fHMRC       = await node('HMRC',              'skill',  0,  fCompliance, 'HMRC correspondence. Q3 VAT query open since Sep 2024.');
    const fCorp       = await node('Corp Tax',          'skill',  1,  fCompliance, 'Corporation tax filings. 2022 filing also appears in Finance (Old).');

    // ── ACTUAL FILES (entry_group nodes) ─────────────────────────
    // These are real files the agent found. Many are in the wrong folder.
    // The agent places them under whatever folder they were physically in,
    // then uses knowledge_entries + sourceRef to show cross-references.

    // VAT files
    const fVatDraft   = await node('vat_return_Q2_2024_draft.pdf',   'entry_group', 0, fVAT,     '⚠️ CONFLICT: Reports Q2 VAT as £84,200. Contradicted by amended version.');
    const fVatAmend   = await node('vat_Q2_2024_AMENDED.pdf',        'entry_group', 1, fVATOld,  '⚠️ CONFLICT: Reports Q2 VAT as £91,500. In wrong folder (Finance Old).');
    const fVatQ1      = await node('vat_return_Q1_2024.pdf',         'entry_group', 2, fVAT,     'Q1 2024 VAT return. Submitted. No disputes.');
    const fVatQ3      = await node('vat_return_Q3_2024.pdf',         'entry_group', 3, fMisc,    '⚠️ Q3 VAT return filed here in Misc — should be in Compliance/HMRC.');

    // Invoice files — scattered across 4 different folders
    const fInvAcmeFeb = await node('invoice_acme_feb_FINAL_v2.pdf',  'entry_group', 0, fInvOld,  '⚠️ 2024 invoice in Invoices Old folder. Amount: £12,400.');
    const fInvAcmeMar = await node('invoice_acme_march.pdf',         'entry_group', 1, fMisc,    '⚠️ Invoice in Misc. Possibly duplicate of Feb invoice.');
    const fInvAcmeMar2= await node('invoice_acme_march_COPY.pdf',    'entry_group', 2, fAcmeOld, '⚠️ DUPLICATE: Copy of march invoice in old archive folder.');
    const fInvBright  = await node('invoice_brightfield_Q1.pdf',     'entry_group', 3, fInvoices,'Q1 invoice for Brightfield Co. Correct location.');
    const fInvNorton  = await node('invoice_norton_jan.pdf',         'entry_group', 4, fMisc,    'Norton & Sons first invoice. Sitting in Misc with no structure.');

    // Management accounts — conflicting versions
    const fCashV1     = await node('cashflow_forecast_v1.xlsx',      'entry_group', 0, fMgmt,    '⚠️ CONFLICT: Jan 2024 cashflow. Superseded by v3 but still referenced.');
    const fCashV3     = await node('cashflow_forecast_v3_FINAL.xlsx','entry_group', 1, fShared,  '⚠️ CONFLICT: Mar 2024 FINAL cashflow. In "Shared with me" — not in Finance.');
    const fTrialBal   = await node('trial_balance_2024.xlsx',        'entry_group', 2, fMgmt,    'Trial balance. Canonical version.');
    const fTrialCopy  = await node('trial_balance_2024_COPY.xlsx',   'entry_group', 3, fArchive, '⚠️ DUPLICATE: Copy of trial balance in Archive — unclear if different.');
    const fPL2023     = await node('P&L_FY2023.xlsx',               'entry_group', 4, fOldFinance,'P&L for 2023. In Finance (Old) but still referenced in HMRC query.');

    // HR / Payroll files — mixed up
    const fPayMar     = await node('payroll_march_2024.xlsx',        'entry_group', 0, fExpenses,'⚠️ Payroll file in Expenses folder — should be in Payroll.');
    const fExpMar     = await node('expenses_march_2024.pdf',        'entry_group', 1, fPayroll, '⚠️ Expenses file in Payroll folder — wrong location.');
    const fPaySummary = await node('payroll_summary_2024.xlsx',      'entry_group', 2, fMisc,    '⚠️ Annual payroll summary dropped in Misc.');

    // HMRC / Compliance files
    const fHMRCLetter = await node('HMRC_Q3_query_letter.pdf',       'entry_group', 0, fHMRC,    'HMRC query letter re: Q3 VAT return. Deadline: 14 Mar 2025.');
    const fHMRCResp   = await node('HMRC_response_draft.docx',       'entry_group', 1, fMisc,    '⚠️ Draft HMRC response sitting in Misc — needs to go to Compliance.');
    const fCorpTax22  = await node('corp_tax_filing_2022.pdf',       'entry_group', 2, fOldFinance,'⚠️ Corp tax filing in Finance (Old) — should be in Compliance/Corp Tax.');

    // Client files
    const fAcmeEng    = await node('acme_engagement_letter_2024.pdf','entry_group', 0, fAcme,    'Engagement letter signed Jan 2024.');
    const fBrightEng  = await node('brightfield_engagement_2024.pdf','entry_group', 1, fBright,  'Engagement letter signed Feb 2024.');
    const fBrightTB   = await node('brightfield_trial_balance.xlsx', 'entry_group', 2, fShared,  '⚠️ Brightfield trial balance in "Shared with me" — not filed under client.');
    const fNortonEng  = await node('norton_engagement_2024.pdf',     'entry_group', 3, fMisc,    '⚠️ Norton engagement letter in Misc — client not set up yet.');

    // Junk / unreadable files
    const fScan       = await node('scan0042.pdf',                   'entry_group', 0, fMisc,    '❌ Blank scan — no extractable text. Cannot classify.');
    const fUntitled   = await node('Untitled document.docx',        'entry_group', 1, fMisc,    '❌ Empty document. Cannot classify.');
    const fNewFolder  = await node('New folder',                     'entry_group', 2, fMisc,    '⚠️ Folder with no name containing 3 unrelated files.');

    void [fFinance, fOldFinance, fClients, fHR, fCompliance, fMisc, fArchive, fShared,
      fVAT, fVATOld, fInvoices, fInvOld, fMgmt, fExpenses, fPayroll,
      fAcme, fAcmeOld, fBright, fNorton, fHMRC, fCorp,
      fVatDraft, fVatAmend, fVatQ1, fVatQ3,
      fInvAcmeFeb, fInvAcmeMar, fInvAcmeMar2, fInvBright, fInvNorton,
      fCashV1, fCashV3, fTrialBal, fTrialCopy, fPL2023,
      fPayMar, fExpMar, fPaySummary,
      fHMRCLetter, fHMRCResp, fCorpTax22,
      fAcmeEng, fBrightEng, fBrightTB, fNortonEng,
      fScan, fUntitled, fNewFolder];

    // ── KNOWLEDGE ENTRIES with sourceRef ─────────────────────────
    // sourceRef ties an entry to a real file name.
    // Where the same file is referenced from >1 tree node,
    // getKnowledgeTree will draw a green "relates_to" edge.

    const entries: Array<{
      treeNodeId: string;
      title: string;
      content: string;
      sourceRef: string;
      confidence: number;
    }> = [
      // VAT Q2 conflict — same topic, two contradicting files, each referenced from their node
      { treeNodeId: fVatDraft,  title: 'Q2 VAT (draft)',    sourceRef: 'vat_return_Q2_2024_draft.pdf',
        content: 'Q2 2024 VAT liability: £84,200. This is the original submission.',    confidence: 0.41 },
      { treeNodeId: fVatAmend,  title: 'Q2 VAT (amended)',  sourceRef: 'vat_Q2_2024_AMENDED.pdf',
        content: 'Q2 2024 VAT liability: £91,500. Marked AMENDED — conflicts with draft.', confidence: 0.38 },
      // HMRC query references both the Q3 VAT return AND the P&L — cross-link
      { treeNodeId: fHMRCLetter,title: 'HMRC Q3 Query',     sourceRef: 'HMRC_Q3_query_letter.pdf',
        content: 'HMRC queried Q3 2024 VAT return. Supporting docs needed: Q3 VAT + management accounts.', confidence: 0.44 },
      { treeNodeId: fVatQ3,     title: 'Q3 VAT (in Misc)',  sourceRef: 'vat_return_Q3_2024.pdf',
        content: 'Q3 VAT return. Should support HMRC response but filed in Misc. Deadline: 14 Mar 2025.', confidence: 0.51 },
      // Cashflow conflict — two versions referenced
      { treeNodeId: fCashV1,    title: 'Cashflow v1',       sourceRef: 'cashflow_forecast_v1.xlsx',
        content: 'Jan 2024 cashflow forecast. May have been superseded but still in active folder.', confidence: 0.33 },
      { treeNodeId: fCashV3,    title: 'Cashflow v3 FINAL', sourceRef: 'cashflow_forecast_v3_FINAL.xlsx',
        content: 'Mar 2024 cashflow. Labelled FINAL. Currently in "Shared with me" not Finance.', confidence: 0.62 },
      // Trial balance duplicate
      { treeNodeId: fTrialBal,  title: 'Trial Balance',     sourceRef: 'trial_balance_2024.xlsx',
        content: 'Trial balance 2024. This appears to be the canonical version.',       confidence: 0.71 },
      { treeNodeId: fTrialCopy, title: 'Trial Balance COPY',sourceRef: 'trial_balance_2024_COPY.xlsx',
        content: 'Duplicate of trial balance in Archive. Unclear if different data.',   confidence: 0.29 },
      // Acme invoice — Feb invoice referenced from BOTH the old folder AND the acme client folder
      { treeNodeId: fInvAcmeFeb,title: 'Acme Feb Invoice',  sourceRef: 'invoice_acme_feb_FINAL_v2.pdf',
        content: 'Feb 2024 invoice for Acme Ltd. £12,400. Filed in Invoices Old despite being 2024.', confidence: 0.55 },
      { treeNodeId: fAcme,      title: 'Acme Feb Invoice (ref)', sourceRef: 'invoice_acme_feb_FINAL_v2.pdf',
        content: 'Same invoice_acme_feb_FINAL_v2.pdf referenced from Acme client folder too.', confidence: 0.55 },
      // March invoice possibly duplicated
      { treeNodeId: fInvAcmeMar, title: 'Acme March Invoice',   sourceRef: 'invoice_acme_march.pdf',
        content: 'March 2024 invoice in Misc. Amount unclear — possible duplicate of Feb.', confidence: 0.29 },
      { treeNodeId: fInvAcmeMar2,title: 'Acme March COPY',      sourceRef: 'invoice_acme_march.pdf',
        content: 'Copy of march invoice found in archive. Same sourceRef — likely duplicate.', confidence: 0.21 },
      // Brightfield trial balance cross-references
      { treeNodeId: fBrightTB,  title: 'Brightfield Trial Bal', sourceRef: 'brightfield_trial_balance.xlsx',
        content: 'Trial balance for Brightfield Co. In "Shared with me" — client sent directly.', confidence: 0.68 },
      { treeNodeId: fBright,    title: 'Brightfield TB (ref)',  sourceRef: 'brightfield_trial_balance.xlsx',
        content: 'Same file referenced from Brightfield client folder.', confidence: 0.68 },
      // P&L referenced from HMRC query context
      { treeNodeId: fPL2023,    title: 'P&L FY2023',           sourceRef: 'P&L_FY2023.xlsx',
        content: 'Full P&L for FY2023. In Finance (Old) but needed for HMRC Q3 query response.', confidence: 0.77 },
      { treeNodeId: fHMRCLetter,title: 'P&L referenced by HMRC',sourceRef: 'P&L_FY2023.xlsx',
        content: 'HMRC letter requests FY2023 P&L as supporting doc for VAT query.', confidence: 0.72 },
      // Payroll/expenses in wrong folders
      { treeNodeId: fPayMar,    title: 'March Payroll',        sourceRef: 'payroll_march_2024.xlsx',
        content: 'Payroll for March 2024. In Expenses folder — should be in Payroll.', confidence: 0.48 },
      { treeNodeId: fExpMar,    title: 'March Expenses',       sourceRef: 'expenses_march_2024.pdf',
        content: 'Staff expenses March 2024. In Payroll folder — should be in Expenses.', confidence: 0.48 },
      // Corp tax in wrong place
      { treeNodeId: fCorpTax22, title: 'Corp Tax 2022',        sourceRef: 'corp_tax_filing_2022.pdf',
        content: 'Corporation tax filing 2022. In Finance (Old) — should be in Compliance/Corp Tax.', confidence: 0.61 },
      { treeNodeId: fCorp,      title: 'Corp Tax 2022 (ref)',  sourceRef: 'corp_tax_filing_2022.pdf',
        content: 'Same filing referenced from Corp Tax folder — file is actually in Finance (Old).', confidence: 0.61 },
    ];

    for (const e of entries) {
      await ctx.db.insert('knowledge_entries', {
        clientId: cid,
        treeNodeId: e.treeNodeId as Parameters<typeof ctx.db.insert<'knowledge_entries'>>[1]['treeNodeId'],
        title: e.title,
        content: e.content,
        sourceRef: e.sourceRef,
        confidence: e.confidence,
        verified: false,
      });
    }

    // ── CONTRADICTIONS — red edges in contradictions graph ────────
    const contradictions: Array<{
      description: string; sourceA: string; sourceB: string; valueA: string; valueB: string;
    }> = [
      {
        description: 'Q2 2024 VAT liability: two different figures in two documents',
        sourceA: 'vat_return_Q2_2024_draft.pdf', valueA: '£84,200 (original submission)',
        sourceB: 'vat_Q2_2024_AMENDED.pdf',      valueB: '£91,500 (amendment — which is correct?)',
      },
      {
        description: 'Cashflow forecast: v1 (Jan) vs v3_FINAL (Mar) — which is the live version?',
        sourceA: 'cashflow_forecast_v1.xlsx',          valueA: 'Created Jan 2024, still in Finance folder',
        sourceB: 'cashflow_forecast_v3_FINAL.xlsx',    valueB: 'Created Mar 2024, in "Shared with me"',
      },
      {
        description: 'Trial balance 2024 duplicated — original vs copy',
        sourceA: 'trial_balance_2024.xlsx',       valueA: 'Modified 14 Mar 2024 — in Management Accts',
        sourceB: 'trial_balance_2024_COPY.xlsx',  valueB: 'Modified 15 Mar 2024 — in Archive. Same data?',
      },
      {
        description: 'Acme Ltd March invoice: two files with same amount, different dates',
        sourceA: 'invoice_acme_march.pdf',        valueA: 'In Misc — March 2024, £13,200',
        sourceB: 'invoice_acme_march_COPY.pdf',   valueB: 'In Acme Old archive — same amount, earlier date',
      },
      {
        description: 'Acme Feb invoice vs March invoice — possible duplicate billing',
        sourceA: 'invoice_acme_feb_FINAL_v2.pdf', valueA: '£12,400 — February services',
        sourceB: 'invoice_acme_march.pdf',         valueB: '£13,200 — overlapping date range with Feb?',
      },
      {
        description: 'Payroll March 2024 vs Expenses March 2024 — filed in each other\'s folders',
        sourceA: 'payroll_march_2024.xlsx',        valueA: 'In Expenses folder — should be in Payroll',
        sourceB: 'expenses_march_2024.pdf',        valueB: 'In Payroll folder — should be in Expenses',
      },
      {
        description: 'Corporation tax 2022: filed in two locations — Finance (Old) and Compliance',
        sourceA: 'corp_tax_filing_2022.pdf',       valueA: 'Found in Finance (Old)',
        sourceB: 'corp_tax_filing_2022.pdf',       valueB: 'Referenced from Compliance/Corp Tax — same file?',
      },
    ];

    for (const c of contradictions) {
      await ctx.db.insert('contradictions', {
        clientId: cid,
        description: c.description,
        sourceA: c.sourceA, valueA: c.valueA,
        sourceB: c.sourceB, valueB: c.valueB,
        status: 'open',
      });
    }

    // ── Pipeline Status ───────────────────────────────────────────
    await ctx.db.insert('pipeline_status', {
      clientId: cid, currentPhase: 'explore', phaseProgress: 61,
      activeAgents: ['explorer-agent-1'], lastActivity: now - 1000 * 60 * 3,
    });

    // ── Agent Events ──────────────────────────────────────────────
    const events: Array<{ eventType: 'info' | 'progress' | 'warning' | 'error' | 'complete'; message: string }> = [
      { eventType: 'info',     message: 'Connected to Google Drive. Scanning 8 top-level folders...' },
      { eventType: 'progress', message: 'Found 84 files across 21 folders. Beginning classification.' },
      { eventType: 'warning',  message: "vat_Q2_2024_AMENDED.pdf is in Finance (Old) — probably belongs in VAT. Flagged." },
      { eventType: 'error',    message: "CONFLICT: vat_return_Q2_2024_draft.pdf (£84,200) vs vat_Q2_2024_AMENDED.pdf (£91,500). Human review needed." },
      { eventType: 'warning',  message: "cashflow_forecast_v3_FINAL.xlsx is in 'Shared with me' not Finance — is this the live version?" },
      { eventType: 'error',    message: "CONFLICT: cashflow_forecast_v1.xlsx (Jan 2024) vs cashflow_forecast_v3_FINAL.xlsx (Mar 2024). Cannot determine canonical." },
      { eventType: 'warning',  message: "trial_balance_2024_COPY.xlsx found in Archive — appears identical to original. Duplicate?" },
      { eventType: 'error',    message: "CONFLICT: invoice_acme_march.pdf vs invoice_acme_march_COPY.pdf — same amount, filed in different folders." },
      { eventType: 'warning',  message: "payroll_march_2024.xlsx found in Expenses folder. expenses_march_2024.pdf found in Payroll folder. Swapped?" },
      { eventType: 'error',    message: "corp_tax_filing_2022.pdf found in both Finance (Old) and referenced from Compliance/Corp Tax." },
      { eventType: 'warning',  message: "vat_return_Q3_2024.pdf filed in Misc — should be in Compliance/HMRC (needed for open HMRC query)." },
      { eventType: 'error',    message: "Cannot read scan0042.pdf — blank scan, no extractable text." },
      { eventType: 'error',    message: "Cannot read 'Untitled document.docx' — file is empty." },
      { eventType: 'warning',  message: 'Sheets source OAuth expired. 0 spreadsheets retrieved from Client Comms Sheets.' },
      { eventType: 'progress', message: 'Identified 46 nodes. 7 contradictions flagged. 9 files in wrong folders. Human review required.' },
    ];

    for (const e of events) {
      await ctx.db.insert('agent_events', {
        clientId: cid, agentName: 'explorer-agent-1',
        eventType: e.eventType, message: e.message,
      });
    }

    return { message: 'Messy demo state seeded for Hartley & Associates LLP', nodesCreated: 46 };
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

// ─── RE-OWN DEMO CLIENTS ──────────────────────────────────────────────────────

/**
 * Reassign all demo clients (createdBy: 'demo') to a real user ID.
 * Run this after signing in to make demo data visible in the dashboard.
 *
 * Usage:
 *   npx convex run demoData:reownDemo '{"createdBy":"<your-workos-user-id>"}'
 */
export const reownDemo = mutation({
  args: { createdBy: v.string() },
  returns: v.object({ updated: v.number(), message: v.string() }),
  handler: async (ctx, args) => {
    const demos = await ctx.db
      .query('clients')
      .withIndex('by_createdBy', (q) => q.eq('createdBy', 'demo'))
      .collect();
    for (const client of demos) {
      await ctx.db.patch(client._id, { createdBy: args.createdBy });
    }
    return {
      updated: demos.length,
      message: `Reassigned ${demos.length} demo client(s) to ${args.createdBy}`,
    };
  },
});

/**
 * Reassign all demo clients to whoever is currently signed in.
 * Call this from the browser after signing in — no args needed.
 * The user ID is read from the WorkOS JWT automatically.
 */
export const claimDemoAsCurrentUser = mutation({
  args: {},
  returns: v.object({ updated: v.number(), userId: v.string(), message: v.string() }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated — sign in first');
    const userId = identity.subject;

    // Reassign any clients still under 'demo' or 'test-check'
    const toReassign = ['demo', 'test-check'];
    let total = 0;
    for (const oldOwner of toReassign) {
      const demos = await ctx.db
        .query('clients')
        .withIndex('by_createdBy', (q) => q.eq('createdBy', oldOwner))
        .collect();
      for (const client of demos) {
        await ctx.db.patch(client._id, { createdBy: userId });
      }
      total += demos.length;
    }
    return {
      updated: total,
      userId,
      message: `Reassigned ${total} demo client(s) to ${userId}`,
    };
  },
});
