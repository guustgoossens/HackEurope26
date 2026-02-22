import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState } from 'react';
import { ArrowLeft, Plus, Play, Mail, HardDrive, Sheet, Loader2, Network } from 'lucide-react';
import { useAuth } from '@workos-inc/authkit-react';
import { PhaseIndicator } from '@/components/PhaseIndicator';
import { AgentEventFeed } from '@/components/AgentEventFeed';
import { ExploreMetrics } from '@/components/ExploreMetrics';
import { KnowledgeTree } from '@/components/KnowledgeTree';
import { ContradictionsList } from '@/components/ContradictionsList';
import { QuestionCard } from '@/components/QuestionCard';
import { KnowledgeEntryList } from '@/components/KnowledgeEntry';
import { VisualizationGraph } from '@/components/VisualizationGraph';
import { useComposioConnect } from '@/hooks/useComposioConnect';
import { ExploreVisualization } from '@/components/ExploreVisualization';
import { KnowledgeGraph } from '@/components/KnowledgeGraph';
import { NodeDetailPanel } from '@/components/NodeDetailPanel';
import type { Id } from '../../convex/_generated/dataModel';

interface ClientDetailProps {
  clientId: string;
  onBack: () => void;
}

const sourceTypes = ['gmail', 'drive', 'sheets'] as const;

