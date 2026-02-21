import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, BookOpen, FileText, Layers } from 'lucide-react';
import clsx from 'clsx';
import type { Id } from '../../convex/_generated/dataModel';

interface KnowledgeTreeProps {
  clientId: string;
  onSelectNode?: (nodeId: string) => void;
  selectedNodeId?: string | null;
}

const nodeTypeConfig = {
  domain: { icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  skill: { icon: Folder, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  entry_group: { icon: FileText, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
};

type TreeNode = {
  _id: Id<'knowledge_tree'>;
  _creationTime: number;
  clientId: Id<'clients'>;
  parentId?: Id<'knowledge_tree'>;
  name: string;
  type: 'domain' | 'skill' | 'entry_group';
  readme?: string;
  order: number;
};

export function KnowledgeTree({ clientId, onSelectNode, selectedNodeId }: KnowledgeTreeProps) {
  const allNodes = useQuery(api.knowledge.getTree, { clientId: clientId as Id<'clients'> });

  if (allNodes === undefined) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Knowledge Tree</h3>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (allNodes.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
        <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-slate-300 mb-1">No knowledge tree yet</h3>
        <p className="text-xs text-slate-500">The structure phase will generate the knowledge tree.</p>
      </div>
    );
  }

  // Build tree from flat list
  const rootNodes = allNodes.filter((n) => !n.parentId).sort((a, b) => a.order - b.order);
  const childrenMap = new Map<string, TreeNode[]>();
  for (const node of allNodes) {
    if (node.parentId) {
      const existing = childrenMap.get(node.parentId) || [];
      existing.push(node);
      childrenMap.set(node.parentId, existing.sort((a, b) => a.order - b.order));
    }
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-300 mb-3">Knowledge Tree</h3>
      <div className="space-y-0.5">
        {rootNodes.map((node) => (
          <TreeNodeRow
            key={node._id}
            node={node}
            childrenMap={childrenMap}
            depth={0}
            onSelect={onSelectNode}
            selectedId={selectedNodeId}
          />
        ))}
      </div>
    </div>
  );
}

function TreeNodeRow({
  node,
  childrenMap,
  depth,
  onSelect,
  selectedId,
}: {
  node: TreeNode;
  childrenMap: Map<string, TreeNode[]>;
  depth: number;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const children = childrenMap.get(node._id) || [];
  const hasChildren = children.length > 0;
  const config = nodeTypeConfig[node.type];
  const Icon = config.icon;
  const isSelected = selectedId === node._id;

  return (
    <div>
      <button
        className={clsx(
          'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
          isSelected ? 'bg-blue-600/20 text-white' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white',
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onSelect?.(node._id);
        }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          )
        ) : (
          <span className="w-3.5" />
        )}
        <div className={clsx('w-5 h-5 rounded flex items-center justify-center shrink-0', config.bgColor)}>
          <Icon className={clsx('w-3 h-3', config.color)} />
        </div>
        <span className="truncate">{node.name}</span>
        <span className="ml-auto text-xs text-slate-500 capitalize">{node.type.replace('_', ' ')}</span>
      </button>
      {expanded &&
        children.map((child) => (
          <TreeNodeRow
            key={child._id}
            node={child}
            childrenMap={childrenMap}
            depth={depth + 1}
            onSelect={onSelect}
            selectedId={selectedId}
          />
        ))}
    </div>
  );
}
