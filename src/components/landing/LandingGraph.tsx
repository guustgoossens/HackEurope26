import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { SORTED_NODES, landingEdges } from '@/data/landingGraphData';

interface Props {
  visibleCount: number;
  className?: string;
}

const NAVY = '#0b172a';
const NODE_R: Record<number, number> = { 0: 24, 1: 14, 2: 8 };

const GROUP_POS: Record<string, { x: number; y: number }> = {
  finance: { x: -140, y: -95 },
  compliance: { x: 140, y: -95 },
  clients: { x: 155, y: 78 },
  operations: { x: -140, y: 92 },
};

const EDGE_STYLE: Record<string, { stroke: string; width: number; dash?: string; opacity: number }> = {
  parent_of: { stroke: '#3B82F6', width: 1.5, opacity: 0.8 }, // Blue from graphic chart
  depends_on: { stroke: '#D97706', width: 2, dash: '6 4', opacity: 0.6 },
  references: { stroke: '#60A5FA', width: 1.5, opacity: 0.5 }, // Lighter blue
  temporal: { stroke: '#94A3B8', width: 1, dash: '3 3', opacity: 0.3 },
};

// Organic blob paths (normalized to ~100x100, centered)
const BLOBS = [
  'M50 4C72 3 96 14 98 38C100 62 84 96 54 98C24 100 4 78 2 52C0 26 28 5 50 4Z',
  'M48 2C76 0 98 20 99 46C100 72 80 98 52 99C24 100 2 76 3 48C4 20 20 4 48 2Z',
  'M52 3C74 2 97 18 98 44C99 70 78 97 50 98C22 99 3 74 2 46C1 18 30 4 52 3Z',
];

