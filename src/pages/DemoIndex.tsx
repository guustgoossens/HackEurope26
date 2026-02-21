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
import { FolioDatabase, FolioLink } from '@/components/icons/FolioIcons';

const phaseInfo: Record<number, { title: string; subtitle: string }> = {
    1: { title: 'Exploration des données', subtitle: 'Analyse de vos sources et identification des éléments clés' },
    2: { title: 'Structuration', subtitle: 'Construction du graphe de connaissances' },
    3: { title: 'Vérification', subtitle: 'Validation des ambiguïtés détectées' },
};

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
        // Calculate edges only for visible nodes
        const visNodes = treeNodes.slice(0, visibleNodeCount);
        const visIds = new Set(visNodes.map(n => n._id));
        return visNodes.filter(n => n.parentId && visIds.has(n.parentId)).length;
    }, [treeNodes, visibleNodeCount]);

    // Manual phase change
    const handlePhaseChange = useCallback((p: number) => {
        setIsPlaying(false);
        setPhase(p);
        setSelectedNodeId(null);
        if (p === 1) setExploreStep(5);
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
            if (visibleNodeCount < treeNodes.length) {
                timer = setTimeout(() => {
                    setVisibleNodeCount(c => c + 1);
                }, 300); // Slower animation to let Convex D3 layout run
            } else {
                timer = setTimeout(() => {
                    setPhase(3);
                    setIsPlaying(false); // Pause at verify
                }, 2000);
            }
        }

        return () => clearTimeout(timer);
    }, [isPlaying, phase, exploreStep, visibleNodeCount, treeNodes]);

    const info = phaseInfo[phase];

    if (!client) return null;

    return (
        <div className="landing h-screen flex flex-col overflow-hidden relative" style={{ background: 'hsl(220 20% 98%)' }}>
            {/* Subtle radial gradient overlay */}
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
                {/* Phase 1 */}
                <div className={`absolute inset-0 transition-all duration-700 ${phase === 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                    <ExplorePhase clientId={clientId} animationStep={exploreStep} />
                </div>

                {/* Phase 2 & 3: Graph */}
                {(phase === 2 || phase === 3) && (
                    <>
                        <div className="flex-1 relative">
                            <KnowledgeGraph
                                clientId={clientId}
                                onSelectNode={handleSelectNode}
                            />
                            {/* Counters */}
                            <div className="absolute bottom-4 left-4 flex gap-3 items-center text-xs text-muted-foreground rounded-xl px-4 py-2"
                                style={{
                                    background: 'linear-gradient(135deg, hsl(0 0% 100% / 0.85), hsl(217 30% 97% / 0.85))',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid hsl(217 20% 90% / 0.6)',
                                    boxShadow: '0 2px 8px hsl(217 30% 70% / 0.08)',
                                }}>
                                <FolioDatabase className="h-7 w-7 text-primary" />
                                <span>{treeNodes ? treeNodes.length : 0} nœuds</span>
                                <span style={{ color: 'hsl(217 20% 85%)' }}>·</span>
                                <FolioLink className="h-7 w-7 text-primary" />
                                <span>{visibleEdgeCount} liens</span>
                            </div>
                        </div>
                        {phase === 2 && <AgentFeed clientId={clientId} />}
                    </>
                )}

                {/* Phase 3: Verify overlay */}
                {phase === 3 && (
                    <VerifyPhase
                        clientId={clientId}
                        isComplete={isVerifyComplete}
                        onComplete={() => setIsVerifyComplete(true)}
                    />
                )}

                {/* Node detail panel */}
                {phase === 2 && selectedNodeId && (
                    <NodeDetailPanel
                        nodeId={selectedNodeId}
                        nodeName={selectedNodeName}
                        nodeReadme={selectedNodeReadme}
                        nodeType={selectedNodeType}
                        onClose={() => setSelectedNodeId(null)}
                    />
                )}

                {/* Phase info overlay */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center pointer-events-none z-20"
                    key={phase}
                    style={{ animation: 'fade-in 0.6s ease-out' }}>
                    <h2 className="text-lg font-medium text-foreground" style={{ fontFamily: "'Newsreader', serif" }}>
                        {info.title}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{info.subtitle}</p>
                </div>
            </main>
        </div>
    );
}
