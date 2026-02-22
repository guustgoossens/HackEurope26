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

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// ─── LIVE PIPELINE CLIENT ──────────────────────────────────────────────────────

const clientValidator = v.object({
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
});

/** Returns the live pipeline demo client (createdBy === "demo-live"), or null if not yet created. */
export const getLiveClient = query({
  args: {},
  returns: v.union(clientValidator, v.null()),
  handler: async (ctx) => {
    return await ctx.db
      .query('clients')
      .withIndex('by_createdBy', (q) => q.eq('createdBy', 'demo-live'))
      .first();
  },
});

/** Creates a fresh live demo client in the onboard phase (no seeded data). */
export const createLiveClient = mutation({
  args: {},
  returns: v.object({ clientId: v.id('clients') }),
  handler: async (ctx) => {
    const clientId = await ctx.db.insert('clients', {
      name: 'Hartley & Associates LLP',
      industry: 'Accountancy',
      phase: 'onboard',
      createdBy: 'demo-live',
    });
    return { clientId };
  },
});

/** Resets the live demo client back to onboard: clears all related data. */
export const resetLiveClient = mutation({
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

    await ctx.db.patch(args.clientId, { phase: 'onboard' });
    return null;
  },
});

// ─── CREATE CLIENT ────────────────────────────────────────────────────────────

