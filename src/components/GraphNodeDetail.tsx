import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface GraphNodeDetailProps {
  nodeId: Id<'knowledgeBaseNodes'> | null;
  onClose: () => void;
}

export function GraphNodeDetail({ nodeId, onClose }: GraphNodeDetailProps) {
  const nodeDetails = useQuery(
    api.knowledgeGraph?.getNodeDetails,
    nodeId ? { nodeId } : 'skip',
  );

  if (!nodeId || !nodeDetails) {
    return null;
  }

  const { node, dataItems, outgoingLinks, incomingLinks } = nodeDetails;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 border-l-2 border-slate-200 dark:border-slate-800 shadow-xl overflow-y-auto z-50">
      <div className="sticky top-0 bg-white dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center">
        <h2 className="text-xl font-bold">{node.name}</h2>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Status Badge */}
        <div>
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              node.status === 'verified'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : node.status === 'draft'
                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
            }`}
          >
            {node.status}
          </span>
          <span className="ml-2 text-sm text-slate-500">Depth: {node.depth}</span>
        </div>

        {/* README */}
        {node.readme && (
          <div>
            <h3 className="text-sm font-bold uppercase text-slate-500 mb-2">README</h3>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md text-sm whitespace-pre-wrap">
              {node.readme}
            </div>
          </div>
        )}

        {/* Data Items */}
        {dataItems.length > 0 && (
          <div>
            <h3 className="text-sm font-bold uppercase text-slate-500 mb-2">
              Data Items ({dataItems.length})
            </h3>
            <div className="space-y-2">
              {dataItems.map((item: any) => (
                <div
                  key={item._id}
                  className="bg-slate-100 dark:bg-slate-800 p-2 rounded-md text-sm"
                >
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-slate-500">
                    {item.fileType} • {item.processingStatus}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outgoing Links */}
        {outgoingLinks.length > 0 && (
          <div>
            <h3 className="text-sm font-bold uppercase text-slate-500 mb-2">
              Connections ({outgoingLinks.length})
            </h3>
            <div className="space-y-1">
              {outgoingLinks.map((link: any, idx: number) => (
                <div key={idx} className="text-sm">
                  <span className="text-slate-400">{link.relationship.replace('_', ' ')}</span>
                  <span className="text-slate-600 dark:text-slate-300 ml-2">→</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incoming Links */}
        {incomingLinks.length > 0 && (
          <div>
            <h3 className="text-sm font-bold uppercase text-slate-500 mb-2">
              Referenced By ({incomingLinks.length})
            </h3>
            <div className="space-y-1">
              {incomingLinks.map((link: any, idx: number) => (
                <div key={idx} className="text-sm">
                  <span className="text-slate-400">{link.relationship.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