export function ClientDetail({ clientId, onBack }: ClientDetailProps) {
  const client = useQuery(api.clients.get, { id: clientId as Id<'clients'> });
  const dataSources = useQuery(api.dataSources.listByClient, { clientId: clientId as Id<'clients'> });
  const createDataSource = useMutation(api.dataSources.create);
  const triggerPipeline = useAction(api.triggerPipeline.start);

  const [showAddSource, setShowAddSource] = useState(false);
  const [sourceType, setSourceType] = useState<(typeof sourceTypes)[number]>('gmail');
  const [sourceLabel, setSourceLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [pipelineStarting, setPipelineStarting] = useState(false);

  if (client === undefined) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-32" />
          <div className="h-10 bg-slate-700 rounded w-64" />
          <div className="h-48 bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (client === null) {
    return (
      <div className="p-8">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <p className="text-slate-400">Client not found.</p>
      </div>
    );
  }

  const handleAddSource = async () => {
    if (!sourceLabel.trim()) return;
    setCreating(true);
    try {
      await createDataSource({
        clientId: clientId as Id<'clients'>,
        type: sourceType,
        label: sourceLabel.trim(),
      });
      setSourceLabel('');
      setShowAddSource(false);
    } finally {
      setCreating(false);
    }
  };

  const handleStartExplore = async () => {
    setPipelineStarting(true);
    try {
      await triggerPipeline({ clientId: clientId as Id<'clients'> });
    } finally {
      setPipelineStarting(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{client.name}</h1>
          <p className="text-slate-400 mt-1">{client.industry}</p>
        </div>
      </div>

      {/* Phase indicator */}
      <div className="mb-8">
        <PhaseIndicator currentPhase={client.phase} />
      </div>

      {/* Phase-specific content */}
      {client.phase === 'onboard' && (
        <OnboardPanel clientId={clientId} onStartExplore={() => void handleStartExplore()} pipelineStarting={pipelineStarting} />
      )}
      {client.phase === 'explore' && (
        <ExplorePanel
          clientId={clientId}
          dataSources={dataSources}
          showAddSource={showAddSource}
          setShowAddSource={setShowAddSource}
          sourceType={sourceType}
          setSourceType={setSourceType}
          sourceLabel={sourceLabel}
          setSourceLabel={setSourceLabel}
          creating={creating}
          onAddSource={() => void handleAddSource()}
        />
      )}
      {client.phase === 'structure' && <StructurePanel clientId={clientId} />}
      {client.phase === 'verify' && <VerifyPanel clientId={clientId} />}
      {client.phase === 'use' && <UsePanel clientId={clientId} />}
    </div>
  );
}

function OnboardPanel({
  clientId,
  onStartExplore,
  pipelineStarting,
}: {
  clientId: string;
  onStartExplore: () => void;
  pipelineStarting: boolean;
}) {
  const dataSources = useQuery(api.dataSources.listByClient, { clientId: clientId as Id<'clients'> });
  const { connect, connecting } = useComposioConnect({
    clientId: clientId as Id<'clients'>,
  });

  const connectedTypes = new Set(
    dataSources?.filter((ds) => ds.connectionStatus === 'connected').map((ds) => ds.type) ?? [],
  );

  const sourceButtons = [
    { type: 'gmail' as const, label: 'Connect Gmail', icon: Mail, color: 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 text-red-400' },
    { type: 'drive' as const, label: 'Connect Drive', icon: HardDrive, color: 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20 text-green-400' },
    { type: 'sheets' as const, label: 'Connect Sheets', icon: Sheet, color: 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20 text-purple-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-medium text-white mb-2">Welcome</h3>
        <p className="text-sm text-slate-400 mb-6">
          Connect Google Workspace data sources to begin making this client's data AI-ready. Click a button below to
          authenticate via OAuth, then start the exploration.
        </p>

        {/* Connect buttons */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {sourceButtons.map(({ type, label, icon: Icon, color }) => {
            const isConnected = connectedTypes.has(type);
            const isConnecting = connecting === type;

            return (
              <button
                key={type}
                onClick={() => void connect(type)}
                disabled={isConnected || isConnecting}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${
                  isConnected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-default'
                    : isConnecting
                      ? 'bg-slate-700 border-slate-600 text-slate-400 cursor-wait'
                      : color
                } disabled:opacity-70`}
              >
                {isConnecting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Icon className="w-6 h-6" />}
                <span className="text-xs font-medium">{isConnected ? 'Connected' : label}</span>
              </button>
            );
          })}
        </div>

        {/* Connected data sources list */}
        {dataSources && dataSources.length > 0 && (
          <div className="space-y-2 mb-6">
            {dataSources.map((ds) => (
              <div key={ds._id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded capitalize">{ds.type}</span>
                  <span className="text-sm text-white">{ds.label}</span>
                </div>
                <StatusBadge status={ds.connectionStatus} />
              </div>
            ))}
          </div>
        )}

        {/* Start exploration */}
        {(dataSources?.length ?? 0) > 0 && (
          <button
            onClick={onStartExplore}
            disabled={pipelineStarting}
            className="flex items-center gap-2 text-sm px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {pipelineStarting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting Pipeline...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Exploration
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

interface ExplorePanelProps {
  clientId: string;
  dataSources:
    | Array<{
        _id: string;
        type: string;
        label: string;
        connectionStatus: string;
      }>
    | undefined;
  showAddSource: boolean;
  setShowAddSource: (v: boolean) => void;
  sourceType: 'gmail' | 'drive' | 'sheets';
  setSourceType: (v: 'gmail' | 'drive' | 'sheets') => void;
  sourceLabel: string;
  setSourceLabel: (v: string) => void;
  creating: boolean;
  onAddSource: () => void;
}

function ExplorePanel({
  clientId,
  dataSources,
  showAddSource,
  setShowAddSource,
  sourceType,
  setSourceType,
  sourceLabel,
  setSourceLabel,
  creating,
  onAddSource,
}: ExplorePanelProps) {
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  
  return (
    <div className="space-y-6">
      {/* Source visualisation */}
      <ExploreVisualization clientId={clientId} />

      {/* Metrics */}
      <ExploreMetrics clientId={clientId} />

      {/* View mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('list')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'list'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:text-white'
          }`}
        >
          📋 List View
        </button>
        <button
          onClick={() => setViewMode('graph')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'graph'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:text-white'
          }`}
        >
          🕸️ Graph View
        </button>
      </div>

      {viewMode === 'graph' ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden" style={{ height: '600px' }}>
          <VisualizationGraph clientId={clientId as Id<'clients'>} type="exploration" />
        </div>
      ) : (
        <>
          {/* Data Sources section */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-300">Data Sources</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddSource(!showAddSource)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Source
                </button>
                <StartExploreButton clientId={clientId} />
              </div>
            </div>

        {/* Add source form */}
        {showAddSource && (
          <div className="mb-4 p-3 bg-slate-900 border border-slate-600 rounded-lg">
            <div className="flex gap-3">
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as 'gmail' | 'drive' | 'sheets')}
                className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="gmail">Gmail</option>
                <option value="drive">Google Drive</option>
                <option value="sheets">Google Sheets</option>
              </select>
              <input
                type="text"
                placeholder="Label (e.g., Company Inbox)"
                value={sourceLabel}
                onChange={(e) => setSourceLabel(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onAddSource();
                }}
                autoFocus
              />
              <button
                onClick={onAddSource}
                disabled={creating || !sourceLabel.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        )}

        {/* Data source list */}
        {dataSources === undefined ? (
          <div className="animate-pulse space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 bg-slate-700 rounded" />
            ))}
          </div>
        ) : dataSources.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No data sources yet. Add one to get started.</p>
        ) : (
          <div className="space-y-2">
            {dataSources.map((source) => (
              <div key={source._id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded capitalize">
                    {source.type}
                  </span>
                  <span className="text-sm text-white">{source.label}</span>
                </div>
                <StatusBadge status={source.connectionStatus} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agent Event Feed */}
      <AgentEventFeed clientId={clientId} />
        </>
      )}
    </div>
  );
}

function StructurePanel({ clientId }: { clientId: string }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'graph'>('tree');

  return (
    <div className="space-y-6">
      <ExploreMetrics clientId={clientId} />

      {/* View mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('tree')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'tree'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:text-white'
          }`}
        >
          🌳 Tree View
        </button>
        <button
          onClick={() => setViewMode('graph')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'graph'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:text-white'
          }`}
        >
          🕸️ Graph View
        </button>
      </div>

      {viewMode === 'graph' ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden h-[600px]">
          <VisualizationGraph clientId={clientId as Id<'clients'>} type="knowledge" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <KnowledgeTree clientId={clientId} onSelectNode={setSelectedNodeId} selectedNodeId={selectedNodeId} />
            <ContradictionsList clientId={clientId} />
          </div>

          {selectedNodeId && (
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-3">Entries</h3>
              <KnowledgeEntryList treeNodeId={selectedNodeId} />
            </div>
          )}
        </>
      )}

      <AgentEventFeed clientId={clientId} />
    </div>
  );
}

function VerifyPanel({ clientId }: { clientId: string }) {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'questionnaire' | 'graph'>('questionnaire');
  const questionnaires = useQuery(api.questionnaires.listByClient, {
    clientId: clientId as Id<'clients'>,
  });

  const latestQuestionnaire = questionnaires?.[questionnaires.length - 1];

  return (
    <div className="space-y-6">
      <ExploreMetrics clientId={clientId} />

      {/* View mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('questionnaire')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'questionnaire'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:text-white'
          }`}
        >
          📝 Questionnaire
        </button>
        <button
          onClick={() => setViewMode('graph')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'graph'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:text-white'
          }`}
        >
          🔗 Contradictions Graph
        </button>
      </div>

      {viewMode === 'graph' ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden h-[600px]">
          <VisualizationGraph clientId={clientId as Id<'clients'>} type="contradictions" />
        </div>
      ) : (
        <>
          {!questionnaires || questionnaires.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
              <p className="text-sm text-slate-400">Waiting for the agent to generate a verification questionnaire...</p>
            </div>
          ) : latestQuestionnaire ? (
            <QuestionnaireView
              questionnaireId={latestQuestionnaire._id}
              respondedBy={user?.email ?? 'anonymous'}
            />
          ) : null}
        </>
      )}

      <ContradictionsList clientId={clientId} />
      <AgentEventFeed clientId={clientId} />
    </div>
  );
}

function QuestionnaireView({
  questionnaireId,
  respondedBy,
}: {
  questionnaireId: string;
  respondedBy: string;
}) {
  const data = useQuery(api.questionnaires.getWithResponses, {
    id: questionnaireId as Id<'questionnaires'>,
  });

  if (!data) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-slate-800 rounded-xl" />
        ))}
      </div>
    );
  }

  const { questionnaire, responses } = data;
  const responseMap = new Map(responses.map((r) => [r.questionId, r.selectedOption]));
  const answeredCount = responses.length;
  const totalCount = questionnaire.questions.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-white">{questionnaire.title}</h3>
        <span className="text-xs text-slate-400">
          {answeredCount}/{totalCount} answered
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-700 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${totalCount > 0 ? (answeredCount / totalCount) * 100 : 0}%`,
            background: 'linear-gradient(90deg, hsl(217, 55%, 60%), hsl(152, 55%, 42%))',
          }}
        />
      </div>

      {answeredCount === totalCount && totalCount > 0 ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
            <span className="text-emerald-400 text-xl">✓</span>
          </div>
          <h4 className="text-white font-semibold mb-1">All questions answered</h4>
          <p className="text-sm text-slate-400">The knowledge base is ready for deployment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questionnaire.questions.map((q) => (
            <QuestionCard
              key={q.id}
              questionnaireId={questionnaireId}
              question={q}
              existingResponse={responseMap.get(q.id)}
              respondedBy={respondedBy}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UsePanel({ clientId }: { clientId: string }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <ExploreMetrics clientId={clientId} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <KnowledgeTree clientId={clientId} onSelectNode={setSelectedNodeId} selectedNodeId={selectedNodeId} />
        </div>
        <div className="lg:col-span-2">
          {selectedNodeId ? (
            <KnowledgeEntryList treeNodeId={selectedNodeId} />
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
              <p className="text-sm text-slate-400">Select a node from the tree to view knowledge entries.</p>
            </div>
          )}
        </div>
      </div>

      <AgentEventFeed clientId={clientId} />
    </div>
  );
}

function StartExploreButton({ clientId }: { clientId: string }) {
  const triggerPipeline = useAction(api.triggerPipeline.start);
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    setStarting(true);
    try {
      await triggerPipeline({ clientId: clientId as Id<'clients'> });
    } finally {
      setStarting(false);
    }
  };

  return (
    <button
      onClick={() => void handleStart()}
      disabled={starting}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
    >
      {starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
      {starting ? 'Starting...' : 'Start Exploration'}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    connected: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}