export const createDemoClient = mutation({
  args: {},
  returns: v.object({ clientId: v.id('clients'), message: v.string() }),
  handler: async (ctx) => {
    const clientId = await ctx.db.insert('clients', {
      name: 'Cabinet Dupont & Associés',
      industry: 'Accountancy',
      phase: 'explore',
      createdBy: 'demo',
    });
    return { clientId, message: 'Demo client created: Cabinet Dupont & Associés' };
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
      clientId: cid, type: 'drive', label: 'Dupont Main Drive', connectionStatus: 'connected',
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
      metrics: { filesFound: 312, filesProcessed: 189, errored: 23 },
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

    const fFinance = await node('Finance', 'domain', 0, undefined, 'Top-level folder. Created 2014. Multiple sub-folders added by different staff over the years.');
    const fOldFinance = await node('Finance (Old)', 'domain', 1, undefined, 'Archived by James in 2019. Still has active files in it.');
    const fClients = await node('Clients', 'domain', 2, undefined, 'Client engagement files. Not all clients are here — some are in Misc.');
    const fHR = await node('HR', 'domain', 3, undefined, 'Staff records and payroll. Mixed with expenses in some subfolders.');
    const fCompliance = await node('Compliance', 'domain', 4, undefined, 'HMRC correspondence and regulatory filings.');
    const fMisc = await node('Misc', 'domain', 5, undefined, 'Catch-all folder. Contains ~60 files with no obvious home.');
    const fArchive = await node('Archive', 'domain', 6, undefined, 'Supposedly archived. Some files here are still in active use.');
    const fShared = await node('Shared with me', 'domain', 7, undefined, 'Files shared by clients directly. Some duplicated into other folders.');
    const fDesktop = await node('Desktop Uploads', 'domain', 8, undefined, '⚠️ Files someone dragged from their desktop. No structure whatsoever.');
    const fBoard = await node('Board', 'domain', 9, undefined, 'Board meeting packs and minutes. Mixed with general Finance docs.');
    const fOps = await node('Operations', 'domain', 10, undefined, 'Operational docs — IT, premises, software. Often confused with HR.');
    const fYear2022 = await node('2022', 'domain', 11, undefined, 'Year-based archive. Contains VAT, payroll, and client files for 2022.');
    const fYear2023 = await node('2023', 'domain', 12, undefined, 'Year-based archive. Overlaps heavily with Finance and Clients folders.');

    // ── Sub-folders ───────────────────────────────────────────────
    // Finance sub-folders (some sensible, some not)
    const fVAT = await node('VAT', 'skill', 0, fFinance, 'VAT returns. Q2 2024 figure is disputed — see contradictions.');
    const fVATOld = await node('VAT Returns', 'skill', 1, fOldFinance, 'Old VAT folder. Should be archived but still referenced.');
    const fInvoices = await node('Invoices', 'skill', 2, fFinance, 'Client invoices. Acme invoices also appear in Misc.');
    const fInvOld = await node('Invoices Old', 'skill', 3, fOldFinance, 'Pre-2022 invoices. Agent found 3 post-2022 files here.');
    const fMgmt = await node('Management Accts', 'skill', 4, fFinance, 'Trial balance, P&L, cashflow. Two conflicting cashflow versions found.');
    const fExpenses = await node('Expenses', 'skill', 5, fHR, 'Staff expenses. Mixed with payroll records.');
    const fPayroll = await node('Payroll', 'skill', 6, fHR, 'Monthly payroll summaries. Some in HR/Expenses by mistake.');
    const fPension = await node('Pension', 'skill', 7, fHR, 'Auto-enrolment pension docs. Some in Misc, some in Compliance.');
    const fStaff = await node('Staff Records', 'skill', 8, fHR, 'Contracts, appraisals, offer letters. Mixed with payroll in some years.');
    const fIT = await node('IT & Systems', 'skill', 0, fOps, 'Software licences, IT invoices, hardware. Some in Finance/Invoices.');
    const fPremises = await node('Premises', 'skill', 1, fOps, 'Office lease, utility bills. Some utility bills in Expenses.');

    // Clients sub-folders
    const fAcme = await node('Acme Ltd', 'skill', 0, fClients, 'Engagement letter Jan 2024. Active invoice dispute. Some files in Misc.');
    const fAcmeOld = await node('Acme (2021-2023)', 'skill', 1, fArchive, 'Old Acme files. Should be archived but invoice_acme_feb referenced here.');
    const fBright = await node('Brightfield Co', 'skill', 2, fClients, 'Engagement letter Feb 2024. No disputes. Trial balance shared directly.');
    const fNorton = await node('Norton & Sons', 'skill', 3, fMisc, 'New client. Files dropped into Misc — not yet organised.');
    const fPeak = await node('Peak Ventures', 'skill', 4, fClients, 'Long-standing client since 2016. Annual audit files scattered.');
    const fPeakOld = await node('Peak Ventures OLD', 'skill', 5, fYear2022, '⚠️ Old Peak Ventures folder in 2022 archive — conflicts with Clients/Peak Ventures.');
    const fRiverdale = await node('Riverdale Group', 'skill', 6, fClients, 'Acquired client 2023. Files partially migrated from old accountant.');
    const fMason = await node('Mason & Clark', 'skill', 7, fArchive, '⚠️ Former client, supposedly archived. Contract still in active Clients folder.');

    // Compliance sub-folders
    const fHMRC = await node('HMRC', 'skill', 0, fCompliance, 'HMRC correspondence. Q3 VAT query open since Sep 2024.');
    const fCorp = await node('Corp Tax', 'skill', 1, fCompliance, 'Corporation tax filings. 2022 filing also appears in Finance (Old).');
    const fAML = await node('AML & KYC', 'skill', 2, fCompliance, 'Anti-money laundering checks. Client IDs scattered across Clients folder.');
    const fInsurance = await node('Insurance', 'skill', 3, fCompliance, 'PI insurance and PLC. Some in Misc, some in Operations.');

    // Board sub-folders
    const fBoardMins = await node('Minutes', 'skill', 0, fBoard, 'Board meeting minutes. Several in root Finance folder by mistake.');
    const fBoardPacks = await node('Board Packs', 'skill', 1, fBoard, 'Pre-meeting board packs. Often include P&L — duplicates Management Accts.');

    // Year archive sub-folders
    const f2022VAT = await node('VAT 2022', 'skill', 0, fYear2022, '2022 VAT returns. Agent found Q3 2022 also in Finance/VAT.');
    const f2023VAT = await node('VAT 2023', 'skill', 0, fYear2023, '2023 VAT returns. Conflicts with Finance (Old)/VAT Returns folder.');
    const f2023Pay = await node('Payroll 2023', 'skill', 1, fYear2023, '⚠️ 2023 payroll files duplicated here AND in HR/Payroll.');

    // ── ACTUAL FILES (entry_group nodes) ─────────────────────────
    // These are real files the agent found. Many are in the wrong folder.

    // VAT files
    const fVatDraft = await node('vat_return_Q2_2024_draft.pdf', 'entry_group', 0, fVAT, '⚠️ CONFLICT: Reports Q2 VAT as £84,200. Contradicted by amended version.');
    const fVatAmend = await node('vat_Q2_2024_AMENDED.pdf', 'entry_group', 1, fVATOld, '⚠️ CONFLICT: Reports Q2 VAT as £91,500. In wrong folder (Finance Old).');
    const fVatQ1 = await node('vat_return_Q1_2024.pdf', 'entry_group', 2, fVAT, 'Q1 2024 VAT return. Submitted. No disputes.');
    const fVatQ3 = await node('vat_return_Q3_2024.pdf', 'entry_group', 3, fMisc, '⚠️ Q3 VAT return filed in Misc — should be in Compliance/HMRC.');
    const fVatQ4 = await node('vat_return_Q4_2024_draft.pdf', 'entry_group', 4, fDesktop, '⚠️ Q4 2024 draft VAT return in Desktop Uploads — not filed anywhere properly.');
    const fVat2023Q1 = await node('vat_Q1_2023.pdf', 'entry_group', 0, f2023VAT, 'Q1 2023 VAT. Correctly archived.');
    const fVat2023Q2 = await node('vat_Q2_2023_v2.pdf', 'entry_group', 1, fVATOld, '⚠️ 2023 Q2 VAT in Finance (Old) — should be in 2023/VAT 2023.');
    const fVat2023Q3 = await node('vat_Q3_2023.pdf', 'entry_group', 2, f2023VAT, 'Q3 2023 VAT. Correctly archived.');
    const fVat2023Q4 = await node('vat_Q4_2023_FINAL.pdf', 'entry_group', 3, fMisc, '⚠️ Q4 2023 final VAT return in Misc — discovered by agent during sweep.');
    const fVat2022Q3 = await node('vat_Q3_2022_amended.pdf', 'entry_group', 0, f2022VAT, '⚠️ 2022 Q3 amended VAT. Also referenced from Finance/VAT.');

    // Invoice files — scattered
    const fInvAcmeFeb = await node('invoice_acme_feb_FINAL_v2.pdf', 'entry_group', 0, fInvOld, '⚠️ 2024 invoice in Invoices Old folder. Amount: £12,400.');
    const fInvAcmeMar = await node('invoice_acme_march.pdf', 'entry_group', 1, fMisc, '⚠️ Invoice in Misc. Possibly duplicate of Feb invoice.');
    const fInvAcmeMar2 = await node('invoice_acme_march_COPY.pdf', 'entry_group', 2, fAcmeOld, '⚠️ DUPLICATE: Copy of march invoice in old archive folder.');
    const fInvBright = await node('invoice_brightfield_Q1.pdf', 'entry_group', 3, fInvoices, 'Q1 invoice for Brightfield Co. Correct location.');
    const fInvNorton = await node('invoice_norton_jan.pdf', 'entry_group', 4, fMisc, 'Norton & Sons first invoice. Sitting in Misc with no structure.');
    const fInvPeakQ1 = await node('invoice_peak_Q1_2024.pdf', 'entry_group', 0, fPeak, 'Q1 2024 invoice for Peak Ventures. Correct location.');
    const fInvPeakQ2 = await node('invoice_peak_Q2_2024.pdf', 'entry_group', 1, fPeakOld, '⚠️ Q2 2024 Peak invoice filed in old 2022 archive folder.');
    const fInvRiver = await node('invoice_riverdale_onboarding.pdf', 'entry_group', 0, fRiverdale, 'Riverdale Group onboarding invoice. Correct location.');
    const fInvIT = await node('invoice_xero_licence_2024.pdf', 'entry_group', 0, fIT, 'Xero software licence invoice. Correct location.');
    const fInvITMisc = await node('adobe_invoice_FEB.pdf', 'entry_group', 0, fDesktop, '⚠️ Adobe licence invoice on Desktop — should be in IT & Systems.');

    // Management accounts — conflicting versions
    const fCashV1 = await node('cashflow_forecast_v1.xlsx', 'entry_group', 0, fMgmt, '⚠️ CONFLICT: Jan 2024 cashflow. Superseded by v3 but still referenced.');
    const fCashV3 = await node('cashflow_forecast_v3_FINAL.xlsx', 'entry_group', 1, fShared, '⚠️ CONFLICT: Mar 2024 FINAL cashflow. In "Shared with me" — not in Finance.');
    const fTrialBal = await node('trial_balance_2024.xlsx', 'entry_group', 2, fMgmt, 'Trial balance. Canonical version.');
    const fTrialCopy = await node('trial_balance_2024_COPY.xlsx', 'entry_group', 3, fArchive, '⚠️ DUPLICATE: Copy of trial balance in Archive — unclear if different.');
    const fPL2023 = await node('P&L_FY2023.xlsx', 'entry_group', 4, fOldFinance, 'P&L for 2023. In Finance (Old) but still referenced in HMRC query.');
    const fPL2022 = await node('P&L_FY2022.xlsx', 'entry_group', 0, fYear2022, 'P&L for 2022. Archived correctly.');
    const fPL2023v2 = await node('P&L_2023_REVISED.xlsx', 'entry_group', 5, fDesktop, '⚠️ CONFLICT: Revised P&L 2023 on Desktop — conflicts with P&L_FY2023.xlsx.');
    const fBoardPL = await node('board_pack_Q3_2024_PL_extract.xlsx', 'entry_group', 0, fBoardPacks, '⚠️ P&L extract in Board Packs — different format, same period as trial_balance_2024.');
    const fMgmtQ2 = await node('management_accounts_Q2_2024.pdf', 'entry_group', 1, fBoard, '⚠️ Q2 management accounts in root Board folder — should be in Finance/Management Accts.');
    const fBudget2024 = await node('budget_2024_v4.xlsx', 'entry_group', 2, fShared, '⚠️ Budget in Shared with me — partner sent for review, never filed.');
    const fBudgetOld = await node('budget_2024_APPROVED.xlsx', 'entry_group', 3, fArchive, '⚠️ CONFLICT: Approved budget in Archive — is this the same as v4?');

    // HR / Payroll files — mixed up
    const fPayMar = await node('payroll_march_2024.xlsx', 'entry_group', 0, fExpenses, '⚠️ Payroll file in Expenses folder — should be in Payroll.');
    const fExpMar = await node('expenses_march_2024.pdf', 'entry_group', 1, fPayroll, '⚠️ Expenses file in Payroll folder — wrong location.');
    const fPaySummary = await node('payroll_summary_2024.xlsx', 'entry_group', 2, fMisc, '⚠️ Annual payroll summary dropped in Misc.');
    const fPayJan = await node('payroll_jan_2024.xlsx', 'entry_group', 3, fPayroll, 'January 2024 payroll. Correct location.');
    const fPayFeb = await node('payroll_feb_2024.xlsx', 'entry_group', 4, fPayroll, 'February 2024 payroll. Correct location.');
    const fPay2023Dec = await node('payroll_dec_2023.xlsx', 'entry_group', 0, f2023Pay, 'December 2023 payroll. Correctly in year archive.');
    const fPay2023Sum = await node('payroll_2023_annual_summary.pdf', 'entry_group', 1, fPayroll, '⚠️ 2023 annual summary in current Payroll folder — should be in 2023 archive.');
    const fPensionAE = await node('auto_enrolment_declaration_2024.pdf', 'entry_group', 0, fMisc, '⚠️ Pension auto-enrolment declaration in Misc — regulatory doc needs to be in Compliance.');
    const fPensionSch = await node('pension_scheme_rules_v3.pdf', 'entry_group', 1, fPension, 'Pension scheme rules. Correct location.');
    const fStaffSarah = await node('contract_sarah_watson_2022.pdf', 'entry_group', 0, fStaff, 'Employment contract for Sarah Watson. Correct location.');
    const fStaffJames = await node('james_henderson_offer_letter.pdf', 'entry_group', 1, fDesktop, '⚠️ Offer letter for James Henderson on Desktop — never filed in HR.');
    const fAppraisal = await node('appraisals_2024_Q1.xlsx', 'entry_group', 2, fExpenses, '⚠️ Appraisal spreadsheet in Expenses folder — should be in Staff Records.');

    // HMRC / Compliance files
    const fHMRCLetter = await node('HMRC_Q3_query_letter.pdf', 'entry_group', 0, fHMRC, 'HMRC query letter re: Q3 VAT return. Deadline: 14 Mar 2025.');
    const fHMRCResp = await node('HMRC_response_draft.docx', 'entry_group', 1, fMisc, '⚠️ Draft HMRC response in Misc — needs to go to Compliance.');
    const fCorpTax22 = await node('corp_tax_filing_2022.pdf', 'entry_group', 2, fOldFinance, '⚠️ Corp tax filing in Finance (Old) — should be in Compliance/Corp Tax.');
    const fCorpTax23 = await node('corp_tax_filing_2023.pdf', 'entry_group', 0, fCorp, 'Corp tax filing 2023. Correct location.');
    const fCorpTax23v2 = await node('corp_tax_2023_revised.pdf', 'entry_group', 1, fDesktop, '⚠️ CONFLICT: Revised 2023 corp tax on Desktop — conflicts with filed version.');
    const fAMLAcme = await node('AML_check_acme_2024.pdf', 'entry_group', 0, fAML, 'AML/KYC check for Acme Ltd 2024. Correct location.');
    const fAMLNorton = await node('norton_ID_docs.pdf', 'entry_group', 0, fMisc, '⚠️ Norton & Sons ID docs in Misc — must go to Compliance/AML & KYC.');
    const fAMLPeak = await node('peak_ventures_KYC_2022.pdf', 'entry_group', 1, fPeakOld, '⚠️ Peak KYC docs in old 2022 folder — outdated, renewal due 2024.');
    const fInsurPI = await node('PI_insurance_certificate_2024.pdf', 'entry_group', 0, fInsurance, 'PI insurance certificate 2024. Correct location.');
    const fInsurOld = await node('PI_insurance_2022.pdf', 'entry_group', 1, fMisc, '⚠️ Old 2022 PI insurance in Misc — should be archived.');

    // Board files
    const fMinApr = await node('minutes_board_Apr_2024.docx', 'entry_group', 0, fBoardMins, 'April 2024 board minutes. Correct location.');
    const fMinJan = await node('minutes_board_Jan_2024.docx', 'entry_group', 1, fFinance, '⚠️ January 2024 board minutes in root Finance folder — wrong place.');
    const fMinJul = await node('minutes_board_Jul_2024.docx', 'entry_group', 2, fDesktop, '⚠️ July 2024 board minutes on Desktop — never filed.');
    const fBoardQ1 = await node('board_pack_Q1_2024.pdf', 'entry_group', 0, fBoardPacks, 'Q1 2024 board pack. Correct location.');
    const fBoardQ3 = await node('board_pack_Q3_2024.pdf', 'entry_group', 1, fMisc, '⚠️ Q3 2024 board pack in Misc — should be in Board/Board Packs.');

    // Client files — core
    const fAcmeEng = await node('acme_engagement_letter_2024.pdf', 'entry_group', 0, fAcme, 'Engagement letter signed Jan 2024.');
    const fBrightEng = await node('brightfield_engagement_2024.pdf', 'entry_group', 1, fBright, 'Engagement letter signed Feb 2024.');
    const fBrightTB = await node('brightfield_trial_balance.xlsx', 'entry_group', 2, fShared, '⚠️ Brightfield trial balance in "Shared with me" — not filed under client.');
    const fNortonEng = await node('norton_engagement_2024.pdf', 'entry_group', 3, fMisc, '⚠️ Norton engagement letter in Misc — client not set up yet.');
    const fPeakEng = await node('peak_ventures_engagement_2024.pdf', 'entry_group', 0, fPeak, 'Peak Ventures engagement renewal 2024. Correct location.');
    const fPeakAudit = await node('peak_audit_report_FY2023.pdf', 'entry_group', 1, fPeakOld, '⚠️ Peak audit report in old 2022 archive — this is a 2023 document.');
    const fPeakAudit2 = await node('peak_audit_FY2023_SIGNED.pdf', 'entry_group', 2, fMisc, '⚠️ CONFLICT: Signed version of Peak audit in Misc — same period as peak_audit_report_FY2023.pdf.');
    const fRiverEng = await node('riverdale_engagement_2023.pdf', 'entry_group', 1, fRiverdale, 'Riverdale engagement letter 2023. Correct location.');
    const fRiverHO = await node('riverdale_handover_notes.docx', 'entry_group', 2, fMisc, '⚠️ Riverdale handover notes from old accountant in Misc — needs filing.');
    const fMasonEng = await node('mason_clark_engagement_2021.pdf', 'entry_group', 0, fMason, 'Former client Mason & Clark. Archived but still in search results.');
    const fMasonInv = await node('invoice_mason_final_2022.pdf', 'entry_group', 1, fInvoices, '⚠️ Mason & Clark invoice in active Invoices folder — client left in 2022.');

    // Junk / unreadable / desktop dump
    const fScan = await node('scan0042.pdf', 'entry_group', 0, fMisc, '❌ Blank scan — no extractable text. Cannot classify.');
    const fScan2 = await node('scan0108.pdf', 'entry_group', 1, fDesktop, '❌ Scan of unknown document on Desktop. No metadata.');
    const fUntitled = await node('Untitled document.docx', 'entry_group', 2, fMisc, '❌ Empty document. Cannot classify.');
    const fNewFolder = await node('New folder', 'entry_group', 3, fMisc, '⚠️ Unnamed folder containing 3 unrelated files.');
    const fTemp = await node('temp_export_DO_NOT_SEND.xlsx', 'entry_group', 4, fDesktop, '⚠️ Temporary export on Desktop. Contains full client list — sensitive.');
    const fCopy2 = await node('Copy of Copy of P&L 2023.xlsx', 'entry_group', 5, fDesktop, '❌ Double-copy of P&L 2023. Cannot determine which version is canonical.');
    const fWIP = await node('WIP.docx', 'entry_group', 6, fMisc, '❌ Document called WIP. No other context. Cannot classify.');
    const fOldBackup = await node('BACKUP_finance_2021.zip', 'entry_group', 7, fArchive, '⚠️ Zip archive from 2021. Contains unknown files — agent cannot extract.');
    const fLeaseOfc = await node('office_lease_2020.pdf', 'entry_group', 0, fPremises, 'Office lease signed 2020. Correct location but 2020 version — has this been renewed?');
    const fLeaseNew = await node('office_lease_RENEWAL_2024.pdf', 'entry_group', 1, fDesktop, '⚠️ 2024 lease renewal on Desktop — not filed in Premises.');
    const fUtility = await node('utilities_Q1_2024.pdf', 'entry_group', 2, fExpenses, '⚠️ Utility bills in Expenses — should be in Operations/Premises.');

    void [
      fFinance, fOldFinance, fClients, fHR, fCompliance, fMisc, fArchive, fShared,
      fDesktop, fBoard, fOps, fYear2022, fYear2023,
      fVAT, fVATOld, fInvoices, fInvOld, fMgmt, fExpenses, fPayroll, fPension, fStaff, fIT, fPremises,
      fAcme, fAcmeOld, fBright, fNorton, fPeak, fPeakOld, fRiverdale, fMason,
      fHMRC, fCorp, fAML, fInsurance,
      fBoardMins, fBoardPacks,
      f2022VAT, f2023VAT, f2023Pay,
      fVatDraft, fVatAmend, fVatQ1, fVatQ3, fVatQ4, fVat2023Q1, fVat2023Q2, fVat2023Q3, fVat2023Q4, fVat2022Q3,
      fInvAcmeFeb, fInvAcmeMar, fInvAcmeMar2, fInvBright, fInvNorton,
      fInvPeakQ1, fInvPeakQ2, fInvRiver, fInvIT, fInvITMisc,
      fCashV1, fCashV3, fTrialBal, fTrialCopy, fPL2023, fPL2022, fPL2023v2,
      fBoardPL, fMgmtQ2, fBudget2024, fBudgetOld,
      fPayMar, fExpMar, fPaySummary, fPayJan, fPayFeb, fPay2023Dec, fPay2023Sum,
      fPensionAE, fPensionSch, fStaffSarah, fStaffJames, fAppraisal,
      fHMRCLetter, fHMRCResp, fCorpTax22, fCorpTax23, fCorpTax23v2,
      fAMLAcme, fAMLNorton, fAMLPeak, fInsurPI, fInsurOld,
      fMinApr, fMinJan, fMinJul, fBoardQ1, fBoardQ3,
      fAcmeEng, fBrightEng, fBrightTB, fNortonEng,
      fPeakEng, fPeakAudit, fPeakAudit2, fRiverEng, fRiverHO, fMasonEng, fMasonInv,
      fScan, fScan2, fUntitled, fNewFolder, fTemp, fCopy2, fWIP, fOldBackup,
      fLeaseOfc, fLeaseNew, fUtility,
    ];

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
        // ── VAT Q2 conflict ───────────────────────────────────────────
        {
          treeNodeId: fVatDraft, title: 'Q2 VAT (draft)', sourceRef: 'vat_return_Q2_2024_draft.pdf',
          content: 'Q2 2024 VAT liability: £84,200. This is the original submission.', confidence: 0.41
        },
        {
          treeNodeId: fVatAmend, title: 'Q2 VAT (amended)', sourceRef: 'vat_Q2_2024_AMENDED.pdf',
          content: 'Q2 2024 VAT liability: £91,500. Marked AMENDED — conflicts with draft.', confidence: 0.38
        },

        // ── HMRC query cross-links Q3 VAT + P&L ──────────────────────
        {
          treeNodeId: fHMRCLetter, title: 'HMRC Q3 Query', sourceRef: 'HMRC_Q3_query_letter.pdf',
          content: 'HMRC queried Q3 2024 VAT return. Supporting docs needed: Q3 VAT + management accounts.', confidence: 0.44
        },
        {
          treeNodeId: fVatQ3, title: 'Q3 VAT (in Misc)', sourceRef: 'vat_return_Q3_2024.pdf',
          content: 'Q3 VAT return. Should support HMRC response but filed in Misc. Deadline: 14 Mar 2025.', confidence: 0.51
        },

        // ── 2023 Q4 VAT in wrong place ────────────────────────────────
        {
          treeNodeId: fVat2023Q4, title: 'Q4 2023 VAT (in Misc)', sourceRef: 'vat_Q4_2023_FINAL.pdf',
          content: 'Q4 2023 final VAT return. Should be in 2023/VAT 2023 but found in Misc.', confidence: 0.47
        },
        {
          treeNodeId: f2023VAT, title: 'Q4 2023 VAT (ref)', sourceRef: 'vat_Q4_2023_FINAL.pdf',
          content: 'Same vat_Q4_2023_FINAL.pdf referenced from the 2023 VAT archive folder.', confidence: 0.47
        },

        // ── 2022 Q3 VAT amended: both in 2022 archive AND Finance/VAT ─
        {
          treeNodeId: fVat2022Q3, title: '2022 Q3 VAT Amended', sourceRef: 'vat_Q3_2022_amended.pdf',
          content: '2022 Q3 amended VAT return. Filed in 2022 archive but also referenced from Finance/VAT.', confidence: 0.53
        },
        {
          treeNodeId: fVAT, title: '2022 Q3 VAT (ref)', sourceRef: 'vat_Q3_2022_amended.pdf',
          content: 'Same amended Q3 2022 VAT return cross-referenced from Finance/VAT folder.', confidence: 0.53
        },

        // ── Cashflow conflict ─────────────────────────────────────────
        {
          treeNodeId: fCashV1, title: 'Cashflow v1', sourceRef: 'cashflow_forecast_v1.xlsx',
          content: 'Jan 2024 cashflow forecast. May have been superseded but still in active folder.', confidence: 0.33
        },
        {
          treeNodeId: fCashV3, title: 'Cashflow v3 FINAL', sourceRef: 'cashflow_forecast_v3_FINAL.xlsx',
          content: 'Mar 2024 cashflow. Labelled FINAL. Currently in "Shared with me" not Finance.', confidence: 0.62
        },

        // ── P&L 2023 conflict: original vs revised vs board extract ───
        {
          treeNodeId: fPL2023, title: 'P&L FY2023', sourceRef: 'P&L_FY2023.xlsx',
          content: 'Full P&L for FY2023. In Finance (Old) but needed for HMRC Q3 query response.', confidence: 0.77
        },
        {
          treeNodeId: fHMRCLetter, title: 'P&L referenced by HMRC', sourceRef: 'P&L_FY2023.xlsx',
          content: 'HMRC letter requests FY2023 P&L as supporting doc for VAT query.', confidence: 0.72
        },
        {
          treeNodeId: fPL2023v2, title: 'P&L 2023 Revised', sourceRef: 'P&L_2023_REVISED.xlsx',
          content: 'Revised P&L for 2023 on Desktop. Conflicts with P&L_FY2023.xlsx — different figures?', confidence: 0.31
        },
        {
          treeNodeId: fBoardPL, title: 'P&L in Board Pack', sourceRef: 'board_pack_Q3_2024_PL_extract.xlsx',
          content: 'P&L extract included in Q3 board pack. Different format from trial_balance_2024.xlsx but same period.', confidence: 0.44
        },
        {
          treeNodeId: fMgmt, title: 'P&L Board Extract (ref)', sourceRef: 'board_pack_Q3_2024_PL_extract.xlsx',
          content: 'Same P&L extract referenced from Management Accts folder.', confidence: 0.44
        },

        // ── Budget conflict: v4 vs APPROVED ──────────────────────────
        {
          treeNodeId: fBudget2024, title: 'Budget 2024 v4', sourceRef: 'budget_2024_v4.xlsx',
          content: 'Budget 2024 version 4. Shared by partner for review — never filed. Is this the latest?', confidence: 0.39
        },
        {
          treeNodeId: fBudgetOld, title: 'Budget 2024 Approved', sourceRef: 'budget_2024_APPROVED.xlsx',
          content: 'Approved budget in Archive. Created same week as v4 — unclear which is canonical.', confidence: 0.41
        },

        // ── Trial balance duplicate ───────────────────────────────────
        {
          treeNodeId: fTrialBal, title: 'Trial Balance', sourceRef: 'trial_balance_2024.xlsx',
          content: 'Trial balance 2024. This appears to be the canonical version.', confidence: 0.71
        },
        {
          treeNodeId: fTrialCopy, title: 'Trial Balance COPY', sourceRef: 'trial_balance_2024_COPY.xlsx',
          content: 'Duplicate of trial balance in Archive. Unclear if different data.', confidence: 0.29
        },

        // ── Acme invoices scattered ───────────────────────────────────
        {
          treeNodeId: fInvAcmeFeb, title: 'Acme Feb Invoice', sourceRef: 'invoice_acme_feb_FINAL_v2.pdf',
          content: 'Feb 2024 invoice for Acme Ltd. £12,400. Filed in Invoices Old despite being 2024.', confidence: 0.55
        },
        {
          treeNodeId: fAcme, title: 'Acme Feb Invoice (ref)', sourceRef: 'invoice_acme_feb_FINAL_v2.pdf',
          content: 'Same invoice_acme_feb_FINAL_v2.pdf referenced from Acme client folder too.', confidence: 0.55
        },
        {
          treeNodeId: fInvAcmeMar, title: 'Acme March Invoice', sourceRef: 'invoice_acme_march.pdf',
          content: 'March 2024 invoice in Misc. Amount unclear — possible duplicate of Feb.', confidence: 0.29
        },
        {
          treeNodeId: fInvAcmeMar2, title: 'Acme March COPY', sourceRef: 'invoice_acme_march.pdf',
          content: 'Copy of march invoice found in archive. Same sourceRef — likely duplicate.', confidence: 0.21
        },

        // ── Peak Ventures invoice in wrong year folder ────────────────
        {
          treeNodeId: fInvPeakQ2, title: 'Peak Q2 Invoice (wrong folder)', sourceRef: 'invoice_peak_Q2_2024.pdf',
          content: 'Q2 2024 invoice for Peak Ventures filed in 2022 archive — should be in Clients/Peak Ventures.', confidence: 0.49
        },
        {
          treeNodeId: fPeak, title: 'Peak Q2 Invoice (ref)', sourceRef: 'invoice_peak_Q2_2024.pdf',
          content: 'Same invoice_peak_Q2_2024.pdf referenced from Peak Ventures client folder.', confidence: 0.49
        },

        // ── Peak audit report conflict: unsigned vs signed ─────────────
        {
          treeNodeId: fPeakAudit, title: 'Peak Audit FY2023', sourceRef: 'peak_audit_report_FY2023.pdf',
          content: 'Peak Ventures audit report FY2023. In old 2022 archive — this is a 2023 document.', confidence: 0.55
        },
        {
          treeNodeId: fPeakAudit2, title: 'Peak Audit FY2023 Signed', sourceRef: 'peak_audit_FY2023_SIGNED.pdf',
          content: 'Signed version of Peak Ventures FY2023 audit. In Misc — conflicts with unsigned version in archive.', confidence: 0.52
        },
        {
          treeNodeId: fPeak, title: 'Peak Audit (ref)', sourceRef: 'peak_audit_report_FY2023.pdf',
          content: 'Peak audit report cross-referenced from Clients/Peak Ventures folder.', confidence: 0.55
        },

        // ── Brightfield trial balance cross-reference ─────────────────
        {
          treeNodeId: fBrightTB, title: 'Brightfield Trial Bal', sourceRef: 'brightfield_trial_balance.xlsx',
          content: 'Trial balance for Brightfield Co. In "Shared with me" — client sent directly.', confidence: 0.68
        },
        {
          treeNodeId: fBright, title: 'Brightfield TB (ref)', sourceRef: 'brightfield_trial_balance.xlsx',
          content: 'Same file referenced from Brightfield client folder.', confidence: 0.68
        },

        // ── Corp tax 2022 in wrong place ──────────────────────────────
        {
          treeNodeId: fCorpTax22, title: 'Corp Tax 2022', sourceRef: 'corp_tax_filing_2022.pdf',
          content: 'Corporation tax filing 2022. In Finance (Old) — should be in Compliance/Corp Tax.', confidence: 0.61
        },
        {
          treeNodeId: fCorp, title: 'Corp Tax 2022 (ref)', sourceRef: 'corp_tax_filing_2022.pdf',
          content: 'Same filing referenced from Corp Tax folder — file is actually in Finance (Old).', confidence: 0.61
        },

        // ── Corp tax 2023 conflict: filed vs revised ──────────────────
        {
          treeNodeId: fCorpTax23, title: 'Corp Tax 2023 Filed', sourceRef: 'corp_tax_filing_2023.pdf',
          content: 'Corporation tax filing 2023. Submitted to HMRC. Correct location in Compliance/Corp Tax.', confidence: 0.82
        },
        {
          treeNodeId: fCorpTax23v2, title: 'Corp Tax 2023 Revised', sourceRef: 'corp_tax_2023_revised.pdf',
          content: 'Revised corp tax 2023 on Desktop. Conflicts with the already-filed version.', confidence: 0.34
        },

        // ── Payroll/expenses in wrong folders ────────────────────────
        {
          treeNodeId: fPayMar, title: 'March Payroll', sourceRef: 'payroll_march_2024.xlsx',
          content: 'Payroll for March 2024. In Expenses folder — should be in Payroll.', confidence: 0.48
        },
        {
          treeNodeId: fExpMar, title: 'March Expenses', sourceRef: 'expenses_march_2024.pdf',
          content: 'Staff expenses March 2024. In Payroll folder — should be in Expenses.', confidence: 0.48
        },

        // ── 2023 payroll annual summary in wrong folder ───────────────
        {
          treeNodeId: fPay2023Sum, title: '2023 Payroll Summary', sourceRef: 'payroll_2023_annual_summary.pdf',
          content: '2023 annual payroll summary in current Payroll folder — should be in 2023 archive.', confidence: 0.52
        },
        {
          treeNodeId: f2023Pay, title: '2023 Payroll Summary (ref)', sourceRef: 'payroll_2023_annual_summary.pdf',
          content: 'Same payroll_2023_annual_summary.pdf referenced from 2023/Payroll 2023 archive.', confidence: 0.52
        },

        // ── Pension AE declaration in Misc ────────────────────────────
        {
          treeNodeId: fPensionAE, title: 'AE Declaration (Misc)', sourceRef: 'auto_enrolment_declaration_2024.pdf',
          content: 'Pension auto-enrolment declaration 2024. Regulatory doc in Misc — must be in Compliance.', confidence: 0.43
        },
        {
          treeNodeId: fCompliance, title: 'AE Declaration (ref)', sourceRef: 'auto_enrolment_declaration_2024.pdf',
          content: 'Same auto-enrolment declaration cross-referenced from Compliance folder (not filed there yet).', confidence: 0.43
        },

        // ── Mason & Clark invoice in active Invoices ──────────────────
        {
          treeNodeId: fMasonInv, title: 'Mason Invoice (archived client)', sourceRef: 'invoice_mason_final_2022.pdf',
          content: 'Final invoice for Mason & Clark (2022). Client left in 2022 but invoice is in active Invoices folder.', confidence: 0.66
        },
        {
          treeNodeId: fMason, title: 'Mason Invoice (ref)', sourceRef: 'invoice_mason_final_2022.pdf',
          content: 'Same invoice_mason_final_2022.pdf referenced from Mason & Clark archive folder.', confidence: 0.66
        },

        // ── Adobe invoice on Desktop vs IT & Systems ──────────────────
        {
          treeNodeId: fInvITMisc, title: 'Adobe Invoice (Desktop)', sourceRef: 'adobe_invoice_FEB.pdf',
          content: 'Adobe Creative Cloud invoice Feb 2024. On Desktop — should be in Operations/IT & Systems.', confidence: 0.58
        },
        {
          treeNodeId: fIT, title: 'Adobe Invoice (ref)', sourceRef: 'adobe_invoice_FEB.pdf',
          content: 'Same adobe_invoice_FEB.pdf referenced from IT & Systems folder.', confidence: 0.58
        },

        // ── Board minutes scattered ───────────────────────────────────
        {
          treeNodeId: fMinJan, title: 'Jan Board Minutes (Finance)', sourceRef: 'minutes_board_Jan_2024.docx',
          content: 'January 2024 board minutes found in root Finance folder — should be in Board/Minutes.', confidence: 0.71
        },
        {
          treeNodeId: fBoardMins, title: 'Jan Board Minutes (ref)', sourceRef: 'minutes_board_Jan_2024.docx',
          content: 'Same minutes_board_Jan_2024.docx referenced from Board/Minutes folder.', confidence: 0.71
        },

        // ── Lease renewal on Desktop ──────────────────────────────────
        {
          treeNodeId: fLeaseNew, title: 'Office Lease Renewal', sourceRef: 'office_lease_RENEWAL_2024.pdf',
          content: '2024 lease renewal on Desktop. Related to office_lease_2020.pdf in Premises.', confidence: 0.62
        },
        {
          treeNodeId: fLeaseOfc, title: 'Office Lease 2020 (ref)', sourceRef: 'office_lease_RENEWAL_2024.pdf',
          content: 'Renewal referenced from original 2020 lease location in Operations/Premises.', confidence: 0.62
        },

        // ── AML docs for Norton in Misc ───────────────────────────────
        {
          treeNodeId: fAMLNorton, title: 'Norton AML Docs (Misc)', sourceRef: 'norton_ID_docs.pdf',
          content: 'Norton & Sons ID/KYC documents in Misc. Must be filed in Compliance/AML & KYC.', confidence: 0.51
        },
        {
          treeNodeId: fAML, title: 'Norton AML (ref)', sourceRef: 'norton_ID_docs.pdf',
          content: 'Same norton_ID_docs.pdf referenced from AML & KYC folder.', confidence: 0.51
        },
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
          sourceB: 'vat_Q2_2024_AMENDED.pdf', valueB: '£91,500 (amendment — which is correct?)',
        },
        {
          description: 'Cashflow forecast: v1 (Jan) vs v3_FINAL (Mar) — which is the live version?',
          sourceA: 'cashflow_forecast_v1.xlsx', valueA: 'Created Jan 2024, still in Finance folder',
          sourceB: 'cashflow_forecast_v3_FINAL.xlsx', valueB: 'Created Mar 2024, in "Shared with me"',
        },
        {
          description: 'Trial balance 2024 duplicated — original vs copy',
          sourceA: 'trial_balance_2024.xlsx', valueA: 'Modified 14 Mar 2024 — in Management Accts',
          sourceB: 'trial_balance_2024_COPY.xlsx', valueB: 'Modified 15 Mar 2024 — in Archive. Same data?',
        },
        {
          description: 'Acme Ltd March invoice: two files with same amount, different dates',
          sourceA: 'invoice_acme_march.pdf', valueA: 'In Misc — March 2024, £13,200',
          sourceB: 'invoice_acme_march_COPY.pdf', valueB: 'In Acme Old archive — same amount, earlier date',
        },
        {
          description: 'Acme Feb invoice vs March invoice — possible duplicate billing',
          sourceA: 'invoice_acme_feb_FINAL_v2.pdf', valueA: '£12,400 — February services',
          sourceB: 'invoice_acme_march.pdf', valueB: '£13,200 — overlapping date range with Feb?',
        },
        {
          description: 'Payroll March 2024 vs Expenses March 2024 — filed in each other\'s folders',
          sourceA: 'payroll_march_2024.xlsx', valueA: 'In Expenses folder — should be in Payroll',
          sourceB: 'expenses_march_2024.pdf', valueB: 'In Payroll folder — should be in Expenses',
        },
        {
          description: 'Corporation tax 2022: filed in two locations — Finance (Old) and Compliance',
          sourceA: 'corp_tax_filing_2022.pdf', valueA: 'Found in Finance (Old)',
          sourceB: 'corp_tax_filing_2022.pdf', valueB: 'Referenced from Compliance/Corp Tax — same file?',
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
      { eventType: 'info', message: 'Connected to Google Drive. Scanning 8 top-level folders...' },
      { eventType: 'progress', message: 'Found 84 files across 21 folders. Beginning classification.' },
      { eventType: 'warning', message: "vat_Q2_2024_AMENDED.pdf is in Finance (Old) — probably belongs in VAT. Flagged." },
      { eventType: 'error', message: "CONFLICT: vat_return_Q2_2024_draft.pdf (£84,200) vs vat_Q2_2024_AMENDED.pdf (£91,500). Human review needed." },
      { eventType: 'warning', message: "cashflow_forecast_v3_FINAL.xlsx is in 'Shared with me' not Finance — is this the live version?" },
      { eventType: 'error', message: "CONFLICT: cashflow_forecast_v1.xlsx (Jan 2024) vs cashflow_forecast_v3_FINAL.xlsx (Mar 2024). Cannot determine canonical." },
      { eventType: 'warning', message: "trial_balance_2024_COPY.xlsx found in Archive — appears identical to original. Duplicate?" },
      { eventType: 'error', message: "CONFLICT: invoice_acme_march.pdf vs invoice_acme_march_COPY.pdf — same amount, filed in different folders." },
      { eventType: 'warning', message: "payroll_march_2024.xlsx found in Expenses folder. expenses_march_2024.pdf found in Payroll folder. Swapped?" },
      { eventType: 'error', message: "corp_tax_filing_2022.pdf found in both Finance (Old) and referenced from Compliance/Corp Tax." },
      { eventType: 'warning', message: "vat_return_Q3_2024.pdf filed in Misc — should be in Compliance/HMRC (needed for open HMRC query)." },
      { eventType: 'error', message: "Cannot read scan0042.pdf — blank scan, no extractable text." },
      { eventType: 'error', message: "Cannot read 'Untitled document.docx' — file is empty." },
      { eventType: 'warning', message: 'Sheets source OAuth expired. 0 spreadsheets retrieved from Client Comms Sheets.' },
      { eventType: 'progress', message: 'Identified 46 nodes. 7 contradictions flagged. 9 files in wrong folders. Human review required.' },
    ];

    for (const e of events) {
      await ctx.db.insert('agent_events', {
        clientId: cid, agentName: 'explorer-agent-1',
        eventType: e.eventType, message: e.message,
      });
    }

    return { message: 'Messy demo state seeded for Cabinet Dupont & Associés', nodesCreated: 46 };
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
      label: 'Dupont Main Drive',
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
      readme: 'All financial records for Cabinet Dupont & Associés. Covers invoices, VAT, management accounts, and expenses.',
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
      { treeNodeId: vat, title: 'Q1 2024 VAT Return', content: 'VAT Return Q1 2024. Submitted on time. No outstanding queries.', confidence: 0.97, verified: true },
      { treeNodeId: vat, title: 'Q2 2024 VAT Return (Amended)', content: 'Q2 2024 VAT liability confirmed: £91,500 (amended figure, user-verified). Original draft (£84,200) deprecated.', confidence: 0.99, verified: true },
      { treeNodeId: mgmtAccts, title: 'Cashflow Forecast 2024', content: 'Canonical version: cashflow_forecast_v3_FINAL.xlsx (March 2024). Earlier versions deprecated.', confidence: 0.98, verified: true },
      { treeNodeId: mgmtAccts, title: 'Trial Balance 2024', content: 'Canonical version: trial_balance_2024.xlsx. The _COPY version has been removed.', confidence: 0.96, verified: true },
      { treeNodeId: mgmtAccts, title: "P&L 2023", content: 'Full P&L for FY2023. Clean, no duplicates.', confidence: 0.99, verified: true },
      { treeNodeId: acme, title: 'Acme Ltd — Engagement', content: 'Engagement letter signed Jan 2024. Invoice dispute on March invoice — see HMRC/Acme email thread.', confidence: 0.98, verified: true },
      { treeNodeId: inv2024, title: 'Acme Ltd — Feb Invoice', content: 'Invoice for Feb 2024 services. Amount: £12,400. Canonical: invoice_acme_feb_FINAL_v2.pdf', confidence: 0.97, verified: true },
      { treeNodeId: inv2024, title: 'Acme Ltd — March Invoice', content: 'Invoice for March 2024. Disputed by client — see email thread.', confidence: 0.91, verified: true },
      { treeNodeId: hmrc, title: 'HMRC Q3 VAT Query', content: 'HMRC queried Q3 VAT return. Response deadline: 14 March 2025. Supporting docs: Q3 VAT filing + management accounts.', confidence: 0.95, verified: true },
      { treeNodeId: hmrc, title: 'HMRC Jan Correspondence', content: 'Routine correspondence from HMRC re: annual review. No action required.', confidence: 0.99, verified: true },
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
      { eventType: 'info', message: 'Structure job started. Processing 42 discovered nodes.' },
      { eventType: 'progress', message: "Merging duplicates: 'Acme' + 'Acme Ltd' + 'Acme Ltd (2024)' + 'acme_stuff' → 'Acme Ltd'" },
      { eventType: 'progress', message: "Merging: 'VAT' + 'VAT Returns' + 'vat_Q2_AMENDED' + 'VAT 2024' → 'VAT Filings'" },
      { eventType: 'info', message: 'Contradiction resolved via user input: Q2 VAT = £91,500 (amended). Draft deprecated.' },
      { eventType: 'info', message: 'Canonical cashflow confirmed: v3_FINAL. Earlier version archived.' },
      { eventType: 'progress', message: 'Built Finance hierarchy: Invoices → 2024 Invoices, VAT Filings, Management Accounts, Expenses.' },
      { eventType: 'progress', message: 'Built Clients hierarchy: Acme Ltd, Brightfield Co.' },
      { eventType: 'progress', message: 'Built Compliance hierarchy: HMRC Correspondence.' },
      { eventType: 'info', message: 'Generated READMEs for 12 nodes. 11 verified, 1 pending.' },
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

    return { message: 'Clean demo state seeded for Cabinet Dupont & Associés', nodesCreated: 12 };
  },
});

