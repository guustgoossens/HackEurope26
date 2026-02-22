import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Play, MessageSquare, LayoutTemplate, BookOpen } from 'lucide-react';
import { useAuth } from '@workos-inc/authkit-react';
import { PhaseIndicator } from '@/components/PhaseIndicator';
import { AgentEventFeed } from '@/components/AgentEventFeed';
import { ExploreMetrics } from '@/components/ExploreMetrics';
import { ExploreVisualization } from '@/components/ExploreVisualization';
import { KnowledgeTree } from '@/components/KnowledgeTree';
import { ContradictionsList } from '@/components/ContradictionsList';
import { KnowledgeEntryList } from '@/components/KnowledgeEntry';
import { VisualizationGraph } from '@/components/VisualizationGraph';
import { useComposioConnect } from '@/hooks/useComposioConnect';
import ExplorePhase from '@/components/ExplorePhase';
import type { LiveExploreData } from '@/components/ExplorePhase';
import VerifyPhase from '@/components/VerifyPhase';
import { cn } from '@/lib/utils';
import {
  FolioMail as Mail,
  FolioHardDrive as HardDrive,
  FolioFileSpreadsheet as Sheet,
  FolioCheckCircle2 as CheckCircle2,
} from '@/components/icons/FolioIcons';
import type { Id } from '../../convex/_generated/dataModel';

interface ClientDetailProps {
  clientId: string;
  onBack: () => void;
}

// Safe useAuth wrapper for dev bypass environments
function useAuthSafe() {
  try {
    return useAuth();
  } catch {
    return { user: null };
  }
}