export default function LandingGraph({ visibleCount, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const simRef = useRef<d3.Simulation<any, any> | null>(null);
  const posRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const boundsRef = useRef<{ xMin: number; xMax: number; yMin: number; yMax: number } | null>(null);
  const ready = useRef(false);

  useEffect(() => {
    const svg = d3.select(svgRef.current!);
    const { width: w, height: h } = containerRef.current!.getBoundingClientRect();
    svg.attr('viewBox', `0 0 ${w || 900} ${h || 520}`);

    const defs = svg.append('defs');
    
    // Glow filter for central node
    const glow = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    glow.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'b');
    const m = glow.append('feMerge');
    m.append('feMergeNode').attr('in', 'b');
    m.append('feMergeNode').attr('in', 'SourceGraphic');

    svg.append('style').text(`
      .edge-flow { animation: edgeFlow 2s linear infinite; }
      @keyframes edgeFlow { to { stroke-dashoffset: -20; } }
    `);

    const g = svg.append('g');
    g.append('g').attr('class', 'links').style('pointer-events', 'none'); // So links never steal drag
    g.append('g').attr('class', 'nodes').style('pointer-events', 'auto');
    g.append('g').attr('class', 'labels').style('pointer-events', 'none'); // Labels on top so never hidden by nodes
    gRef.current = g.node();

    // Shift graph up so bottom clusters (e.g. Operations) stay above the overlay button
    const cx = (w || 900) / 2;
    const cy = (h || 520) / 2;
    const shiftUp = 56;
    g.attr('transform', `translate(${cx}, ${cy - shiftUp}) scale(0.85)`);

    ready.current = true;
    return () => {
      simRef.current?.stop();
      svg.selectAll('*').remove();
      ready.current = false;
    };
  }, []);

  useEffect(() => {
    if (!ready.current || !gRef.current || !containerRef.current) return;
    const g = d3.select(gRef.current);
    const rect = containerRef.current.getBoundingClientRect();
    const w = rect.width || 900;
    const h = rect.height || 520;
    const scale = 0.85;
    const shiftUp = 56;
    const cx = w / 2;
    const cy = h / 2;
    const padding = 40; // Keep nodes and labels inside frame
    const xMin = -cx / scale + padding;
    const xMax = (w - cx) / scale - padding;
    const yMin = -(cy - shiftUp) / scale + padding;
    const yMax = (h - (cy - shiftUp)) / scale - padding;
    boundsRef.current = { xMin, xMax, yMin, yMax };

    if (visibleCount === 0) {
      simRef.current?.stop();
      g.select('.links').selectAll('path').remove();
      g.select('.nodes').selectAll('.node').remove();
      g.select('.labels').selectAll('text').remove();
      posRef.current.clear();
      boundsRef.current = null;
      return;
    }

    const vis = SORTED_NODES.slice(0, visibleCount);
    const visIds = new Set(vis.map((n) => n.id));
    const visEdges = landingEdges.filter((e) => visIds.has(e.source) && visIds.has(e.target));

    const simNodes: any[] = vis.map((n, i) => {
      const s = posRef.current.get(n.id);
      const gp = GROUP_POS[n.group] || { x: 0, y: 0 };
      return { 
        ...n, 
        x: s?.x ?? gp.x + (Math.random() - 0.5) * 50, 
        y: s?.y ?? gp.y + (Math.random() - 0.5) * 50,
        blobIndex: i % BLOBS.length 
      };
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
          .distance((d: any) => (d.type === 'parent_of' ? 55 : 100))
          .strength((d: any) => (d.type === 'parent_of' ? 0.5 : 0.12)),
      )
      .force('charge', d3.forceManyBody().strength((d: any) => (d.depth === 0 ? -320 : d.depth === 1 ? -120 : -50)))
      .force('collide', d3.forceCollide().radius((d: any) => (NODE_R[d.depth] || 8) + 12))
      .force('x', d3.forceX((d: any) => GROUP_POS[d.group]?.x || 0).strength(0.1))
      .force('y', d3.forceY((d: any) => GROUP_POS[d.group]?.y || 0).strength(0.1))
      .alpha(visibleCount <= 4 ? 1 : 0.08)
      .alphaDecay(0); // Never stop: keeps nodes always draggable and simulation responsive
    simRef.current = sim;

    const link = g
      .select('.links')
      .selectAll<SVGPathElement, any>('path')
      .data(simEdges, (d: any) => `${d.source.id ?? d.source}-${d.target.id ?? d.target}-${d.type}`);
    link.exit().remove();
    const linkE = link
      .enter()
      .append('path')
      .attr('fill', 'none')
      .attr('stroke-linecap', 'round')
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
        if (!event.active) sim.alphaTarget(0.08).restart();
        // Keep node where user dropped it (don't snap back), clamped to bounds
        const b = boundsRef.current;
        const x = b ? Math.max(b.xMin, Math.min(b.xMax, event.x)) : event.x;
        const y = b ? Math.max(b.yMin, Math.min(b.yMax, event.y)) : event.y;
        d.x = x;
        d.y = y;
        d.fx = x;
        d.fy = y;
        d3.select(this).style('cursor', 'grab');
      });

    // Render nodes (enter only)
    ne.each(function(d: any) {
      const el = d3.select(this);
      const r = NODE_R[d.depth] || 8;
      
      if (d.depth === 0) {
        // Central node: concentric rings
        // Outer dark blob
        el.append('path')
          .attr('d', BLOBS[d.blobIndex])
          .attr('transform', `scale(${r/50}) translate(-50, -50)`)
          .attr('fill', NAVY);
        
        // Inner white ring
        el.append('circle')
          .attr('r', r * 0.7)
          .attr('fill', 'white');
          
        // Inner dark circle
        el.append('circle')
          .attr('r', r * 0.55)
          .attr('fill', NAVY);
          
        // Center white dot
        el.append('circle')
          .attr('r', 3)
          .attr('fill', 'white');
      } else {
        // Satellite nodes: solid blobs
        el.append('path')
          .attr('d', BLOBS[d.blobIndex])
          .attr('transform', `scale(0) translate(-50, -50)`) // Start scale 0
          .attr('fill', NAVY)
          .transition()
          .duration(450)
          .ease(d3.easeBackOut)
          .attr('transform', `scale(${r/50}) translate(-50, -50)`);
      }
    });

    // Labels: rendered in a separate top layer (g.labels) so they're never hidden by other nodes
    const labelData = simNodes.filter((d: any) => d.depth < 2);
    const labelsGroup = g.select('.labels');
    const labelSel = labelsGroup.selectAll<SVGTextElement, any>('text').data(labelData, (d: any) => d.id);
    labelSel.exit().remove();
    const labelEnter = labelSel
      .enter()
      .append('text')
      .text((d: any) => d.label)
      .attr('text-anchor', 'middle')
      .attr('font-size', (d: any) => (d.depth === 0 ? '13px' : '10px'))
      .attr('font-weight', (d: any) => (d.depth === 0 ? '600' : '500'))
      .attr('fill', NAVY)
      .attr('stroke', 'white')
      .attr('stroke-width', 3)
      .attr('paint-order', 'stroke')
      .attr('opacity', 0);
    labelEnter.transition().delay(200).duration(350).attr('opacity', 1);
    const allLabels = labelEnter.merge(labelSel);

    const allNodes = ne.merge(node);
    // Apply drag to all nodes (new + existing) so they stay moveable
    allNodes.call(drag);
    allNodes.style('cursor', 'grab');

    sim.on('tick', () => {
      // Clamp node positions so they stay inside the visible frame
      simNodes.forEach((n: any) => {
        n.x = Math.max(xMin, Math.min(xMax, n.x));
        n.y = Math.max(yMin, Math.min(yMax, n.y));
      });

      allLinks.attr('d', (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate stop points (short of node radius)
        const sourceR = NODE_R[d.source.depth] || 8;
        const targetR = NODE_R[d.target.depth] || 8;
        const padding = 12; // Increased padding so lines stop short
        
        if (dr === 0) return ''; // Prevent division by zero

        // Normalized direction vector
        const nx = dx / dr;
        const ny = dy / dr;

        // Start and end points adjusted for radius + padding
        const startX = d.source.x + nx * (sourceR + padding * 0.5);
        const startY = d.source.y + ny * (sourceR + padding * 0.5);
        const endX = d.target.x - nx * (targetR + padding);
        const endY = d.target.y - ny * (targetR + padding);

        // Quadratic bezier curve
        // Control point is midpoint offset perpendicularly
        // Less curve for parent_of, more for others
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        
        // Small curvature to simulate "organic" feel, not straight lines
        // Direction of curve depends on node positions to keep it somewhat consistent
        const curveFactor = d.type === 'parent_of' ? 0 : 20; 
        // Simple curve logic: offset midpoint
        // perpendicular vector (-ny, nx)
        const cX = midX - ny * curveFactor;
        const cY = midY + nx * curveFactor;

        return `M${startX},${startY} Q${cX},${cY} ${endX},${endY}`;
      });

      allNodes.attr('transform', (d: any) => `translate(${d.x},${d.y})`);

      // Position labels in top layer: radially outward from center, larger offset so not hidden
      const labelOffset = 32;
      allLabels.attr('x', (d: any) => {
        const norm = Math.sqrt(d.x * d.x + d.y * d.y) || 1;
        return d.x + (d.x / norm) * labelOffset;
      }).attr('y', (d: any) => {
        const norm = Math.sqrt(d.x * d.x + d.y * d.y) || 1;
        return d.y + (d.y / norm) * labelOffset;
      });

      simNodes.forEach((n) => posRef.current.set(n.id, { x: n.x, y: n.y }));
    });
  }, [visibleCount]);

  return (
    <div ref={containerRef} className={className} style={{ pointerEvents: 'auto' }}>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
