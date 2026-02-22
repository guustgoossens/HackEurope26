import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FolioBot as Bot,
    FolioLink,
    FolioFolder,
    FolioFileText,
    FolioBuilding,
    FolioUsers,
    FolioShield,
    FolioSend as Send,
    FolioCode,
    FolioChevronDown,
    FolioChevronRight
} from '@/components/icons/FolioIcons';
import folioMark from '@/assets/folio-mark.svg';
import { cn } from '@/lib/utils';

interface Message {
    role: 'user' | 'agent';
    text: string;
    sources?: string[];
    confidence?: number;
}

interface ScriptedQA {
    keywords: string[];
    answer: string;
    sources?: string[];
    confidence?: number;
}

const SCRIPTED = (lang: string): ScriptedQA[] => [
    {
        keywords: ['acme', 'invoice', 'facture'],
        answer: lang === 'fr'
            ? 'Facture #2024-0847 · 15 mars 2024 · 4 200 £ · Statut : Payée'
            : 'Invoice #2024-0847 · March 15, 2024 · £4,200 · Status: Paid',
        sources: lang === 'fr'
            ? ['Finance → Factures → Acme Ltd → Q1 2024']
            : ['Finance → Invoices → Acme Ltd → Q1 2024'],
        confidence: 0.97,
    },
    {
        keywords: ['vat', 'tva', 'q2'],
        answer: lang === 'fr'
            ? '14 200 £ — version amendée validée lors de la vérification.'
            : '£14,200 — amended version, validated during verification.',
        sources: lang === 'fr'
            ? ['Finance → TVA → vat_Q2_2024_AMENDED.pdf']
            : ['Finance → VAT → vat_Q2_2024_AMENDED.pdf'],
        confidence: 0.99,
    },
    {
        keywords: ['annual', 'rapport', 'report', 'annuel'],
        answer: lang === 'fr'
            ? '3 documents trouvés : rapport_annuel_2023.pdf, annexes_2023.zip, management_accounts_2023.xlsx'
            : '3 documents found: annual_report_2023.pdf, annexes_2023.zip, management_accounts_2023.xlsx',
        sources: lang === 'fr'
            ? ['Finance → Rapports annuels']
            : ['Finance → Annual Reports'],
        confidence: 0.88,
    },
];

interface FolderNode {
    id: string;
    label: string;
    icon: 'building' | 'users' | 'shield' | 'folder' | 'file';
    children?: FolderNode[];
}

const FOLDER_TREE = (lang: string): FolderNode[] => [
    {
        id: 'finance',
        label: 'Finance',
        icon: 'building',
        children: [
            { id: 'invoices', label: lang === 'fr' ? 'Factures' : 'Invoices', icon: 'folder' },
            { id: 'vat', label: lang === 'fr' ? 'TVA' : 'VAT', icon: 'folder' },
            { id: 'reports', label: lang === 'fr' ? 'Rapports annuels' : 'Annual Reports', icon: 'file' },
        ],
    },
    {
        id: 'clients',
        label: lang === 'fr' ? 'Clients' : 'Clients',
        icon: 'users',
        children: [
            { id: 'acme', label: 'Acme Ltd.', icon: 'folder' },
            { id: 'brightfield', label: 'Brightfield', icon: 'folder' },
        ],
    },
    {
        id: 'compliance',
        label: lang === 'fr' ? 'Conformité' : 'Compliance',
        icon: 'shield',
        children: [
            { id: 'hmrc', label: 'HMRC', icon: 'file' },
        ],
    },
];

const FOLDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    building: FolioBuilding,
    users: FolioUsers,
    shield: FolioShield,
    folder: FolioFolder,
    file: FolioFileText,
};

const UpcomingBadge = ({ text }: { text: string }) => (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 tracking-wide border border-slate-200 shrink-0">
        {text}
    </span>
);

interface Props {
    clientId: string;
    onBack?: () => void;
}

