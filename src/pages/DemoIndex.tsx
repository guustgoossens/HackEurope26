import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import TopNav from '@/components/TopNav';
import ExplorePhase from '@/components/ExplorePhase';
import { KnowledgeGraph } from '@/components/KnowledgeGraph';
import AgentFeed from '@/components/AgentFeed';
import { NodeDetailPanel } from '@/components/NodeDetailPanel';
import VerifyPhase from '@/components/VerifyPhase';
import { FolioDatabase, FolioLink, FolioSparkles } from '@/components/icons/FolioIcons';

const phaseInfo: Record<number, { title: string; subtitle: string }> = {
    1: { title: 'Exploration des données', subtitle: 'Analyse de vos sources et identification des éléments clés' },
    2: { title: 'Structuration', subtitle: 'Construction du graphe de connaissances' },
    3: { title: 'Vérification', subtitle: 'Validation des ambiguïtés détectées' },
};

const RESTRUCTURE_LINES = [
    'Suppression des doublons…',
    'Regroupement par domaine…',
    'Validation des liens…',
];

interface DemoIndexProps {
    clientId: string;
    onBack: () => void;
}

export default function DemoIndex({ clientId, onBack }: DemoIndexProps) {
    const client = useQuery(api.clients.get, { id: clientId as Id<'clients'> });
    const treeNodes = useQuery(api.knowledge.getTree, { clientId: clientId as Id<'clients'> });

    const [phase, setPhase] = useState(1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [exploreStep, setExploreStep] = useState(5);
    const [visibleNodeCount, setVisibleNodeCount] = useState(0);
    const [isVerifyComplete, setIsVerifyComplete] = useState(false);

    // Phase 2: dirty → clean transition
    const [cleanMode, setCleanMode] = useState(false);
    const [isRestructuring, setIsRestructuring] = useState(false);
    const [restructureLine, setRestructureLine] = useState(0);

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [selectedNodeReadme, setSelectedNodeReadme] = useState<string | null>(null);
    const [selectedNodeName, setSelectedNodeName] = useState<string | null>(null);
    const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);

    const handleSelectNode = useCallback((id: string | null, readme?: string, name?: string, type?: string) => {
        setSelectedNodeId(id);
        setSelectedNodeReadme(readme ?? null);
        setSelectedNodeName(name ?? null);
        setSelectedNodeType(type ?? null);
    }, []);

    const totalNodes = treeNodes?.length ?? 0;
    const visibleEdgeCount = useMemo(() => {
        if (!treeNodes) return 0;
        const visNodes = treeNodes.slice(0, visibleNodeCount);
        const visIds = new Set(visNodes.map(n => n._id));
        return visNodes.filter(n => n.parentId && visIds.has(n.parentId)).length;
    }, [treeNodes, visibleNodeCount]);

    // Trigger the restructure animation then flip cleanMode
    const handleRestructure = useCallback(() => {
        if (isRestructuring || cleanMode) return;
        setIsRestructuring(true);
        setRestructureLine(0);
        let lineIdx = 0;
        const lineInterval = setInterval(() => {
            lineIdx += 1;
            setRestructureLine(lineIdx);
            if (lineIdx >= RESTRUCTURE_LINES.length) {
                clearInterval(lineInterval);
                setTimeout(() => {
                    setCleanMode(true);
                    setIsRestructuring(false);
                }, 400);
            }
        }, 750);
    }, [isRestructuring, cleanMode]);

    // Manual phase change
    const handlePhaseChange = useCallback((p: number) => {
        setIsPlaying(false);
        setPhase(p);
        setSelectedNodeId(null);
        if (p === 1) {
            setExploreStep(5);
            setCleanMode(false);
            setIsRestructuring(false);
        }
        if (p >= 2 && totalNodes > 0) {
            setVisibleNodeCount(totalNodes);
        }
    }, [totalNodes]);

    // Auto-play toggle
    const handleTogglePlay = useCallback(() => {
        if (isPlaying) { setIsPlaying(false); return; }
        setPhase(1);
        setExploreStep(0);
        setVisibleNodeCount(0);
        setIsVerifyComplete(false);
        setCleanMode(false);
        setIsRestructuring(false);
        setSelectedNodeId(null);
        setIsPlaying(true);
    }, [isPlaying]);

    // Auto-play engine
    useEffect(() => {
        if (!isPlaying) return;
        let timer: ReturnType<typeof setTimeout>;

        if (phase === 1) {
            if (exploreStep < 5) {
                timer = setTimeout(() => setExploreStep(s => s + 1), 700);
            } else {
                timer = setTimeout(() => {
                    setPhase(2);
                    setVisibleNodeCount(0);
                }, 2500);
            }
        } else if (phase === 2 && treeNodes) {
            if (!cleanMode && !isRestructuring) {
                if (visibleNodeCount < treeNodes.length) {
                    timer = setTimeout(() => setVisibleNodeCount(c => c + 1), 300);
                } else {
                    timer = setTimeout(() => handleRestructure(), 2000);
                }
            } else if (cleanMode) {
                timer = setTimeout(() => {
                    setPhase(3);
                    setIsPlaying(false);
                }, 2000);
            }
        }

        return () => clearTimeout(timer);
    }, [isPlaying, phase, exploreStep, visibleNodeCount, treeNodes, cleanMode, isRestructuring, handleRestructure]);

    const info = phaseInfo[phase];
    const messyNodeCount = treeNodes?.length ?? 46;
    const cleanNodeCount = treeNodes?.filter(n => n.type === 'domain' || n.type === 'skill').length ?? 12;

    if (!client) return null;

    return (
        <div className="landing h-screen flex flex-col overflow-hidden relative" style={{ background: 'hsl(220 20% 98%)' }}>
            <div className="absolute inset-0 pointer-events-none z-0"
                style={{ background: 'radial-gradient(ellipse at 50% 0%, hsl(217 71% 30% / 0.04), transparent 70%)' }} />

            <TopNav
                clientName={client.name}
                currentPhase={phase}
                isPlaying={isPlaying}
                isComplete={isVerifyComplete}
                onPhaseChange={handlePhaseChange}
                onTogglePlay={handleTogglePlay}
                onBack={onBack}
            />

            <main className="flex-1 relative overflow-hidden flex z-10 w-full">

                {/* ── Phase 1: Explore ── */}
                <div className={`absolute inset-0 transition-all duration-700 ${phase === 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                    <ExplorePhase
                        clientId={clientId}
                        animationStep={exploreStep}
                        onNextPhase={() => handlePhaseChange(2)}
                    />
                </div>

                {/* ── Phase 2: Structure ── */}
                {phase === 2 && (
                    <div className="flex w-full h-full">
                        <div className="flex-1 relative">
                            <KnowledgeGraph
                                clientId={clientId}
                                onSelectNode={handleSelectNode}
                                cleanMode={cleanMode}
                            />

                            {/* Restructure animation overlay */}
                            {isRestructuring && (
                                <div
                                    className="absolute inset-0 flex items-center justify-center z-10 rounded-xl"
                                    style={{
                                        background: 'hsl(220 20% 98% / 0.88)',
                                        backdropFilter: 'blur(6px)',
                                    }}
                                >
                                    <div className="text-center space-y-3">
                                        <div className="flex justify-center mb-2">
                                            <span className="w-8 h-8 rounded-full border-2 border-primary animate-spin" style={{ borderTopColor: 'transparent' }} />
                                        </div>
                                        {RESTRUCTURE_LINES.map((line, i) => (
                                            <p
                                                key={i}
                                                className="text-sm transition-all duration-500"
                                                style={{
                                                    opacity: i <= restructureLine ? 1 : 0.2,
                                                    color: i <= restructureLine ? 'hsl(217 50% 40%)' : 'hsl(217 20% 70%)',
                                                    animation: i === restructureLine ? 'fade-in 0.4s ease-out' : undefined,
                                                }}
                                            >
                                                {line}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Stats bar bottom-left */}
                            <div
                                className="absolute bottom-4 left-4 flex items-center gap-3 text-xs rounded-xl px-4 py-2.5"
                                style={{
                                    background: 'linear-gradient(135deg, hsl(0 0% 100% / 0.88), hsl(217 30% 97% / 0.88))',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid hsl(217 20% 90% / 0.6)',
                                    boxShadow: '0 2px 8px hsl(217 30% 70% / 0.08)',
                                }}
                            >
                                {cleanMode ? (
                                    <>
                                        <FolioSparkles className="h-5 w-5 text-emerald-500" />
                                        <span className="font-medium text-emerald-600">
                                            {cleanNodeCount} nœuds · 4 domaines · 0 contradiction
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <FolioDatabase className="h-5 w-5 text-primary" />
                                        <span style={{ color: 'hsl(217 20% 55%)' }}>
                                            {messyNodeCount} nœuds · doublons détectés · 7 contradictions
                                        </span>
                                        <span style={{ color: 'hsl(217 20% 82%)' }}>·</span>
                                        <button
                                            onClick={handleRestructure}
                                            disabled={isRestructuring}
                                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
                                            style={{
                                                background: 'linear-gradient(135deg, hsl(217 65% 52%), hsl(217 75% 43%))',
                                                color: 'hsl(0 0% 100%)',
                                                boxShadow: '0 2px 8px hsl(217 60% 50% / 0.25)',
                                            }}
                                        >
                                            Structurer ▶
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Link counter bottom-right */}
                            <div
                                className="absolute bottom-4 right-4 flex gap-2 items-center text-xs rounded-xl px-3 py-2"
                                style={{
                                    background: 'linear-gradient(135deg, hsl(0 0% 100% / 0.85), hsl(217 30% 97% / 0.85))',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid hsl(217 20% 90% / 0.6)',
                                    boxShadow: '0 2px 8px hsl(217 30% 70% / 0.08)',
                                }}
                            >
                                <FolioLink className="h-5 w-5 text-primary" />
                                <span style={{ color: 'hsl(217 20% 55%)' }}>{visibleEdgeCount} liens</span>
                            </div>
                        </div>

                        <AgentFeed clientId={clientId} />
                    </div>
                )}

                {/* ── Phase 3: Verify ── */}
                {phase === 3 && (
                    <div className="flex w-full h-full">
                        <div className="flex-1 relative">
                            <KnowledgeGraph
                                clientId={clientId}
                                onSelectNode={handleSelectNode}
                                cleanMode={cleanMode}
                            />
                            {selectedNodeId && (
                                <NodeDetailPanel
                                    nodeId={selectedNodeId}
                                    nodeName={selectedNodeName}
                                    nodeReadme={selectedNodeReadme}
                                    nodeType={selectedNodeType}
                                    onClose={() => setSelectedNodeId(null)}
                                />
                            )}
                        </div>
                        <VerifyPhase
                            clientId={clientId}
                            isComplete={isVerifyComplete}
                            onComplete={() => setIsVerifyComplete(true)}
                        />
                    </div>
                )}

                {/* Phase subtitle — only for phases 2 + 3 (Phase 1 has its own header) */}
                {phase > 1 && (
                    <div
                        className="absolute top-4 left-1/2 -translate-x-1/2 text-center pointer-events-none z-20"
                        key={phase}
                        style={{ animation: 'fade-in 0.5s ease-out' }}
                    >
                        <p className="text-xs text-muted-foreground">{info.subtitle}</p>
                    </div>
                )}
            </main>
        </div>
    );
}
