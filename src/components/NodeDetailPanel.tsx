import { X, Folder, FileText, Layers } from 'lucide-react';

interface NodeDetailPanelProps {
  nodeId: string | null;
  nodeName: string | null;
  nodeReadme: string | null;
  nodeType: string | null;
  onClose: () => void;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  domain: Folder,
  skill: Layers,
  entry_group: FileText,
};

const typeLabels: Record<string, string> = {
  domain: 'Domain',
  skill: 'Skill',
  entry_group: 'Entry Group',
};

export function NodeDetailPanel({ nodeId, nodeName, nodeReadme, nodeType, onClose }: NodeDetailPanelProps) {
  if (!nodeId || !nodeName) return null;

  const Icon = typeIcons[nodeType || 'domain'] || Folder;

  return (
    <div
      className="absolute right-0 top-0 h-full w-72 z-20 shadow-2xl overflow-y-auto card-organic"
      style={{
        background: 'linear-gradient(180deg, hsl(217 20% 14%), hsl(220 20% 12%))',
        borderLeft: '1px solid hsl(217 20% 25%)',
        animation: 'slideInRight 0.25s ease-out',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 text-blue-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
              {typeLabels[nodeType || 'domain'] || 'Node'}
            </span>
            <h3
              className="text-sm font-semibold text-white leading-tight truncate"
              style={{ fontFamily: "'Newsreader', serif" }}
            >
              {nodeName}
            </h3>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-500 hover:text-white transition-colors shrink-0 ml-2"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* README content */}
      <div className="p-4">
        {nodeReadme ? (
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">README</p>
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {nodeReadme}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-600 italic">
            No README available for this node yet.
          </div>
        )}
      </div>
    </div>
  );
}
