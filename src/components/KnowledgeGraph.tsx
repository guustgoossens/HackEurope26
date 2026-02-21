import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface KnowledgeGraphProps {
  clientId: string;
  onSelectNode?: (nodeId: string | null, readme?: string, name?: string, type?: string) => void;
}

// Domain colors auto-assigned by top-level node index
const DOMAIN_COLORS = [
  'hsl(210, 80%, 52%)',   // blue
  'hsl(38, 90%, 50%)',    // orange
  'hsl(152, 55%, 42%)',   // green
  'hsl(262, 55%, 58%)',   // purple
  'hsl(0, 65%, 52%)',     // red
];

// Node radius by type
const NODE_R: Record<string, number> = {
  domain: 16,
  skill: 11,
  entry_group: 8,
};

export function KnowledgeGraph({ clientId, onSelectNode }: KnowledgeGraphProps) {
  const treeNodes = useQuery(api.knowledge.getTree, { clientId: clientId as Id<'clients'> });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const simRef = useRef<d3.Simulation<any, any> | null>(null);
  const posRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const initDone = useRef(false);
  const cbRef = useRef(onSelectNode);
  cbRef.current = onSelectNode;

  // Init SVG + zoom once
  useEffect(() => {
    const svg = d3.select(svgRef.current!);
    const rect = containerRef.current!.getBoundingClientRect();
    const w = rect.width || 800;
    const h = rect.height || 600;
    svg.attr('viewBox', `0 0 ${w} ${h}`);

    // Light gradient background
    const defs = svg.append('defs');
    const radGrad = defs
      .append('radialGradient')
      .attr('id', 'kg-bg-grad')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '60%');
    radGrad.append('stop').attr('offset', '0%').attr('stop-color', 'hsl(217, 50%, 96%)');
    radGrad.append('stop').attr('offset', '100%').attr('stop-color', 'hsl(220, 20%, 98%)');
    svg.insert('rect', ':first-child').attr('width', w).attr('height', h).attr('fill', 'url(#kg-bg-grad)');

    const g = svg.append('g');
    g.append('g').attr('class', 'links');
    g.append('g').attr('class', 'nodes');
    gRef.current = g.node();

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.translate(w / 2, h / 2).scale(0.85));
    svg.on('click', (e) => {
      if (e.target === svgRef.current) {
        setSelectedId(null);
        cbRef.current?.(null);
      }
    });

    initDone.current = true;
    return () => {
      simRef.current?.stop();
      svg.selectAll('*').remove();
      initDone.current = false;
    };
  }, []);

  // Update data whenever treeNodes change
  useEffect(() => {
    if (!initDone.current || !gRef.current || !treeNodes) return;
    if (treeNodes.length === 0) return;
    const g = d3.select(gRef.current);

    // Build domain color map from top-level nodes
    const domainNodes = treeNodes.filter((n) => !n.parentId);
    const domainColor: Record<string, string> = {};
    domainNodes.forEach((n, i) => {
      domainColor[n._id] = DOMAIN_COLORS[i % DOMAIN_COLORS.length];
    });

    // Assign color to each node by root ancestor
    function getRootId(nodeId: string): string {
      if (!treeNodes) return nodeId;
      const node = treeNodes.find((n) => n._id === nodeId);
      if (!node) return nodeId;
      if (!node.parentId) return nodeId;
      return getRootId(node.parentId);
    }

    // Build D3 nodes
    const simNodes: any[] = treeNodes.map((n) => {
      const rootId = getRootId(n._id);
      const color = domainColor[rootId] || DOMAIN_COLORS[0];
      const s = posRef.current.get(n._id);
      // Spread out domains in a rough circle for initial placement
      const domainIdx = domainNodes.findIndex((d) => d._id === rootId);
      const angle = (domainIdx / Math.max(domainNodes.length, 1)) * Math.PI * 2;
      const radius = n.parentId ? 80 : 0;
      const defaultX = Math.cos(angle) * 200 + (Math.random() - 0.5) * 60;
      const defaultY = Math.sin(angle) * 200 + (Math.random() - 0.5) * 60;
      return {
        id: n._id,
        name: n.name,
        type: n.type,
        parentId: n.parentId,
        readme: n.readme,
        color,
        domainAngle: angle,
        domainRadius: radius,
        x: s?.x ?? defaultX,
        y: s?.y ?? defaultY,
      };
    });

    const nodeIds = new Set(simNodes.map((n) => n.id));
    const simEdges = simNodes
      .filter((n) => n.parentId && nodeIds.has(n.parentId))
      .map((n) => ({ source: n.parentId, target: n.id }));

    simRef.current?.stop();

    const sim = d3
      .forceSimulation(simNodes)
      .force('link', d3.forceLink(simEdges).id((d: any) => d.id).distance(70).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-150))
      .force('collide', d3.forceCollide().radius((d: any) => (NODE_R[d.type] || 8) + 6))
      .force('x', d3.forceX((d: any) => Math.cos(d.domainAngle) * 220).strength(0.05))
      .force('y', d3.forceY((d: any) => Math.sin(d.domainAngle) * 220).strength(0.05))
      .alpha(0.3)
      .alphaDecay(0.025);
    simRef.current = sim;

    // Links
    const link = g
      .select('.links')
      .selectAll<SVGLineElement, any>('line')
      .data(simEdges, (d: any) => `${d.source.id ?? d.source}-${d.target.id ?? d.target}`);
    link.exit().remove();
    const linkEnter = link.enter().append('line').attr('stroke', 'hsl(217, 30%, 82%)').attr('stroke-width', 1).attr('opacity', 0);
    linkEnter.transition().duration(600).attr('opacity', 0.35);
    const allLinks = linkEnter.merge(link);

    // Nodes
    const node = g.select('.nodes').selectAll<SVGGElement, any>('.node').data(simNodes, (d: any) => d.id);
    node.exit().remove();

    const nodeEnter = node.enter().append('g').attr('class', 'node').style('cursor', 'pointer');
    nodeEnter
      .append('circle')
      .attr('r', 0)
      .attr('fill', (d: any) => d.color)
      .attr('stroke', 'hsl(0, 0%, 100%)')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 1px 4px rgba(0,0,0,0.08))')
      .transition()
      .duration(500)
      .attr('r', (d: any) => NODE_R[d.type] || 8);

    nodeEnter
      .append('text')
      .text((d: any) => (d.name.length > 24 ? d.name.slice(0, 22) + '…' : d.name))
      .attr('dx', (d: any) => (NODE_R[d.type] || 8) + 5)
      .attr('dy', 3)
      .attr('font-size', '10px')
      .attr('fill', 'hsl(220, 15%, 50%)')
      .attr('pointer-events', 'none')
      .attr('opacity', 0)
      .transition()
      .delay(250)
      .duration(400)
      .attr('opacity', 0.85);

    const allNodes = nodeEnter.merge(node);

    // Drag
    const drag = d3
      .drag<SVGGElement, any>()
      .on('start', (e, d) => {
        if (!e.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (e, d) => {
        d.fx = e.x;
        d.fy = e.y;
      })
      .on('end', (e, d) => {
        if (!e.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    allNodes.call(drag);
    allNodes.on('click', (e: any, d: any) => {
      e.stopPropagation();
      setSelectedId(d.id);
      cbRef.current?.(d.id, d.readme, d.name, d.type);
    });

    sim.on('tick', () => {
      allLinks
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      allNodes.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      simNodes.forEach((n) => posRef.current.set(n.id, { x: n.x, y: n.y }));
    });
  }, [treeNodes]);

  // Highlight selected node
  useEffect(() => {
    if (!gRef.current) return;
    const g = d3.select(gRef.current);
    g.selectAll<SVGGElement, any>('.node').select('circle').transition().duration(300).attr('stroke', (d: any) => (d.id === selectedId ? 'hsl(210, 80%, 52%)' : 'hsl(0, 0%, 100%)')).attr('stroke-width', (d: any) => (d.id === selectedId ? 3 : 2));
  }, [selectedId]);

  if (treeNodes === undefined) {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-slate-800 rounded-xl border border-slate-700">
        <div className="animate-pulse text-slate-500 text-sm">Loading knowledge graph…</div>
      </div>
    );
  }

  if (treeNodes.length === 0) {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-slate-800 rounded-xl border border-slate-700 min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="text-slate-400 text-sm">Agents are building the knowledge base…</div>
          <div className="text-slate-600 text-xs">Nodes will appear here as they are created</div>
        </div>
      </div>
    );
  }

  // Build domain legend from top-level nodes
  const domainNodes = treeNodes.filter((n) => !n.parentId);

  return (
    <div className="relative w-full" style={{ minHeight: '400px' }}>
      {/* Domain legend */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 bg-slate-900/80 backdrop-blur-sm rounded-lg p-2.5 border border-slate-700">
        {domainNodes.slice(0, 5).map((n, i) => (
          <div key={n._id} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: DOMAIN_COLORS[i % DOMAIN_COLORS.length] }} />
            <span className="text-slate-300">{n.name}</span>
          </div>
        ))}
      </div>
      {/* Stats */}
      <div className="absolute bottom-3 left-3 z-10 text-xs text-slate-500">
        {treeNodes.length} nodes · {treeNodes.filter((n) => n.parentId).length} links
      </div>
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden border border-slate-700" style={{ height: '480px' }}>
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </div>
  );
}