export default function UsePhase({ clientId: _clientId, onBack }: Props) {
    const { t, i18n } = useTranslation();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    // Folder tree states
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Expandable sources mapping
    const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({});

    // API UI states
    const [isApiOpen, setIsApiOpen] = useState(false);
    const [copiedMcp, setCopiedMcp] = useState(false);
    const [copiedApi, setCopiedApi] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, expandedSources]);

    const handleSendMessage = useCallback((text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isTyping) return;
        setMessages(prev => [...prev, { role: 'user', text: trimmed }]);
        setInput('');
        setIsTyping(true);

        setTimeout(() => {
            const lower = trimmed.toLowerCase();
            const lang = i18n.language;
            const match = SCRIPTED(lang).find(qa =>
                qa.keywords.some(k => lower.includes(k))
            );

            if (match) {
                setMessages(prev => [...prev, {
                    role: 'agent',
                    text: match.answer,
                    sources: match.sources,
                    confidence: match.confidence
                }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'agent',
                    text: lang === 'fr'
                        ? "Je n'ai pas trouvé de correspondance précise. 11 entrées partiellement liées — affinez votre question ou naviguez dans l'arborescence."
                        : "No exact match found. 11 partially related entries — refine your question or browse the folder tree.",
                    confidence: 0.12
                }]);
            }
            setIsTyping(false);
        }, 1400);
    }, [isTyping, i18n.language]);

    const handleCopyMcp = useCallback(() => {
        const txt = `{
  "mcpServers": {
    "folio": {
      "command": "npx",
      "args": ["-y", "folio-mcp"],
      "env": {
        "FOLIO_API_KEY": "fol_live_xxxx",
        "FOLIO_KB_ID": "kb_cabinet_dupont"
      }
    }
  }
}`;
        void navigator.clipboard.writeText(txt);
        setCopiedMcp(true);
        setTimeout(() => setCopiedMcp(false), 2000);
    }, []);

    const handleCopyApi = useCallback(() => {
        const txt = `curl -X POST https://api.folio.ai/v1/query \\
  -H "Authorization: Bearer fol_live_xxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"question": "Latest Acme invoice?"}'`;
        void navigator.clipboard.writeText(txt);
        setCopiedApi(true);
        setTimeout(() => setCopiedApi(false), 2000);
    }, []);

    const toggleSources = useCallback((idx: number) => {
        setExpandedSources(prev => ({ ...prev, [idx]: !prev[idx] }));
    }, []);

    const filteredTree = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const tree = FOLDER_TREE(i18n.language);
        if (!q) return tree;

        return tree.map(domain => {
            const matchingChildren = domain.children?.filter(c => c.label.toLowerCase().includes(q)) || [];
            if (domain.label.toLowerCase().includes(q) || matchingChildren.length > 0) {
                return { ...domain, children: matchingChildren };
            }
            return null;
        }).filter(Boolean) as FolderNode[];
    }, [searchQuery, i18n.language]);

    const suggestions = [t('use.q1'), t('use.q2'), t('use.q3')];

    // ── Pulse dashboard (2 main sides: left (kb+chat) and right (integrations)) ──────
    return (
        <div className="flex flex-col h-full w-full overflow-hidden" style={{ animation: 'fade-in 0.4s ease-out', background: 'hsl(0 0% 100%)' }}>

            {/* Dashboard Header */}
            <header className="h-14 flex items-center justify-between px-6 shrink-0 border-b border-slate-200 bg-white" style={{ zIndex: 10 }}>
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="flex items-center gap-2.5 hover:opacity-80 transition" aria-label="Back">
                        <img src={folioMark} alt="Folio" className="w-[44px] h-[44px]" />
                        <span className="text-[26px] tracking-tight text-foreground" style={{ fontFamily: "'Newsreader', serif", fontWeight: 500 }}>
                            folio
                        </span>
                    </button>
                    <div className="h-5 w-px bg-slate-200" />
                    <span className="text-[13px] font-medium text-slate-500 uppercase tracking-wider">
                        Workspace Dashboard
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[13px] font-medium text-slate-600">Cabinet Dupont & Associés</span>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        CD
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden w-full">

                {/* ── Left: Folder tree ──────────────────────────────────────────── */}
                <div
                    className="w-64 shrink-0 flex flex-col"
                    style={{
                        background: 'linear-gradient(180deg, hsl(0 0% 100%), hsl(217 25% 97%))',
                        borderRight: '1px solid hsl(217 20% 91%)',
                    }}
                >
                    <div
                        className="px-4 py-3 shrink-0"
                        style={{ borderBottom: '1px solid hsl(217 20% 91%)' }}
                    >
                        <div className="flex flex-col gap-1">
                            <p className="text-sm font-semibold text-foreground flex items-center justify-between" style={{ fontFamily: "'Newsreader', serif" }}>
                                {t('use.kbTitle')}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{t('use.navigationUpcoming')}</p>
                        </div>
                    </div>

                    <div className="px-3 py-2 shrink-0">
                        <input
                            type="text"
                            placeholder={t('use.searchTreePlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 bg-white focus:outline-none focus:border-slate-300 focus:ring-1 focus:ring-slate-100 transition-shadow"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto pb-4">
                        {filteredTree.map(domain => {
                            const DomainIcon = FOLDER_ICONS[domain.icon];
                            return (
                                <div key={domain.id}>
                                    <button
                                        onClick={() => setSelectedFolder(domain.id)}
                                        className={cn(
                                            'w-full flex items-center gap-2 px-4 py-1.5 text-sm text-left transition-colors duration-150',
                                            selectedFolder === domain.id
                                                ? 'text-primary font-medium'
                                                : 'text-foreground hover:bg-primary/5',
                                        )}
                                        style={selectedFolder === domain.id ? { background: 'hsl(217 60% 96%)' } : {}}
                                    >
                                        <DomainIcon className="h-4 w-4 shrink-0 text-primary" />
                                        <span className="truncate">{domain.label}</span>
                                    </button>
                                    {domain.children?.map(child => {
                                        const ChildIcon = FOLDER_ICONS[child.icon];
                                        return (
                                            <button
                                                key={child.id}
                                                onClick={() => setSelectedFolder(child.id)}
                                                className={cn(
                                                    'w-full flex items-center gap-2 pl-8 pr-4 py-1.5 text-xs text-left transition-colors duration-150',
                                                    selectedFolder === child.id
                                                        ? 'text-primary font-medium'
                                                        : 'text-muted-foreground hover:bg-primary/5',
                                                )}
                                                style={selectedFolder === child.id ? { background: 'hsl(217 60% 96%)' } : {}}
                                            >
                                                <ChildIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                                <span className="truncate">{child.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })}
                        {filteredTree.length === 0 && (
                            <p className="text-xs text-center text-muted-foreground mt-4 italic">
                                No match
                            </p>
                        )}
                    </div>
                </div>

                {/* ── Center: Search / Chat (RAG Interface) ───────────────────────── */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    {/* Header */}
                    <div
                        className="px-6 py-4 flex flex-col justify-center shrink-0 border-b border-slate-100"
                        style={{ background: 'linear-gradient(180deg, hsl(220 20% 99%), hsl(0 0% 100%))' }}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{
                                    background: 'hsl(152 65% 50%)',
                                    boxShadow: '0 0 0 3px hsl(152 60% 88%)',
                                    animation: 'pulse 1.5s ease-in-out infinite',
                                }}
                            />
                            <span className="text-base font-semibold text-foreground tracking-tight">Active session</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium ml-1">
                                {t('use.live')}
                            </span>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                        {messages.length === 0 && !isTyping && (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                                <Bot className="h-10 w-10 text-slate-300" />
                                <p className="text-sm text-slate-500 max-w-xs">{t('use.hintText')}</p>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={cn('flex flex-col max-w-2xl mx-auto', msg.role === 'user' ? 'items-end' : 'items-start')} style={{ animation: 'fade-in 0.3s ease-out' }}>
                                {msg.role === 'user' ? (
                                    <div className="px-5 py-3 text-sm leading-relaxed rounded-2xl bg-slate-100 text-slate-700 font-medium shadow-sm">
                                        {msg.text}
                                    </div>
                                ) : (
                                    <div className="flex w-full mt-2">
                                        <Bot className="h-6 w-6 text-primary shrink-0 mr-3 mt-1 opacity-70" />
                                        <div className="flex-1 space-y-3">
                                            <div className="text-sm leading-relaxed text-slate-800">
                                                {msg.text}
                                            </div>

                                            {(msg.sources || msg.confidence) && (
                                                <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-100 w-full">
                                                    {msg.sources && msg.sources.length > 0 && (
                                                        <div>
                                                            <button
                                                                onClick={() => toggleSources(i)}
                                                                className="flex items-center text-[11px] text-slate-500 hover:text-slate-700 transition"
                                                            >
                                                                {expandedSources[i] ? <FolioChevronDown className="h-3 w-3 mr-1" /> : <FolioChevronRight className="h-3 w-3 mr-1" />}
                                                                {t('use.sources')} ({msg.sources.length})
                                                            </button>
                                                            {expandedSources[i] && (
                                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                                    {msg.sources.map((src, idx) => (
                                                                        <span key={idx} className="bg-slate-50 border border-slate-200 text-slate-500 text-[10px] px-2 py-1 rounded">
                                                                            {src}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {msg.confidence !== undefined && (
                                                        <div className="flex flex-col gap-1 w-32 mt-1">
                                                            <span className="text-[10px] text-slate-400">{t('use.confidence')} · {Math.round(msg.confidence * 100)}%</span>
                                                            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className={cn("h-full rounded-full transition-all duration-1000", msg.confidence >= 0.9 ? "bg-emerald-400" : msg.confidence >= 0.7 ? "bg-amber-400" : "bg-red-400")}
                                                                    style={{ width: `${Math.round(msg.confidence * 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex max-w-2xl mx-auto w-full" style={{ animation: 'fade-in 0.2s ease-out' }}>
                                <Bot className="h-6 w-6 text-primary shrink-0 mr-3 mt-1 opacity-70" />
                                <div className="flex items-center h-8">
                                    <div className="flex gap-1.5">
                                        {[0, 1, 2].map(i => (
                                            <span
                                                key={i}
                                                className="w-1.5 h-1.5 rounded-full bg-slate-300"
                                                style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>

                    {/* Input Area */}
                    <div className="px-6 py-4 border-t border-slate-100 bg-white shrink-0">
                        <div className="max-w-2xl mx-auto">
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <span className="text-xs text-slate-400 shrink-0">{t('use.suggestions')}:</span>
                                {suggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSendMessage(s)}
                                        disabled={isTyping}
                                        className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all disabled:opacity-40"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                            <div className="flex relative items-end shadow-sm rounded-xl border border-slate-200 bg-white focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-100 transition-all">
                                <textarea
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(input);
                                        }
                                    }}
                                    placeholder={t('use.askPlaceholder')}
                                    disabled={isTyping}
                                    className="flex-1 text-sm px-4 py-3 min-h-[44px] max-h-32 bg-transparent outline-none resize-none disabled:opacity-50 text-slate-700"
                                />
                                <div className="p-2 shrink-0">
                                    <button
                                        onClick={() => handleSendMessage(input)}
                                        disabled={!input.trim() || isTyping}
                                        className="flex items-center justify-center p-2 rounded-lg bg-slate-800 text-white transition-all hover:bg-slate-700 disabled:opacity-30"
                                    >
                                        <Send className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Right: Tech Stack / API & Integrations ─────────────────────── */}
                <div
                    className="w-96 shrink-0 flex flex-col overflow-y-auto"
                    style={{
                        background: 'linear-gradient(180deg, hsl(0 0% 100%), hsl(220 20% 98%))',
                        borderLeft: '1px solid hsl(217 20% 91%)',
                    }}
                >
                    {/* Agents Tracking */}
                    <div className="px-5 py-4 border-b border-slate-100">
                        <div className="flex items-center gap-2 mb-3">
                            <Bot className="h-4 w-4 text-primary" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('use.agents')}</span>
                        </div>
                        <div className="space-y-3">
                            <div className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-sm font-medium text-slate-700">{t('topNav.explorer')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">{t('use.agentActive')}</span>
                                        <UpcomingBadge text={t('use.upcoming')} />
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-500 pl-3.5 italic">
                                    {i18n.language === 'fr' ? 'Surveille 3 sources en direct…' : 'Monitoring 3 live sources…'}
                                </p>
                            </div>

                            <div className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                        <span className="text-sm font-medium text-slate-700">{t('topNav.structurer')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">{t('use.agentIdle')}</span>
                                        <UpcomingBadge text={t('use.upcoming')} />
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-500 pl-3.5 italic">
                                    {i18n.language === 'fr' ? 'Dernière structure il y a 2 min' : 'Last run 2 min ago'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* MCP Connections */}
                    <div className="px-5 py-4 border-b border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <FolioLink className="h-4 w-4 text-primary" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('use.mcp')}</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            {[
                                { name: 'claude-desktop', status: 'connected' as const, upc: false },
                                { name: 'n8n', status: 'connected' as const, upc: false },
                                { name: 'Zapier', status: 'pending' as const, upc: true },
                            ].map(conn => (
                                <div key={conn.name} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-slate-50 transition">
                                    <span className="text-sm text-slate-700">{conn.name}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                                conn.status === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                            )}
                                        >
                                            {conn.status === 'connected' ? t('use.connected') : t('use.pending')}
                                        </span>
                                        {conn.upc && <UpcomingBadge text={t('use.upcoming')} />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Folio MCP Docs */}
                    <div className="px-5 py-4 border-b border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <FolioCode className="h-4 w-4 text-primary" />
                                <span className="text-sm font-semibold text-slate-800">{t('use.folioMcp')}</span>
                            </div>
                            <a href="#" className="text-[11px] text-primary hover:underline font-medium">{t('use.docs')}</a>
                        </div>

                        <div className="relative mb-3 group">
                            <pre className="p-3 bg-slate-900 rounded-lg overflow-x-auto text-[11px] font-mono text-emerald-400 leading-relaxed">
                                {`{
  "mcpServers": {
    "folio": {
      "command": "npx",
      "args": ["-y", "folio-mcp"],
      "env": {
        "FOLIO_API_KEY": "fol_live_xxxx",
        "FOLIO_KB_ID": "kb_cabinet_dupont"
      }
    }
  }
}`}
                            </pre>
                            <button
                                onClick={handleCopyMcp}
                                className="absolute top-2 right-2 px-2 py-1 text-[10px] bg-slate-800 text-slate-300 rounded opacity-0 group-hover:opacity-100 transition hover:bg-slate-700 hover:text-white"
                            >
                                {copiedMcp ? t('use.copied') : t('use.copyConfig')}
                            </button>
                        </div>

                        <div className="space-y-1 pl-1">
                            <div className="text-[11px] font-mono text-slate-600 truncate"><span className="text-slate-800">search_knowledge(query)</span> <span className="text-slate-400">{t('use.searchKnowledgeDesc')}</span></div>
                            <div className="text-[11px] font-mono text-slate-600 truncate"><span className="text-slate-800">get_node(path)</span> <span className="text-slate-400">{t('use.getNodeDesc')}</span></div>
                            <div className="text-[11px] font-mono text-slate-600 truncate"><span className="text-slate-800">list_children(parent_id)</span> <span className="text-slate-400">{t('use.listChildrenDesc')}</span></div>
                        </div>
                    </div>

                    {/* REST API & Webhooks */}
                    <div className="px-5 py-4">
                        <button
                            onClick={() => setIsApiOpen(!isApiOpen)}
                            className="flex items-center justify-between w-full text-left mb-2 group"
                        >
                            <div className="flex items-center gap-2">
                                <FolioCode className="h-4 w-4 text-primary" />
                                <span className="text-sm font-semibold text-slate-800 group-hover:text-primary transition">{t('use.restApi')}</span>
                                <UpcomingBadge text={t('use.upcoming')} />
                            </div>
                            {isApiOpen ? <FolioChevronDown className="h-4 w-4 text-slate-400" /> : <FolioChevronRight className="h-4 w-4 text-slate-400" />}
                        </button>

                        {isApiOpen && (
                            <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div>
                                    <div className="relative group">
                                        <pre className="p-3 bg-slate-900 rounded-t-lg overflow-x-auto text-[11px] font-mono text-slate-300 leading-relaxed border-b border-slate-700">
                                            <span className="text-emerald-400">curl</span> -X POST https://api.folio.ai/v1/query \<br />
                                            &nbsp;&nbsp;-H <span className="text-amber-300">"Authorization: Bearer fol_live_xxxx"</span> \<br />
                                            &nbsp;&nbsp;-H <span className="text-amber-300">"Content-Type: application/json"</span> \<br />
                                            &nbsp;&nbsp;-d <span className="text-amber-300">'{"{"}"question": "Latest Acme invoice?"{"}"}'</span>
                                        </pre>
                                        <button
                                            onClick={handleCopyApi}
                                            className="absolute top-2 right-2 px-2 py-1 text-[10px] bg-slate-800 text-slate-300 rounded opacity-0 group-hover:opacity-100 transition hover:bg-slate-700 hover:text-white"
                                        >
                                            {copiedApi ? t('use.copied') : t('use.copy')}
                                        </button>
                                    </div>
                                    <pre className="p-3 bg-slate-800 rounded-b-lg overflow-x-auto text-[11px] font-mono text-blue-300 leading-relaxed">
                                        {`{
  "answer": "Invoice #2024-0847 · £4,200 · Paid",
  "source": "Finance → Invoices → Acme Ltd",
  "confidence": 0.97,
  "verified": true
}`}
                                    </pre>
                                </div>

                                <div className="pt-3 border-t border-slate-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-semibold text-slate-700">{t('use.webhooks')}</span>
                                        <UpcomingBadge text={t('use.upcoming')} />
                                    </div>
                                    <p className="text-[11px] text-slate-500 mb-2">{t('use.webhookExample')}</p>
                                    <pre className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-mono text-slate-600">
                                        POST https://your-app.com/webhook<br />
                                        {`{
  "event": "conflict.detected",
  "nodeId": "node_7x9p",
  "sourceCount": 2
}`}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

            </div>
        </div>
    );
}
