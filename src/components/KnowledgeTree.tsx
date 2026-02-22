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
      <div className="card-organic border p-4" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
        <h3 className="text-base font-medium mb-4" style={{ color: 'hsl(var(--foreground))' }}>Knowledge Tree</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded" style={{ background: 'hsl(var(--muted))' }} />
          ))}
        </div>
      </div>
    );
  }

  if (allNodes.length === 0) {
    return (
      <div className="card-organic border rounded-xl p-8 text-center" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
        <BookOpen className="w-10 h-10 mx-auto mb-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
        <h3 className="text-base font-medium mb-1" style={{ color: 'hsl(var(--foreground))' }}>No knowledge tree yet</h3>
        <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>The structure phase will generate the knowledge tree.</p>
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
    <div className="card-organic border p-4" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
      <h3 className="text-base font-medium mb-4" style={{ color: 'hsl(var(--foreground))' }}>Knowledge Tree</h3>
      <div className="space-y-1">
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
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-base transition-colors',
          isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-slate-100 hover:text-slate-900',
        )}
        style={{ paddingLeft: `${depth * 20 + 12}px`, color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onSelect?.(node._id);
        }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="w-5 h-5 shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }} />
          ) : (
            <ChevronRight className="w-5 h-5 shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }} />
          )
        ) : (
          <span className="w-5" />
        )}
        <div className={clsx('w-8 h-8 rounded-md flex items-center justify-center shrink-0', config.bgColor)}>
          <Icon className={clsx('w-4 h-4', config.color)} />
        </div>
        <span className="truncate" style={{ color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}>{node.name}</span>
        <span className="ml-auto text-xs capitalize" style={{ color: 'hsl(var(--muted-foreground))' }}>{node.type.replace('_', ' ')}</span>
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
