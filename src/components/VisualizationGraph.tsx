import { useRef, useEffect, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

type VisualizationType = 'knowledge' | 'exploration' | 'contradictions';

interface VisualizationGraphProps {
  clientId: Id<'clients'>;
  type?: VisualizationType;
  onNodeClick?: (nodeId: string) => void;
}

export function VisualizationGraph({ 
  clientId, 
  type = 'knowledge',
  onNodeClick 
}: VisualizationGraphProps) {
  // Query based on visualization type
  const knowledgeData = useQuery(
    api.visualizationGraph.getKnowledgeTree,
    type === 'knowledge' ? { clientId } : 'skip'
  );
  
  const explorationData = useQuery(
    api.visualizationGraph.getExplorationGraph,
    type === 'exploration' ? { clientId } : 'skip'
  );
  
  const contradictionsData = useQuery(
    api.visualizationGraph.getContradictionsGraph,
    type === 'contradictions' ? { clientId } : 'skip'
  );

  const graphData = type === 'knowledge' ? knowledgeData 
    : type === 'exploration' ? explorationData
    : contradictionsData;

  const graphRef = useRef<any>(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [hoverNode, setHoverNode] = useState<any>(null);

  // Zoom to fit when graph loads
  useEffect(() => {
    if (graphRef.current && graphData?.nodes.length) {
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 50);
      }, 100);
    }
  }, [graphData?.nodes.length]);

  const handleNodeClick = useCallback(
    (node: any) => {
      if (onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick],
  );

  const handleNodeHover = useCallback((node: any) => {
    setHoverNode(node || null);
    if (node) {
      const neighbors = new Set();
      graphData?.links.forEach((link: any) => {
        if (link.source.id === node.id || link.source === node.id) {
          neighbors.add(link.target.id || link.target);
        }
        if (link.target.id === node.id || link.target === node.id) {
          neighbors.add(link.source.id || link.source);
        }
      });
      setHighlightNodes(neighbors);
    } else {
      setHighlightNodes(new Set());
    }
  }, [graphData]);

  if (!graphData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400">Loading visualization...</p>
      </div>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400">No data to visualize yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-slate-900 rounded-lg overflow-hidden">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        backgroundColor="#0f172a"
        linkColor={(link: any) => {
          const colors = {
            parent_of: '#3b82f6',
            relates_to: '#10b981',
            depends_on: '#f59e0b',
            contradicts: '#ef4444',
            explored: '#8b5cf6',
            same_folder: '#6b7280',
          };
          return colors[link.relationship as keyof typeof colors] || '#6b7280';
        }}
        linkDirectionalArrowLength={(link: any) => 
          link.relationship === 'parent_of' ? 6 : 0
        }
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 12 / globalScale;
          const iconSize = 16 / globalScale;

          // File type to emoji mapping
          const fileIcons: Record<string, string> = {
            pdf: '📄',
            spreadsheet: '📊',
            email: '📧',
            document: '📝',
            image: '🖼️',
            presentation: '📊',
            gmail: '📧',
            drive: '📁',
            sheets: '📊',
            domain: '🏛️',
            skill: '⚡',
            entry_group: '📚',
            source: '📦',
            other: '📎'
          };

          // Processing status colors (subtle backgrounds)
          const statusColors = {
            discovered: '#555555',
            processing: '#FFA500',
            processed: '#4CAF50',
            error: '#F44336',
            pending: '#6b7280',
            connected: '#10b981',
            disconnected: '#ef4444',
          };

          const icon = fileIcons[node.type || node.fileType || 'other'] || '📎';
          const bgColor = statusColors[
            node.processingStatus || node.status || 'discovered'
          ] || '#555555';

          // Highlight effect
          const isHighlight = highlightNodes.has(node.id);
          const isHover = hoverNode?.id === node.id;

          // Draw glow for highlighted nodes
          if (isHighlight || isHover) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, iconSize * 1.5, 0, 2 * Math.PI);
            ctx.fillStyle = bgColor + '60';
            ctx.fill();
          }

          // Draw subtle background circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, iconSize * 0.8, 0, 2 * Math.PI);
          ctx.fillStyle = bgColor + '40';
          ctx.fill();

          // Draw border
          if (isHover) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Draw emoji icon
          ctx.font = `${iconSize}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(icon, node.x, node.y);

          // Draw label below icon
          if (globalScale > 0.6 || isHover) {
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.fillText(label, node.x, node.y + iconSize + 4);
            ctx.shadowBlur = 0;
          }
        }}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        cooldownTicks={100}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
      />
      
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-slate-800/90 rounded-lg p-4 text-sm">
        <h3 className="font-semibold text-white mb-2">
          {type === 'knowledge' && 'Knowledge Tree'}
          {type === 'exploration' && 'Data Sources'}
          {type === 'contradictions' && 'Contradictions'}
        </h3>
        <div className="space-y-1 text-slate-300">
          {type === 'knowledge' && (
            <>
              <div className="flex items-center gap-2">
                <span>🏛️</span> <span>Domain</span>
              </div>
              <div className="flex items-center gap-2">
                <span>⚡</span> <span>Skill</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📚</span> <span>Entry Group</span>
              </div>
            </>
          )}
          {type === 'exploration' && (
            <>
              <div className="flex items-center gap-2">
                <span>📧</span> <span>Gmail</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📁</span> <span>Drive</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📊</span> <span>Sheets</span>
              </div>
            </>
          )}
          {type === 'contradictions' && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Contradicting Sources</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
