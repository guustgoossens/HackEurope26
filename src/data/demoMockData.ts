// Static mock data for the landing page demo sections only.
// Authenticated app uses real Convex data.

export interface AgentLogEntry {
  message: string;
  type: 'info' | 'warning' | 'success';
}

export interface VerificationQuestion {
  id: number;
  context: string;
  question: string;
  options: { label: string }[];
}

export const agentFeedEntries: AgentLogEntry[] = [
  { message: 'Création du dossier Comptabilité', type: 'info' },
  { message: 'Indexation du Grand Livre 2024 — 1 247 écritures', type: 'info' },
  { message: 'Découverte: Facture #2024-0847 → Boulangerie Martin', type: 'success' },
  { message: 'Nouveau client identifié: Boulangerie Martin', type: 'success' },
  { message: 'Liaison: Facture #2024-0523 → SCI Duval', type: 'success' },
  { message: '⚠ 340 écritures avec référence ambiguë « DUP-2024 »', type: 'warning' },
  { message: 'Règle détectée: Plan Comptable Général', type: 'info' },
  { message: 'Création du dossier Fiscalité', type: 'info' },
  { message: 'Indexation: Déclaration TVA Q1 2024', type: 'info' },
  { message: '⚠ Seuil micro-entreprise extrait d\'un doc de 2022', type: 'warning' },
  { message: 'Création du dossier Clients', type: 'info' },
  { message: 'Nouveau client: SCI Duval Immobilier', type: 'success' },
  { message: '⚠ Garage Moreau SARL — SIRET manquant', type: 'warning' },
  { message: '⚠ Doublon: Contrat_Martin_v2 / Contrat_Martin_final (94%)', type: 'warning' },
  { message: 'Liaison: Contrat_Martin_final → Boulangerie Martin', type: 'success' },
  { message: '✓ Structuration terminée — 7 ambiguïtés à résoudre', type: 'success' },
];

export const verificationQuestions: VerificationQuestion[] = [
  {
    id: 1,
    context: "340 écritures comptables font référence à « Ref: DUP-2024 ». Cette référence apparaît dans le Grand Livre et dans 124 emails.",
    question: "« DUP-2024 » est-il un code client ou une référence de lot interne ?",
    options: [{ label: 'Code client' }, { label: 'Référence de lot interne' }, { label: 'Je ne sais pas — à investiguer' }],
  },
  {
    id: 2,
    context: "Deux fichiers similaires : « Contrat_Martin_v2.pdf » (12/03/2024) et « Contrat_Martin_final.pdf » (15/03/2024). Contenu similaire à 94%.",
    question: "S'agit-il du même contrat ? Lequel fait foi ?",
    options: [{ label: 'Contrat_Martin_final.pdf fait foi' }, { label: 'Contrat_Martin_v2.pdf fait foi' }, { label: 'Conserver les deux versions' }],
  },
  {
    id: 3,
    context: "3 fichiers sont protégés par mot de passe et n'ont pas pu être lus.",
    question: "Que doit faire l'agent avec ces fichiers ?",
    options: [{ label: 'Réessayer avec des identifiants' }, { label: 'Exclure de la base' }, { label: 'Marquer pour traitement manuel' }],
  },
];
