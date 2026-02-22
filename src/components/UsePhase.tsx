import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FolioCheckCircle2 as CheckCircle2,
    FolioArrowRight as ArrowRight,
    FolioBot as Bot,
    FolioLink,
    FolioFolder,
    FolioFileText,
    FolioBuilding,
    FolioUsers,
    FolioShield,
    FolioSparkles,
    FolioSend as Send,
} from '@/components/icons/FolioIcons';
import { cn } from '@/lib/utils';

interface Message {
    role: 'user' | 'agent';
    text: string;
    source?: string;
}

interface ScriptedQA {
    keywords: string[];
    answer: string;
    source?: string;
}

const SCRIPTED = (lang: string): ScriptedQA[] => [
    {
        keywords: ['acme', 'invoice', 'facture'],
        answer: lang === 'fr'
            ? 'Facture #2024-0847 · 15 mars 2024 · 4 200 £ · Statut : Payée'
            : 'Invoice #2024-0847 · March 15, 2024 · £4,200 · Status: Paid',
        source: lang === 'fr'
            ? 'Source : Finance → Factures → Acme Ltd → Q1 2024'
            : 'Source: Finance → Invoices → Acme Ltd → Q1 2024',
    },
    {
        keywords: ['vat', 'tva', 'q2'],
        answer: lang === 'fr'
            ? '14 200 £ — version amendée validée lors de la vérification.'
            : '£14,200 — amended version, validated during verification.',
        source: lang === 'fr'
            ? 'Finance → TVA → vat_Q2_2024_AMENDED.pdf'
            : 'Finance → VAT → vat_Q2_2024_AMENDED.pdf',
    },
    {
        keywords: ['annual', 'rapport', 'report', 'annuel'],
        answer: lang === 'fr'
            ? '3 documents trouvés : rapport_annuel_2023.pdf, annexes_2023.zip, management_accounts_2023.xlsx'
            : '3 documents found: annual_report_2023.pdf, annexes_2023.zip, management_accounts_2023.xlsx',
        source: lang === 'fr'
            ? 'Finance → Rapports annuels'
            : 'Finance → Annual Reports',
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

interface Props {
    clientId: string;
}

export default function UsePhase({ clientId: _clientId }: Props) {
    const { t, i18n } = useTranslation();
    const [subPhase, setSubPhase] = useState<'recap' | 'pulse'>('recap');
    const [visibleCards, setVisibleCards] = useState(0);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Stagger recap cards
    useEffect(() => {
        if (subPhase !== 'recap') return;
        const timers = [
            setTimeout(() => setVisibleCards(1), 100),
            setTimeout(() => setVisibleCards(2), 500),
            setTimeout(() => setVisibleCards(3), 900),
        ];
        return () => timers.forEach(clearTimeout);
    }, [subPhase]);

    // Auto-scroll messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

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
            const answer = match?.answer ?? (
                lang === 'fr'
                    ? '11 entrées pertinentes trouvées. Sélectionnez un dossier à gauche pour explorer.'
                    : '11 relevant entries found. Select a folder on the left to explore.'
            );
            const source = match?.source;
            setMessages(prev => [...prev, { role: 'agent', text: answer, source }]);
            setIsTyping(false);
        }, 1400);
    }, [isTyping, i18n.language]);

    const STATS = [
        t('use.stat1'),
        t('use.stat2'),
        t('use.stat3'),
    ];

    // ── Recap ──────────────────────────────────────────────────────────────────
    if (subPhase === 'recap') {
        return (
            <div className="h-full w-full flex items-center justify-center" style={{ background: 'hsl(220 20% 98%)' }}>
                <div className="max-w-md w-full px-8 space-y-8" style={{ animation: 'fade-in 0.5s ease-out' }}>
                    {/* Title */}
                    <div className="text-center">
                        <div
                            className="inline-flex w-14 h-14 rounded-full items-center justify-center mb-4"
                            style={{ background: 'linear-gradient(135deg, hsl(152 60% 94%), hsl(152 50% 90%))' }}
                        >
                            <FolioSparkles className="h-7 w-7" style={{ color: 'hsl(152 55% 38%)' }} />
                        </div>
                        <h2
                            className="text-2xl font-semibold text-foreground"
                            style={{ fontFamily: "'Newsreader', serif", letterSpacing: '-0.01em' }}
                        >
                            {t('use.recapTitle')}
                        </h2>
                    </div>

                    {/* Stat cards */}
                    <div className="space-y-3">
                        {STATS.map((stat, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 card-organic p-4 transition-all duration-500"
                                style={{
                                    opacity: visibleCards > i ? 1 : 0,
                                    transform: visibleCards > i ? 'translateY(0)' : 'translateY(8px)',
                                    background: 'linear-gradient(135deg, hsl(0 0% 100%), hsl(152 30% 97%))',
                                    border: '1px solid hsl(152 30% 88%)',
                                    boxShadow: '0 2px 8px hsl(152 30% 60% / 0.07)',
                                }}
                            >
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                    style={{ background: 'linear-gradient(135deg, hsl(152 60% 94%), hsl(152 50% 90%))' }}
                                >
                                    <CheckCircle2 className="h-4 w-4" style={{ color: 'hsl(152 55% 38%)' }} />
                                </div>
                                <span className="text-sm font-medium text-foreground">{stat}</span>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <div
                        className="flex justify-center transition-all duration-500"
                        style={{ opacity: visibleCards >= 3 ? 1 : 0, transform: visibleCards >= 3 ? 'translateY(0)' : 'translateY(8px)' }}
                    >
                        <button
                            onClick={() => setSubPhase('pulse')}
                            disabled={visibleCards < 3}
                            className="flex items-center gap-2 px-8 py-3.5 btn-organic-pill text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] disabled:pointer-events-none"
                            style={{
                                background: 'linear-gradient(145deg, hsl(152 55% 42%), hsl(152 65% 35%))',
                                color: 'hsl(0 0% 100%)',
                                boxShadow: '0 4px 20px hsl(152 55% 40% / 0.35), 0 1px 3px hsl(152 50% 25% / 0.2)',
                            }}
                        >
                            {t('use.recapCTA')}
                            <ArrowRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Pulse dashboard ────────────────────────────────────────────────────────
    const folderTree = FOLDER_TREE(i18n.language);
    const suggestions = [t('use.q1'), t('use.q2'), t('use.q3')];

    return (
        <div className="flex h-full w-full overflow-hidden" style={{ animation: 'fade-in 0.4s ease-out' }}>

            {/* ── Left: Folder tree ──────────────────────────────────────────── */}
            <div
                className="w-52 shrink-0 flex flex-col"
                style={{
                    background: 'linear-gradient(180deg, hsl(0 0% 100%), hsl(217 25% 97%))',
                    borderRight: '1px solid hsl(217 20% 91%)',
                }}
            >
                <div
                    className="px-4 py-3 shrink-0"
                    style={{ borderBottom: '1px solid hsl(217 20% 91%)' }}
                >
                    <p className="text-xs font-medium text-muted-foreground" style={{ fontFamily: "'Newsreader', serif" }}>
                        {t('use.kbTitle')}
                    </p>
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                    {folderTree.map(domain => {
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
                </div>
            </div>

            {/* ── Center: Chat / Pulse ───────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div
                    className="px-5 py-3 flex items-center gap-3 shrink-0"
                    style={{
                        background: 'linear-gradient(180deg, hsl(220 20% 99%), hsl(217 30% 97%))',
                        borderBottom: '1px solid hsl(217 20% 91%)',
                    }}
                >
                    <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                            background: 'hsl(152 65% 50%)',
                            boxShadow: '0 0 0 3px hsl(152 60% 88%)',
                            animation: 'pulse 1.5s ease-in-out infinite',
                        }}
                    />
                    <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Newsreader', serif" }}>
                        {t('use.pulseTitle')}
                    </span>
                    <span
                        className="text-xs px-2 py-0.5 card-organic font-medium"
                        style={{
                            background: 'hsl(152 40% 95%)',
                            border: '1px solid hsl(152 35% 85%)',
                            color: 'hsl(152 50% 35%)',
                        }}
                    >
                        ● {t('use.live')}
                    </span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {messages.length === 0 && !isTyping && (
                        <p className="text-sm text-muted-foreground italic text-center mt-8">
                            {t('use.hintText')}
                        </p>
                    )}

                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                            style={{ animation: 'fade-in 0.3s ease-out' }}
                        >
                            {msg.role === 'agent' && (
                                <Bot
                                    className="h-6 w-6 text-primary shrink-0 mr-2 mt-1"
                                    style={{ opacity: 0.7 }}
                                />
                            )}
                            <div
                                className={cn('max-w-sm', msg.role === 'user' ? 'text-right' : 'text-left')}
                            >
                                <div
                                    className={cn(
                                        'inline-block px-4 py-2.5 text-sm leading-relaxed',
                                        msg.role === 'user'
                                            ? 'btn-organic-pill text-white font-medium'
                                            : 'card-organic',
                                    )}
                                    style={
                                        msg.role === 'user'
                                            ? {
                                                background: 'linear-gradient(135deg, hsl(217 65% 52%), hsl(217 75% 43%))',
                                                boxShadow: '0 2px 8px hsl(217 60% 50% / 0.2)',
                                            }
                                            : {
                                                background: 'linear-gradient(135deg, hsl(0 0% 100%), hsl(217 30% 97%))',
                                                border: '1px solid hsl(217 20% 91%)',
                                            }
                                    }
                                >
                                    {msg.text}
                                </div>
                                {msg.role === 'agent' && msg.source && (
                                    <p className="text-xs text-muted-foreground mt-1 italic px-1">
                                        {msg.source}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex justify-start" style={{ animation: 'fade-in 0.2s ease-out' }}>
                            <Bot className="h-6 w-6 text-primary shrink-0 mr-2 mt-1" style={{ opacity: 0.7 }} />
                            <div
                                className="card-organic px-4 py-3"
                                style={{
                                    background: 'linear-gradient(135deg, hsl(0 0% 100%), hsl(217 30% 97%))',
                                    border: '1px solid hsl(217 20% 91%)',
                                }}
                            >
                                <div className="flex gap-1 items-center h-4">
                                    {[0, 1, 2].map(i => (
                                        <span
                                            key={i}
                                            className="w-1.5 h-1.5 rounded-full"
                                            style={{
                                                background: 'hsl(217 40% 60%)',
                                                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Suggestion pills */}
                <div
                    className="px-5 py-2.5 flex items-center gap-2 flex-wrap shrink-0"
                    style={{ borderTop: '1px solid hsl(217 20% 93%)' }}
                >
                    <span className="text-xs text-muted-foreground shrink-0">{t('use.suggestions')} :</span>
                    {suggestions.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => handleSendMessage(s)}
                            disabled={isTyping}
                            className="text-xs px-3 py-1.5 btn-organic-pill transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-40"
                            style={{
                                background: 'linear-gradient(135deg, hsl(217 55% 96%), hsl(217 45% 93%))',
                                border: '1px solid hsl(217 35% 86%)',
                                color: 'hsl(217 60% 45%)',
                            }}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                {/* Input */}
                <div
                    className="px-5 py-3 flex gap-2 shrink-0"
                    style={{ borderTop: '1px solid hsl(217 20% 91%)' }}
                >
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(input); }}
                        placeholder={t('use.askPlaceholder')}
                        disabled={isTyping}
                        className="flex-1 text-sm px-4 py-2 card-organic outline-none focus:ring-1 disabled:opacity-50"
                        style={{
                            background: 'hsl(0 0% 100%)',
                            border: '1px solid hsl(217 20% 88%)',
                            '--tw-ring-color': 'hsl(217 50% 70%)',
                        } as React.CSSProperties}
                    />
                    <button
                        onClick={() => handleSendMessage(input)}
                        disabled={!input.trim() || isTyping}
                        className="flex items-center justify-center w-10 h-10 btn-organic-pill transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-40 shrink-0"
                        style={{
                            background: 'linear-gradient(135deg, hsl(217 65% 52%), hsl(217 75% 43%))',
                            boxShadow: '0 2px 8px hsl(217 60% 50% / 0.25)',
                        }}
                    >
                        <Send className="h-4 w-4 text-white" />
                    </button>
                </div>
            </div>

            {/* ── Right: Agents + MCP ────────────────────────────────────────── */}
            <div
                className="w-60 shrink-0 flex flex-col"
                style={{
                    background: 'linear-gradient(180deg, hsl(0 0% 100%), hsl(217 25% 97%))',
                    borderLeft: '1px solid hsl(217 20% 91%)',
                }}
            >
                {/* Agents section */}
                <div
                    className="px-4 py-3 shrink-0"
                    style={{ borderBottom: '1px solid hsl(217 20% 91%)' }}
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Bot className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium text-muted-foreground">{t('use.agents')}</span>
                    </div>
                    <div className="space-y-3">
                        {/* Explorer — active */}
                        <div className="space-y-0.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{
                                            background: 'hsl(152 65% 50%)',
                                            boxShadow: '0 0 0 2px hsl(152 60% 88%)',
                                            animation: 'pulse 1.5s ease-in-out infinite',
                                        }}
                                    />
                                    <span className="text-sm font-medium text-foreground">{t('topNav.explorer')}</span>
                                </div>
                                <span
                                    className="text-xs px-1.5 py-0.5 card-organic font-medium"
                                    style={{
                                        background: 'hsl(152 40% 95%)',
                                        border: '1px solid hsl(152 35% 85%)',
                                        color: 'hsl(152 50% 35%)',
                                    }}
                                >
                                    {t('use.agentActive')}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground pl-4" style={{ fontStyle: 'italic' }}>
                                {i18n.language === 'fr' ? 'Surveille 3 nouvelles sources…' : 'Monitoring 3 new sources…'}
                            </p>
                        </div>
                        {/* Structureur — idle */}
                        <div className="space-y-0.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ background: 'hsl(38 65% 55%)', boxShadow: '0 0 0 2px hsl(38 60% 88%)' }}
                                    />
                                    <span className="text-sm font-medium text-foreground">{t('topNav.structurer')}</span>
                                </div>
                                <span
                                    className="text-xs px-1.5 py-0.5 card-organic font-medium"
                                    style={{
                                        background: 'hsl(38 70% 96%)',
                                        border: '1px solid hsl(38 40% 86%)',
                                        color: 'hsl(38 60% 35%)',
                                    }}
                                >
                                    {t('use.agentIdle')}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground pl-4" style={{ fontStyle: 'italic' }}>
                                {i18n.language === 'fr' ? 'Dernière structure il y a 2 min' : 'Last run 2 min ago'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* MCP section */}
                <div className="flex-1 px-4 py-3">
                    <div className="flex items-center gap-2 mb-3">
                        <FolioLink className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium text-muted-foreground">{t('use.mcp')}</span>
                    </div>
                    <div className="space-y-2">
                        {[
                            { name: 'claude-desktop', status: 'connected' as const },
                            { name: 'n8n', status: 'connected' as const },
                            { name: 'Zapier', status: 'pending' as const },
                        ].map(conn => (
                            <div key={conn.name} className="flex items-center justify-between">
                                <span className="text-sm text-foreground">{conn.name}</span>
                                <span
                                    className="text-xs px-1.5 py-0.5 card-organic font-medium"
                                    style={
                                        conn.status === 'connected'
                                            ? {
                                                background: 'hsl(152 40% 95%)',
                                                border: '1px solid hsl(152 35% 85%)',
                                                color: 'hsl(152 50% 35%)',
                                            }
                                            : {
                                                background: 'hsl(38 70% 96%)',
                                                border: '1px solid hsl(38 40% 86%)',
                                                color: 'hsl(38 60% 35%)',
                                            }
                                    }
                                >
                                    {conn.status === 'connected' ? t('use.connected') : t('use.pending')}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
