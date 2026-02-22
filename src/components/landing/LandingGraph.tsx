import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { SORTED_NODES, landingEdges } from '@/data/landingGraphData';

interface Props {
  visibleCount: number;
  className?: string;
}

const NODE_R: Record<number, number> = { 0: 18, 1: 10, 2: 5 };
const NODE_COLOR: Record<string, string> = { verified: '#1E3A5F', draft: '#3B82F6' };

const GROUP_POS: Record<string, { x: number; y: number }> = {
  finance: { x: -200, y: -130 },
  compliance: { x: 200, y: -130 },
  clients: { x: 220, y: 110 },
  operations: { x: -200, y: 130 },
};

const EDGE_STYLE: Record<string, { stroke: string; width: number; dash?: string; opacity: number }> = {
  parent_of: { stroke: '#CBD5E1', width: 1, opacity: 0.5 },
  depends_on: { stroke: '#D97706', width: 2, dash: '6 4', opacity: 0.6 },
  references: { stroke: '#93C5FD', width: 1.5, opacity: 0.5 },
  temporal: { stroke: '#CBD5E1', width: 1, dash: '3 3', opacity: 0.3 },
};

export default function LandingGraph({ visibleCount, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const simRef = useRef<d3.Simulation<any, any> | null>(null);
  const posRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const ready = useRef(false);

  useEffect(() => {
    const svg = d3.select(svgRef.current!);
    const { width: w, height: h } = containerRef.current!.getBoundingClientRect();
    svg.attr('viewBox', `0 0 ${w || 900} ${h || 520}`);

    const defs = svg.append('defs');
    const glow = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    glow.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'b');
    const m = glow.append('feMerge');
    m.append('feMergeNode').attr('in', 'b');
    m.append('feMergeNode').attr('in', 'SourceGraphic');

    svg.append('style').text(`
      .edge-flow { animation: edgeFlow 2s linear infinite; }
      @keyframes edgeFlow { to { stroke-dashoffset: -20; } }
    `);

    const g = svg.append('g');
    g.append('g').attr('class', 'links');
    g.append('g').attr('class', 'nodes');
    gRef.current = g.node();

    g.attr('transform', `translate(${(w || 900) / 2}, ${(h || 520) / 2}) scale(0.85)`);

    ready.current = true;
    return () => {
      simRef.current?.stop();
      svg.selectAll('*').remove();
      ready.current = false;
    };
  }, []);

  useEffect(() => {
    if (!ready.current || !gRef.current) return;
    const g = d3.select(gRef.current);

    if (visibleCount === 0) {
      simRef.current?.stop();
      g.select('.links').selectAll('line').remove();
      g.select('.nodes').selectAll('.node').remove();
      posRef.current.clear();
      return;
    }

    const vis = SORTED_NODES.slice(0, visibleCount);
    const visIds = new Set(vis.map((n) => n.id));
    const visEdges = landingEdges.filter((e) => visIds.has(e.source) && visIds.has(e.target));

    const simNodes: any[] = vis.map((n) => {
      const s = posRef.current.get(n.id);
      const gp = GROUP_POS[n.group] || { x: 0, y: 0 };
      return { ...n, x: s?.x ?? gp.x + (Math.random() - 0.5) * 70, y: s?.y ?? gp.y + (Math.random() - 0.5) * 70 };
    });
    const simEdges = visEdges.map((e) => ({ ...e }));

    simRef.current?.stop();
    const sim = d3
      .forceSimulation(simNodes)
      .force(
        'link',
        d3
          .forceLink(simEdges)
          .id((d: any) => d.id)
          .distance((d: any) => (d.type === 'parent_of' ? 45 : 90))
          .strength((d: any) => (d.type === 'parent_of' ? 0.5 : 0.12)),
      )
      .force('charge', d3.forceManyBody().strength((d: any) => (d.depth === 0 ? -280 : d.depth === 1 ? -100 : -40)))
      .force('collide', d3.forceCollide().radius((d: any) => (NODE_R[d.depth] || 5) + 8))
      .force('x', d3.forceX((d: any) => GROUP_POS[d.group]?.x || 0).strength(0.06))
      .force('y', d3.forceY((d: any) => GROUP_POS[d.group]?.y || 0).strength(0.06))
      .alpha(visibleCount <= 4 ? 1 : 0.2)
      .alphaDecay(0.02);
    simRef.current = sim;

    const link = g
      .select('.links')
      .selectAll<SVGLineElement, any>('line')
      .data(simEdges, (d: any) => `${d.source.id ?? d.source}-${d.target.id ?? d.target}-${d.type}`);
    link.exit().remove();
    const linkE = link
      .enter()
      .append('line')
      .each(function (d: any) {
        const s = EDGE_STYLE[d.type] || EDGE_STYLE.parent_of;
        const el = d3.select(this).attr('stroke', s.stroke).attr('stroke-width', s.width).attr('opacity', 0);
        if (s.dash) el.attr('stroke-dasharray', s.dash);
        if (d.type === 'depends_on') el.classed('edge-flow', true);
      });
    linkE.transition().duration(500).attr('opacity', (d: any) => EDGE_STYLE[d.type]?.opacity ?? 0.3);
    const allLinks = linkE.merge(link);

    const node = g.select('.nodes').selectAll<SVGGElement, any>('.node').data(simNodes, (d: any) => d.id);
    node.exit().remove();
    const ne = node.enter().append('g').attr('class', 'node');

    const drag = d3
      .drag<SVGGElement, any>()
      .on('start', function (event, d) {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        d3.select(this).style('cursor', 'grabbing');
      })
      .on('drag', function (event, d) {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', function (event, d) {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        d3.select(this).style('cursor', 'grab');
      });

    ne.call(drag);
    ne.style('cursor', 'grab');

    ne.filter((d: any) => d.status === 'draft' && d.depth < 2).each(function (d: any) {
      const r = NODE_R[d.depth] || 5;
      const pulse = d3
        .select(this)
        .insert('circle', ':first-child')
        .attr('fill', 'none')
        .attr('stroke', NODE_COLOR.draft)
        .attr('stroke-width', 1);
      const animR = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animR.setAttribute('attributeName', 'r');
      animR.setAttribute('from', String(r + 2));
      animR.setAttribute('to', String(r + 14));
      animR.setAttribute('dur', '2.5s');
      animR.setAttribute('repeatCount', 'indefinite');
      pulse.node()!.appendChild(animR);
      const animO = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animO.setAttribute('attributeName', 'stroke-opacity');
      animO.setAttribute('from', '0.35');
      animO.setAttribute('to', '0');
      animO.setAttribute('dur', '2.5s');
      animO.setAttribute('repeatCount', 'indefinite');
      pulse.node()!.appendChild(animO);
    });

    ne.append('circle')
      .attr('class', 'mc')
      .attr('r', 0)
      .attr('fill', (d: any) => NODE_COLOR[d.status])
      .attr('stroke', (d: any) => (d.depth === 0 ? NODE_COLOR[d.status] : 'transparent'))
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.2)
      .attr('filter', (d: any) => (d.depth === 0 ? 'url(#glow)' : null))
      .transition()
      .duration(450)
      .ease(d3.easeBackOut)
      .attr('r', (d: any) => NODE_R[d.depth] || 5);

    ne.filter((d: any) => d.depth < 2)
      .append('text')
      .text((d: any) => d.label)
      .attr('dx', (d: any) => (NODE_R[d.depth] || 5) + 6)
      .attr('dy', 3.5)
      .attr('font-size', (d: any) => (d.depth === 0 ? '13px' : '10px'))
      .attr('font-weight', (d: any) => (d.depth === 0 ? '600' : '400'))
      .attr('fill', '#475569')
      .attr('pointer-events', 'none')
      .attr('opacity', 0)
      .transition()
      .delay(200)
      .duration(350)
      .attr('opacity', 1);

    const allNodes = ne.merge(node);

    sim.on('tick', () => {
      allLinks
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      allNodes.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      simNodes.forEach((n) => posRef.current.set(n.id, { x: n.x, y: n.y }));
    });
  }, [visibleCount]);

  return (
    <div ref={containerRef} className={className} style={{ pointerEvents: 'auto' }}>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