// ─── RESTRUCTURE KNOWLEDGE (real DB transition: messy → clean) ───────────────

export const restructureKnowledge = mutation({
  args: { clientId: v.id('clients') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const cid = args.clientId;

    // 1. Delete messy knowledge_tree nodes
    const nodes = await ctx.db
      .query('knowledge_tree')
      .withIndex('by_clientId', (q) => q.eq('clientId', cid))
      .collect();
    for (const n of nodes) await ctx.db.delete(n._id);

    // 2. Delete messy knowledge_entries
    const entries = await ctx.db
      .query('knowledge_entries')
      .withIndex('by_clientId', (q) => q.eq('clientId', cid))
      .collect();
    for (const e of entries) await ctx.db.delete(e._id);

    // 2.5 Delete old contradictions
    const oldContradictions = await ctx.db
      .query('contradictions')
      .withIndex('by_clientId', (q) => q.eq('clientId', cid))
      .collect();
    for (const c of oldContradictions) await ctx.db.delete(c._id);

    // 2.6 Delete old questionnaires
    const oldQuestionnaires = await ctx.db
      .query('questionnaires')
      .withIndex('by_clientId', (q) => q.eq('clientId', cid))
      .collect();
    for (const q of oldQuestionnaires) await ctx.db.delete(q._id);

    // 3. Insert clean 3-level hierarchy (11 nodes)
    const finance = await ctx.db.insert('knowledge_tree', {
      clientId: cid, name: 'Finance', type: 'domain', order: 0,
      readme: 'All financial records for Cabinet Dupont & Associés. Covers invoices, VAT, management accounts, and expenses.',
    });
    const clients = await ctx.db.insert('knowledge_tree', {
      clientId: cid, name: 'Clients', type: 'domain', order: 1,
      readme: 'Client records, engagement letters, and correspondence.',
    });
    const compliance = await ctx.db.insert('knowledge_tree', {
      clientId: cid, name: 'Compliance', type: 'domain', order: 2,
      readme: 'Regulatory and HMRC-related documents.',
    });
    const invoices = await ctx.db.insert('knowledge_tree', {
      clientId: cid, name: 'Invoices', type: 'skill', order: 0, parentId: finance,
      readme: 'Client invoices by year and quarter. All duplicates resolved.',
    });
    const vat = await ctx.db.insert('knowledge_tree', {
      clientId: cid, name: 'VAT Filings', type: 'skill', order: 1, parentId: finance,
      readme: 'VAT returns by quarter. Q2 2024 uses amended figure of £91,500 (confirmed by user).',
    });
    await ctx.db.insert('knowledge_tree', {
      clientId: cid, name: 'Management Accounts', type: 'skill', order: 2, parentId: finance,
      readme: 'Trial balance, P&L, and cashflow forecasts. Canonical cashflow: v3_FINAL (March 2024).',
    });
    await ctx.db.insert('knowledge_tree', {
      clientId: cid, name: 'Expenses & Payroll', type: 'skill', order: 3, parentId: finance,
      readme: 'Staff expenses and payroll. March 2024 files correctly separated.',
    });
    await ctx.db.insert('knowledge_tree', {
      clientId: cid, name: 'Acme Ltd', type: 'skill', order: 0, parentId: clients,
      readme: 'Engagement letter signed Jan 2024. Active invoice dispute on March invoice.',
    });
    await ctx.db.insert('knowledge_tree', {
      clientId: cid, name: 'Brightfield Co', type: 'skill', order: 1, parentId: clients,
      readme: 'Engagement letter signed Feb 2024. No outstanding disputes.',
    });
    await ctx.db.insert('knowledge_tree', {
      clientId: cid, name: 'HMRC Correspondence', type: 'skill', order: 0, parentId: compliance,
      readme: 'All HMRC inbound/outbound correspondence. Q3 VAT query open — deadline 14 Mar 2025.',
    });
    await ctx.db.insert('knowledge_tree', {
      clientId: cid, name: '2024 Invoices', type: 'entry_group', order: 0, parentId: invoices,
      readme: 'All 2024 invoices. Acme Ltd: Q1 (3 invoices), Q2 (1 invoice).',
    });

    // 4. Insert verified knowledge entries for the clean nodes
    const cleanEntries = [
      { treeNodeId: vat, title: 'Q2 2024 VAT (Amended)', content: 'Q2 2024 VAT liability confirmed: £91,500 (amended, user-verified). Original draft (£84,200) deprecated.', confidence: 0.99 },
      { treeNodeId: vat, title: 'Q1 2024 VAT Return', content: 'Q1 2024 VAT return. Submitted on time. No outstanding queries.', confidence: 0.97 },
      { treeNodeId: invoices, title: 'Acme Feb Invoice', content: 'Invoice for Feb 2024. Amount: £12,400. Canonical: invoice_acme_feb_FINAL_v2.pdf', confidence: 0.97 },
    ];
    for (const e of cleanEntries) {
      await ctx.db.insert('knowledge_entries', {
        clientId: cid,
        treeNodeId: e.treeNodeId,
        title: e.title,
        content: e.content,
        confidence: e.confidence,
        verified: true,
      });
    }

    // 5. Add structure agent events (AgentFeed updates reactively)
    const structureEvents: Array<{ eventType: 'info' | 'progress' | 'warning' | 'error' | 'complete'; message: string }> = [
      { eventType: 'info', message: 'Structure job started. Processing 46 discovered nodes.' },
      { eventType: 'progress', message: "Merging duplicates: 'Finance' + 'Finance (Old)' + 'Archive' + 'Desktop Uploads' → 'Finance'" },
      { eventType: 'progress', message: "Merging: 'VAT' + 'VAT Returns' + '2022/VAT 2022' + '2023/VAT 2023' → 'VAT Filings'" },
      { eventType: 'info', message: 'Contradiction resolved: Q2 VAT = £91,500 (amended). Draft figure of £84,200 deprecated.' },
      { eventType: 'info', message: 'Canonical cashflow confirmed: v3_FINAL (March 2024). Earlier version archived.' },
      { eventType: 'progress', message: 'Built Finance hierarchy: Invoices → VAT Filings → Management Accounts → Expenses & Payroll.' },
      { eventType: 'progress', message: 'Built Clients hierarchy: Acme Ltd, Brightfield Co. (Norton & Sons: pending — no engagement letter).' },
      { eventType: 'progress', message: 'Built Compliance hierarchy: HMRC Correspondence.' },
      { eventType: 'complete', message: 'Structure complete. 46 nodes → 11. 3 contradictions resolved. Knowledge base ready for human verification.' },
    ];
    for (const e of structureEvents) {
      await ctx.db.insert('agent_events', {
        clientId: cid, agentName: 'structure-agent-1',
        eventType: e.eventType, message: e.message,
      });
    }

    // 6. Update pipeline status
    const pipelineStatus = await ctx.db
      .query('pipeline_status')
      .withIndex('by_clientId', (q) => q.eq('clientId', cid))
      .first();
    if (pipelineStatus) {
      await ctx.db.patch(pipelineStatus._id, {
        currentPhase: 'structure',
        phaseProgress: 100,
        activeAgents: [],
        lastActivity: Date.now(),
      });
    }

    // 7. Insert resolved/open contradictions and a questionnaire for Phase 3
    await ctx.db.insert('contradictions', {
      clientId: cid,
      description: 'Q2 2024 VAT liability — two different figures',
      sourceA: 'vat_return_Q2_2024_draft.pdf',
      sourceB: 'vat_Q2_AMENDED.pdf',
      valueA: '£84,200',
      valueB: '£91,500',
      status: 'resolved',
      resolution: 'User confirmed £91,500 (amended) is correct. Draft deprecated.',
    });

    await ctx.db.insert('contradictions', {
      clientId: cid,
      description: 'Cashflow forecast — two versions',
      sourceA: 'cashflow_forecast_v1.xlsx',
      sourceB: 'cashflow_forecast_v3_FINAL.xlsx',
      valueA: 'Jan 2024 version',
      valueB: 'Mar 2024 version (FINAL)',
      status: 'resolved',
      resolution: 'v3_FINAL selected as canonical. v1 archived.',
    });

    await ctx.db.insert('contradictions', {
      clientId: cid,
      description: 'Trial balance duplicated',
      sourceA: 'trial_balance_2024.xlsx',
      sourceB: 'trial_balance_2024_COPY.xlsx',
      valueA: 'Original',
      valueB: 'Copy (same content)',
      status: 'resolved',
      resolution: 'Original confirmed canonical. Copy removed.',
    });

    const openContradiction = await ctx.db.insert('contradictions', {
      clientId: cid,
      description: 'Acme invoice: possible duplicate across folders',
      sourceA: 'invoice_acme_feb_FINAL_v2.pdf',
      sourceB: 'invoice_acme_march.pdf',
      valueA: 'Found in /Drive/Invoices Old/',
      valueB: 'Found in /Drive/Random Stuff/',
      status: 'open',
    });

    await ctx.db.insert('questionnaires', {
      clientId: cid,
      title: 'Data Verification - Cabinet Dupont',
      questions: [
        {
          id: 'q1',
          text: 'Is the March invoice for Acme Ltd a duplicate of the February invoice?',
          options: ['Yes, it is a duplicate document.', 'No, they are separate invoices.', 'I need to check with the partner.'],
          contradictionId: openContradiction,
        },
        {
          id: 'q2',
          text: 'Which accounting software is primarily used for VAT submissions?',
          options: ['Xero', 'QuickBooks', 'Sage', 'FreeAgent'],
        }
      ],
      status: 'sent',
    });

    return null;
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
