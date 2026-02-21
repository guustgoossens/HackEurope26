import { useRef, useEffect, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface KnowledgeGraphViewProps {
  orgId: Id<'organizations'>;
  onNodeClick?: (nodeId: Id<'knowledgeBaseNodes'>) => void;
}

export function KnowledgeGraphView({ orgId, onNodeClick }: KnowledgeGraphViewProps) {
  const graphData = useQuery(api.knowledgeGraph?.getKnowledgeGraph, { orgId });
  const graphRef = useRef<any>(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState<any>(null);

  // Zoom to fit when graph loads
  useEffect(() => {
    if (graphRef.current && graphData?.nodes.length) {
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 50);
      }, 100);
    }
  }, [graphData?.nodes.length]);

  // Highlight new nodes (draft status)
  useEffect(() => {
    if (graphData?.nodes) {
      const newNodeIds = graphData.nodes.filter((n: any) => n.status === 'draft').map((n: any) => n.id);
      setHighlightNodes(new Set(newNodeIds));
    }
  }, [graphData]);

  const handleNodeClick = useCallback(
    (node: any) => {
      if (onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick],
  );

  const handleNodeHover = useCallback(
    (node: any) => {
      setHoverNode(node || null);
      if (node) {
        const neighbors = new Set();
        const links = new Set();

        graphData?.links.forEach((link: any) => {
          if (link.source === node.id || link.source.id === node.id) {
            neighbors.add(link.target.id || link.target);
            links.add(link);
          }
          if (link.target === node.id || link.target.id === node.id) {
            neighbors.add(link.source.id || link.source);
            links.add(link);
          }
        });

        setHighlightNodes(neighbors);
        setHighlightLinks(links);
      } else {
        setHighlightNodes(new Set());
        setHighlightLinks(new Set());
      }
    },
    [graphData],
  );

  if (!graphData) {
    return (
      <div className="w-full h-150 border-2 border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center">
        <p className="text-slate-500">Loading knowledge graph...</p>
      </div>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="w-full h-150 border-2 border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center">
        <p className="text-slate-500">No knowledge base nodes yet. Start structuring to see the graph!</p>
      </div>
    );
  }

  return (
    <div className="w-full h-150 border-2 border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-950">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeLabel={(node: any) => node.name}
        nodeRelSize={6}
        nodeVal={(node: any) => {
          // Root nodes (depth 0) are larger
          return Math.max(3, 8 - node.depth * 1.5);
        }}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.15}
        linkWidth={(link: any) => (highlightLinks.has(link) ? 3 : 1)}
        linkColor={(link: any) => {
          if (highlightLinks.has(link)) return '#4ECDC4';

          const colors = {
            depends_on: '#FF6B6B',
            related_to: '#4ECDC4',
            see_also: '#95E1D3',
            parent_of: '#F3A683',
          };
          return colors[link.relationship as keyof typeof colors] || '#888';
        }}
        linkDirectionalArrowLength={(link: any) => (link.relationship === 'depends_on' ? 6 : 0)}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 12 / globalScale;
          const nodeSize = Math.max(3, 8 - node.depth * 1.5);

          // Color by status
          const statusColors = {
            draft: '#FFA500',
            verified: '#4CAF50',
            archived: '#9E9E9E',
          };

          // Depth-based colors for variety
          const depthColors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe'];
          const baseColor = statusColors[node.status as keyof typeof statusColors] || depthColors[node.depth % 5];

          // Highlight effect
          const isHighlight = highlightNodes.has(node.id);
          const isHover = hoverNode?.id === node.id;

          // Draw glow for highlighted nodes
          if (isHighlight || isHover) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeSize * 1.8, 0, 2 * Math.PI);
            ctx.fillStyle = baseColor + '40';
            ctx.fill();
          }

          // Draw main circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
          ctx.fillStyle = baseColor;
          ctx.fill();

          // Draw border
          ctx.strokeStyle = isHover ? '#fff' : '#ffffff80';
          ctx.lineWidth = isHover ? 2 : 1;
          ctx.stroke();

          // Draw label
          if (globalScale > 0.8 || isHover) {
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.fillText(label, node.x, node.y + nodeSize + 2);
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
    </div>
  );
}
