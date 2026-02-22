export interface LandingNode {
  id: string;
  label: string;
  depth: 0 | 1 | 2;
  status: 'verified' | 'draft';
  parent?: string;
  group: string;
}

export interface LandingEdge {
  source: string;
  target: string;
  type: 'parent_of' | 'depends_on' | 'references' | 'temporal';
}

export const landingNodes: LandingNode[] = [
  // Depth 0 — roots
  { id: 'finance', label: 'Finance', depth: 0, status: 'verified', group: 'finance' },
  { id: 'compliance', label: 'Compliance', depth: 0, status: 'draft', group: 'compliance' },
  { id: 'clients', label: 'Clients', depth: 0, status: 'draft', group: 'clients' },
  { id: 'operations', label: 'Operations', depth: 0, status: 'draft', group: 'operations' },
  // Depth 1
  { id: 'invoices', label: 'Invoices', depth: 1, status: 'verified', parent: 'finance', group: 'finance' },
  { id: 'vat', label: 'VAT Filings', depth: 1, status: 'draft', parent: 'finance', group: 'finance' },
  { id: 'treasury', label: 'Treasury', depth: 1, status: 'draft', parent: 'finance', group: 'finance' },
  { id: 'annual-reports', label: 'Annual Reports', depth: 1, status: 'draft', parent: 'finance', group: 'finance' },
  { id: 'tax-returns', label: 'Tax Returns', depth: 1, status: 'draft', parent: 'compliance', group: 'compliance' },
  { id: 'audit-reports', label: 'Audit Reports', depth: 1, status: 'draft', parent: 'compliance', group: 'compliance' },
  { id: 'regulatory', label: 'Regulatory Filings', depth: 1, status: 'draft', parent: 'compliance', group: 'compliance' },
  { id: 'martin', label: 'Martin SARL', depth: 1, status: 'draft', parent: 'clients', group: 'clients' },
  { id: 'dupont', label: 'Dupont SAS', depth: 1, status: 'draft', parent: 'clients', group: 'clients' },
  { id: 'bernard', label: 'Bernard & Co', depth: 1, status: 'draft', parent: 'clients', group: 'clients' },
  { id: 'procedures', label: 'Procedures', depth: 1, status: 'draft', parent: 'operations', group: 'operations' },
  { id: 'templates', label: 'Templates', depth: 1, status: 'draft', parent: 'operations', group: 'operations' },
  // Depth 2
  { id: 'q1-2024', label: 'Q1 2024', depth: 2, status: 'verified', parent: 'invoices', group: 'finance' },
  { id: 'q2-2024', label: 'Q2 2024', depth: 2, status: 'verified', parent: 'invoices', group: 'finance' },
  { id: 'q3-2024', label: 'Q3 2024', depth: 2, status: 'verified', parent: 'invoices', group: 'finance' },
  { id: 'bilan-2023', label: 'Bilan 2023', depth: 2, status: 'draft', parent: 'annual-reports', group: 'finance' },
  { id: 'bilan-2022', label: 'Bilan 2022', depth: 2, status: 'draft', parent: 'annual-reports', group: 'finance' },
  { id: 'liasse-2023', label: 'Liasse 2023', depth: 2, status: 'draft', parent: 'tax-returns', group: 'compliance' },
  { id: 'liasse-2022', label: 'Liasse 2022', depth: 2, status: 'draft', parent: 'tax-returns', group: 'compliance' },
];

const parentEdges: LandingEdge[] = landingNodes
  .filter((n) => n.parent)
  .map((n) => ({ source: n.parent!, target: n.id, type: 'parent_of' as const }));

export const landingEdges: LandingEdge[] = [
  ...parentEdges,
  { source: 'vat', target: 'invoices', type: 'depends_on' },
  { source: 'tax-returns', target: 'vat', type: 'depends_on' },
  { source: 'tax-returns', target: 'bilan-2023', type: 'depends_on' },
  { source: 'martin', target: 'invoices', type: 'references' },
  { source: 'audit-reports', target: 'bilan-2023', type: 'references' },
  { source: 'bilan-2023', target: 'bilan-2022', type: 'temporal' },
];

export const SORTED_NODES = [...landingNodes].sort((a, b) => a.depth - b.depth);
