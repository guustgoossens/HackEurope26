import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface KnowledgeGraphProps {
  clientId: string;
  onSelectNode?: (nodeId: string | null, readme?: string, name?: string, type?: string) => void;
  cleanMode?: boolean;
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

export function KnowledgeGraph({ clientId, onSelectNode, cleanMode = false }: KnowledgeGraphProps) {
  const treeNodes = useQuery(api.knowledge.getTree, { clientId: clientId as Id<'clients'> });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const simRef = useRef<d3.Simulation<any, any> | null>(null);
  const posRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const initDone = useRef(false);
  const cbRef = useRef(onSelectNode);
  useEffect(() => { cbRef.current = onSelectNode; });

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
    // eslint-disable-next-line @typescript-eslint/unbound-method
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

  // Update data whenever treeNodes or cleanMode change
  useEffect(() => {
    if (!initDone.current || !gRef.current || !treeNodes) return;
    if (treeNodes.length === 0) return;
    const g = d3.select(gRef.current);

    // Filter nodes based on cleanMode
    const visibleNodes = cleanMode
      ? treeNodes.filter((n) => n.type === 'domain' || n.type === 'skill')
      : treeNodes;

    // Build domain color map from top-level nodes
    const domainNodes = visibleNodes.filter((n) => !n.parentId);
    const domainColor: Record<string, string> = {};
    domainNodes.forEach((n, i) => {
      domainColor[n._id] = DOMAIN_COLORS[i % DOMAIN_COLORS.length];
    });

    function getRootId(nodeId: string): string {
      const node = visibleNodes.find((n) => n._id === nodeId);
      if (!node) return nodeId;
      if (!node.parentId) return nodeId;
      return getRootId(node.parentId);
    }

    const simNodes: any[] = visibleNodes.map((n) => {
      const rootId = getRootId(n._id);
      const baseColor = domainColor[rootId] || DOMAIN_COLORS[0];
      const color = cleanMode ? baseColor : baseColor;
      const s = posRef.current.get(n._id);
      const domainIdx = domainNodes.findIndex((d) => d._id === rootId);
      const angle = (domainIdx / Math.max(domainNodes.length, 1)) * Math.PI * 2;
      const spread = cleanMode ? 180 : 250;
      const jitter = cleanMode ? 30 : 80;
      const defaultX = Math.cos(angle) * spread + (Math.random() - 0.5) * jitter;
      const defaultY = Math.sin(angle) * spread + (Math.random() - 0.5) * jitter;
      return {
        id: n._id,
        name: n.name,
        type: n.type,
        parentId: n.parentId,
        readme: n.readme,
        color,
        domainAngle: angle,
        x: s?.x ?? defaultX,
        y: s?.y ?? defaultY,
      };
    });

    const nodeIds = new Set(simNodes.map((n) => n.id));
    const simEdges = simNodes
      .filter((n) => n.parentId && nodeIds.has(n.parentId))
      .map((n) => ({ source: n.parentId, target: n.id }));

    simRef.current?.stop();

    // Messy: stronger repulsion (more chaos); clean: tighter, organized
    const chargeStrength = cleanMode ? -120 : -220;
    const linkStrength = cleanMode ? 0.5 : 0.25;
    const centerStrength = cleanMode ? 0.08 : 0.03;
    const orbitRadius = cleanMode ? 200 : 240;

    const sim = d3
      .forceSimulation(simNodes)
      .force('link', d3.forceLink(simEdges).id((d: any) => d.id).distance(70).strength(linkStrength))
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('collide', d3.forceCollide().radius((d: any) => (NODE_R[d.type] || 8) + 6))
      .force('x', d3.forceX((d: any) => Math.cos(d.domainAngle) * orbitRadius).strength(centerStrength))
      .force('y', d3.forceY((d: any) => Math.sin(d.domainAngle) * orbitRadius).strength(centerStrength))
      .alpha(0.4)
      .alphaDecay(0.025);
    simRef.current = sim;

    // Links
    const linkColor = cleanMode ? 'hsl(217, 30%, 80%)' : 'hsl(217, 20%, 82%)';
    const link = g
      .select('.links')
      .selectAll<SVGLineElement, any>('line')
      .data(simEdges, (d: any) => `${d.source.id ?? d.source}-${d.target.id ?? d.target}`);
    link.exit().remove();
    const linkEnter = link
      .enter()
      .append('line')
      .attr('stroke', linkColor)
      .attr('stroke-width', 1)
      .attr('opacity', 0);
    linkEnter.transition().duration(600).attr('opacity', cleanMode ? 0.4 : 0.28);
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
      .attr('fill', 'hsl(220, 15%, 45%)')
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
  }, [treeNodes, cleanMode]);

  // Highlight selected node
  useEffect(() => {
    if (!gRef.current) return;
    const g = d3.select(gRef.current);
    g.selectAll<SVGGElement, any>('.node')
      .select('circle')
      .transition()
      .duration(300)
      .attr('stroke', (d: any) => (d.id === selectedId ? 'hsl(210, 80%, 52%)' : 'hsl(0, 0%, 100%)'))
      .attr('stroke-width', (d: any) => (d.id === selectedId ? 3 : 2));
  }, [selectedId]);

  if (treeNodes === undefined) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center rounded-xl"
        style={{ background: 'hsl(220 20% 98%)', border: '1px solid hsl(217 20% 91%)' }}
      >
        <div className="text-sm text-muted-foreground animate-pulse">Chargement du graphe…</div>
      </div>
    );
  }

  if (treeNodes.length === 0) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center rounded-xl min-h-[400px]"
        style={{ background: 'hsl(220 20% 98%)', border: '1px solid hsl(217 20% 91%)' }}
      >
        <div className="text-center space-y-1">
          <div className="text-sm text-muted-foreground">Construction de la base de connaissances…</div>
          <div className="text-xs" style={{ color: 'hsl(217 20% 70%)' }}>
            Les nœuds apparaîtront ici
          </div>
        </div>
      </div>
    );
  }

  // Legend: top-level nodes of the visible set
  const legendNodes = (cleanMode
    ? treeNodes.filter((n) => n.type === 'domain' || n.type === 'skill')
    : treeNodes
  ).filter((n) => !n.parentId);

  const visibleCount = cleanMode ? treeNodes.filter((n) => n.type === 'domain' || n.type === 'skill').length : treeNodes.length;

  return (
    <div className="relative w-full h-full" style={{ minHeight: '400px' }}>
      {/* Domain legend */}
      <div
        className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 rounded-xl p-2.5"
        style={{
          background: 'linear-gradient(135deg, hsl(0 0% 100% / 0.92), hsl(217 30% 97% / 0.92))',
          backdropFilter: 'blur(8px)',
          border: '1px solid hsl(217 20% 90% / 0.6)',
          boxShadow: '0 2px 8px hsl(217 30% 70% / 0.08)',
        }}
      >
        {legendNodes.slice(0, 5).map((n, i) => (
          <div key={n._id} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: DOMAIN_COLORS[i % DOMAIN_COLORS.length] }} />
            <span className="text-foreground/70">{n.name}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div
        className="absolute bottom-3 left-3 z-10 text-xs"
        style={{ color: 'hsl(217 20% 60%)' }}
      >
        {visibleCount} nœuds · {visibleCount > 1 ? visibleCount - 1 : 0} liens
      </div>

      <div
        ref={containerRef}
        className="w-full h-full rounded-xl overflow-hidden"
        style={{ border: '1px solid hsl(217 20% 91%)' }}
      >
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </div>
  );
}