export function ClientDetail({ clientId, onBack }: ClientDetailProps) {
  const { t } = useTranslation();
  const client = useQuery(api.clients.get, { id: clientId as Id<'clients'> });
  const updatePhase = useMutation(api.clients.updatePhase);

  const [pipelineStarting, setPipelineStarting] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'pipeline' | 'docs'>('pipeline');
  const [showChat, setShowChat] = useState(false);

  if (client === undefined) {
    return (
      <div className="landing min-h-full">
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 rounded w-32" style={{ background: 'hsl(217 20% 90%)' }} />
            <div className="h-10 rounded w-64" style={{ background: 'hsl(217 20% 92%)' }} />
            <div className="h-48 rounded-2xl" style={{ background: 'hsl(217 20% 94%)' }} />
          </div>
        </div>
      </div>
    );
  }

  if (client === null) {
    return (
      <div className="landing min-h-full">
        <div className="p-8">
          <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" />
            {t('client.backToDashboard')}
          </button>
          <p className="text-muted-foreground">{t('client.clientNotFound')}</p>
        </div>
      </div>
    );
  }

  const handleStartExplore = async () => {
    setPipelineStarting(true);
    setPipelineError(null);
    try {
      await updatePhase({ id: clientId as Id<'clients'>, phase: 'explore' });

      const agentUrl = import.meta.env.VITE_AGENT_SERVER_URL ?? 'http://localhost:8000';
      const res = await fetch(`${agentUrl}/api/pipeline/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          auth_token: import.meta.env.VITE_AGENT_AUTH_TOKEN ?? '',
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Agent server ${res.status}: ${text}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setPipelineError(msg);
      console.error('Pipeline start failed:', msg);
    } finally {
      setPipelineStarting(false);
    }
  };

  return (
    <div className="landing min-h-full">
      <div className="p-8">
        {/* Header */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('client.backToDashboard')}
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: "'Newsreader', serif" }}>{client.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{client.industry}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('pipeline')}
                className={cn('flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors', activeTab === 'pipeline' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <LayoutTemplate className="w-4 h-4" />
                Vue générale
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={cn('flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors', activeTab === 'docs' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <BookOpen className="w-4 h-4" />
                Documentation
              </button>
            </div>

            {/* Chat Toggle */}
            <button
              onClick={() => setShowChat(!showChat)}
              className="btn-organic flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg"
              style={{ background: showChat ? 'hsl(217 71% 20%)' : 'hsl(217 71% 30%)' }}
            >
              <MessageSquare className="w-4 h-4" />
              Chat {showChat ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        <div className="flex gap-6 max-w-full relative">
          <div className="flex-1 min-w-0">
            {/* Phase indicator only on default tab */}
            {activeTab === 'pipeline' && (
              <div className="mb-8">
                <PhaseIndicator currentPhase={client.phase} />
              </div>
            )}

            {/* Content */}
            {activeTab === 'docs' ? (
              <StructurePanel clientId={clientId} />
            ) : (
              <>
                {client.phase === 'onboard' && (
                  <OnboardPanel
                    clientId={clientId}
                    onStartExplore={() => void handleStartExplore()}
                    pipelineStarting={pipelineStarting}
                    pipelineError={pipelineError}
                  />
                )}
                {client.phase === 'explore' && <LiveExplorePanel clientId={clientId} />}
                {client.phase === 'structure' && <StructurePanel clientId={clientId} />}
                {client.phase === 'verify' && <VerifyWrapper clientId={clientId} />}
                {client.phase === 'use' && <UsePanel clientId={clientId} />}
              </>
            )}
          </div>

          {/* Sliding Chat Panel */}
          {showChat && (
            <div className="w-80 shrink-0 border-l border-slate-200 pl-6 h-[calc(100vh-140px)] overflow-y-auto sticky top-6">
              <AgentEventFeed clientId={clientId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OnboardPanel({
  clientId,
  onStartExplore,
  pipelineStarting,
  pipelineError,
}: {
  clientId: string;
  onStartExplore: () => void;
  pipelineStarting: boolean;
  pipelineError: string | null;
}) {
  const dataSources = useQuery(api.dataSources.listByClient, { clientId: clientId as Id<'clients'> });
  const { connect, connecting } = useComposioConnect({ clientId: clientId as Id<'clients'> });

  const connectedTypes = new Set(
    dataSources?.filter((ds) => ds.connectionStatus === 'connected').map((ds) => ds.type) ?? [],
  );

  const { t } = useTranslation();
  const sourceButtons = [
    { type: 'gmail' as const, label: t('client.connectGmail'), icon: Mail },
    { type: 'drive' as const, label: t('client.connectDrive'), icon: HardDrive },
    { type: 'sheets' as const, label: t('client.connectSheets'), icon: Sheet },
  ];

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, hsl(0 0% 100%), hsl(217 30% 97%))',
          border: '1px solid hsl(217 20% 91%)',
          boxShadow: '0 2px 8px hsl(217 30% 70% / 0.06)',
        }}
      >
        <h3 className="text-lg font-semibold text-foreground mb-2" style={{ fontFamily: "'Newsreader', serif" }}>
          {t('client.welcome')}
        </h3>
        <p className="text-sm text-muted-foreground mb-6">{t('client.welcomeP')}</p>

        {/* Connect buttons */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {sourceButtons.map(({ type, label, icon: Icon }) => {
            const isConnected = connectedTypes.has(type);
            const isConnecting = connecting === type;

            return (
              <button
                key={type}
                onClick={() => void connect(type)}
                disabled={isConnected || isConnecting}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200 disabled:opacity-70',
                  !isConnected && !isConnecting && 'btn-organic',
                )}
                style={
                  isConnected
                    ? {
                      background: 'hsl(152 40% 96%)',
                      border: '1px solid hsl(152 35% 85%)',
                      color: 'hsl(152 50% 32%)',
                    }
                    : {
                      background: 'linear-gradient(135deg, hsl(217 55% 96%), hsl(217 45% 93%))',
                      border: '1px solid hsl(217 35% 85%)',
                      color: 'hsl(217 60% 45%)',
                    }
                }
              >
                {isConnecting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : isConnected ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <Icon className="w-6 h-6" />
                )}
                <span className="text-xs font-medium">{isConnected ? t('common.connected') : label}</span>
              </button>
            );
          })}
        </div>

        {/* Connected data sources list */}
        {dataSources && dataSources.length > 0 && (
          <div className="space-y-2 mb-6">
            {dataSources.map((ds) => (
              <div
                key={ds._id}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: 'hsl(217 20% 97%)', border: '1px solid hsl(217 20% 93%)' }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-lg capitalize font-medium"
                    style={{ background: 'hsl(217 30% 92%)', color: 'hsl(217 50% 40%)' }}
                  >
                    {ds.type}
                  </span>
                  <span className="text-sm text-foreground">{ds.label}</span>
                </div>
                <ConnectionBadge status={ds.connectionStatus} />
              </div>
            ))}
          </div>
        )}

        {/* Start exploration */}
        {(dataSources?.length ?? 0) > 0 && (
          <button
            onClick={onStartExplore}
            disabled={pipelineStarting}
            className="btn-organic flex items-center gap-2 text-sm px-5 py-2.5 text-white font-medium disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, hsl(217 65% 52%), hsl(217 75% 43%))',
              boxShadow: '0 4px 16px hsl(217 60% 50% / 0.3)',
            }}
          >
            {pipelineStarting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('client.startingPipeline')}
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                {t('client.startExploration')}
              </>
            )}
          </button>
        )}

        {pipelineError && (
          <p
            className="mt-3 text-sm rounded-xl px-4 py-2"
            style={{
              background: 'hsl(0 80% 97%)',
              border: '1px solid hsl(0 50% 88%)',
              color: 'hsl(0 60% 40%)',
            }}
          >
            {pipelineError}
          </p>
        )}
      </div>
    </div>
  );
}

function LiveExplorePanel({ clientId }: { clientId: string }) {
  const agentEvents = useQuery(api.agentEvents.listByClient, { clientId: clientId as Id<'clients'> });
  const explorations = useQuery(api.explorations.listByClient, { clientId: clientId as Id<'clients'> });

  const liveData: LiveExploreData = {
    explorations: explorations?.map(e => ({
      dataSourceId: e.dataSourceId,
      metrics: (e.metrics as Record<string, number>) ?? {},
      status: e.status,
    })),
    agentEvents: agentEvents?.map(e => ({
      message: e.message,
      agentName: e.agentName,
      _creationTime: e._creationTime,
    })),
  };

  return (
    <div className="space-y-6">
      {/* Animated 3-step narrative: connection → exploration → bilan */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          height: '540px',
          border: '1px solid hsl(217 20% 91%)',
          boxShadow: '0 2px 8px hsl(217 30% 70% / 0.06)',
        }}
      >
        <ExplorePhase clientId={clientId} liveData={liveData} />
      </div>

      {/* Real-time per-source extraction counts */}
      <ExploreVisualization clientId={clientId} />

      {/* Pipeline status: phase progress, active agents, last activity */}
      <ExploreMetrics clientId={clientId} />

      <ExploreMetrics clientId={clientId} />
    </div>
  );
}

function StructurePanel({ clientId }: { clientId: string }) {
  const { t } = useTranslation();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'graph'>('tree');

  return (
    <div className="space-y-6">
      {/* Pipeline status */}
      <ExploreMetrics clientId={clientId} />

      {/* View mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('tree')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
            viewMode === 'tree' ? 'text-white btn-organic' : 'text-muted-foreground hover:text-foreground',
          )}
          style={
            viewMode === 'tree'
              ? { background: 'linear-gradient(135deg, hsl(217 65% 52%), hsl(217 75% 43%))', boxShadow: '0 2px 8px hsl(217 60% 50% / 0.25)' }
              : { background: 'hsl(217 20% 97%)', border: '1px solid hsl(217 20% 91%)' }
          }
        >
          {t('client.treeView')}
        </button>
        <button
          onClick={() => setViewMode('graph')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
            viewMode === 'graph' ? 'text-white btn-organic' : 'text-muted-foreground hover:text-foreground',
          )}
          style={
            viewMode === 'graph'
              ? { background: 'linear-gradient(135deg, hsl(217 65% 52%), hsl(217 75% 43%))', boxShadow: '0 2px 8px hsl(217 60% 50% / 0.25)' }
              : { background: 'hsl(217 20% 97%)', border: '1px solid hsl(217 20% 91%)' }
          }
        >
          {t('client.graphView')}
        </button>
      </div>

      {viewMode === 'graph' ? (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ height: '600px', border: '1px solid hsl(217 20% 91%)', boxShadow: '0 2px 8px hsl(217 30% 70% / 0.06)' }}
        >
          <VisualizationGraph clientId={clientId as Id<'clients'>} type="knowledge" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <KnowledgeTree clientId={clientId} onSelectNode={setSelectedNodeId} selectedNodeId={selectedNodeId} />
            <ContradictionsList clientId={clientId} />
          </div>

          {selectedNodeId && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('client.entries')}</h3>
              <KnowledgeEntryList treeNodeId={selectedNodeId} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function VerifyWrapper({ clientId }: { clientId: string }) {
  const [isComplete, setIsComplete] = useState(false);
  const { user } = useAuthSafe();

  return (
    <div className="space-y-6">
      {/* Pipeline status */}
      <ExploreMetrics clientId={clientId} />

      <div
        className="rounded-2xl overflow-hidden flex"
        style={{
          height: '600px',
          border: '1px solid hsl(217 20% 91%)',
          boxShadow: '0 2px 8px hsl(217 30% 70% / 0.06)',
        }}
      >
        <div className="flex-1">
          <VisualizationGraph clientId={clientId as Id<'clients'>} type="contradictions" />
        </div>
        <VerifyPhase
          clientId={clientId}
          isComplete={isComplete}
          onComplete={() => setIsComplete(true)}
          respondedBy={user?.email ?? 'anonymous'}
        />
      </div>
      <ContradictionsList clientId={clientId} />
    </div>
  );
}

function UsePanel({ clientId }: { clientId: string }) {
  const { t } = useTranslation();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'tree'>('graph');

  return (
    <div className="space-y-6">
      {/* Pipeline status */}
      <ExploreMetrics clientId={clientId} />

      {/* View mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('graph')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
            viewMode === 'graph' ? 'text-white btn-organic' : 'text-muted-foreground hover:text-foreground',
          )}
          style={
            viewMode === 'graph'
              ? { background: 'linear-gradient(135deg, hsl(217 65% 52%), hsl(217 75% 43%))', boxShadow: '0 2px 8px hsl(217 60% 50% / 0.25)' }
              : { background: 'hsl(217 20% 97%)', border: '1px solid hsl(217 20% 91%)' }
          }
        >
          {t('client.graphView')}
        </button>
        <button
          onClick={() => setViewMode('tree')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
            viewMode === 'tree' ? 'text-white btn-organic' : 'text-muted-foreground hover:text-foreground',
          )}
          style={
            viewMode === 'tree'
              ? { background: 'linear-gradient(135deg, hsl(217 65% 52%), hsl(217 75% 43%))', boxShadow: '0 2px 8px hsl(217 60% 50% / 0.25)' }
              : { background: 'hsl(217 20% 97%)', border: '1px solid hsl(217 20% 91%)' }
          }
        >
          {t('client.treeView')}
        </button>
      </div>

      {viewMode === 'graph' ? (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ height: '600px', border: '1px solid hsl(217 20% 91%)', boxShadow: '0 2px 8px hsl(217 30% 70% / 0.06)' }}
        >
          <VisualizationGraph clientId={clientId as Id<'clients'>} type="knowledge" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <KnowledgeTree clientId={clientId} onSelectNode={setSelectedNodeId} selectedNodeId={selectedNodeId} />
          </div>
          <div className="lg:col-span-2">
            {selectedNodeId ? (
              <KnowledgeEntryList treeNodeId={selectedNodeId} />
            ) : (
              <div
                className="rounded-2xl p-6 text-center"
                style={{
                  background: 'linear-gradient(135deg, hsl(0 0% 100%), hsl(217 30% 97%))',
                  border: '1px solid hsl(217 20% 91%)',
                }}
              >
                <p className="text-sm text-muted-foreground">{t('client.selectNode')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectionBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const styles: Record<string, React.CSSProperties> = {
    pending: { background: 'hsl(38 80% 96%)', border: '1px solid hsl(38 40% 86%)', color: 'hsl(38 70% 32%)' },
    connected: { background: 'hsl(152 40% 96%)', border: '1px solid hsl(152 35% 85%)', color: 'hsl(152 50% 32%)' },
    error: { background: 'hsl(0 80% 97%)', border: '1px solid hsl(0 50% 88%)', color: 'hsl(0 60% 40%)' },
  };
  const label = t(`client.status_${status}` as 'client.status_pending');

  return (
    <span className="text-xs px-2.5 py-1 rounded-lg font-medium" style={styles[status] ?? styles.pending}>
      {label}
    </span>
  );
}
