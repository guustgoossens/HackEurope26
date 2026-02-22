import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface KnowledgeGraphProps {
  clientId: string;
  onSelectNode?: (nodeId: string | null, readme?: string, name?: string, type?: string) => void;
}

// Domain palette — one per root domain, indexed by position
const DOMAIN_PALETTE = [
  { fill: '#1e40af', light: '#93c5fd', label: '#1e3a8a' }, // blue
  { fill: '#b45309', light: '#fcd34d', label: '#78350f' }, // amber
  { fill: '#065f46', light: '#6ee7b7', label: '#064e3b' }, // emerald
  { fill: '#5b21b6', light: '#c4b5fd', label: '#4c1d95' }, // violet
  { fill: '#991b1b', light: '#fca5a5', label: '#7f1d1d' }, // red
];

// Organic blob paths — normalized to 100×100, centered at (50,50)
const BLOBS = [
  'M50 4C72 3 96 14 98 38C100 62 84 96 54 98C24 100 4 78 2 52C0 26 28 5 50 4Z',
  'M48 2C76 0 98 20 99 46C100 72 80 98 52 99C24 100 2 76 3 48C4 20 20 4 48 2Z',
  'M52 3C74 2 97 18 98 44C99 70 78 97 50 98C22 99 3 74 2 46C1 18 30 4 52 3Z',
];

// Node visual radii by type
const NODE_R: Record<string, number> = {
  domain: 22,
  skill: 12,
  entry_group: 7,
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
  useEffect(() => { cbRef.current = onSelectNode; });

  // ── Init SVG, defs, layers, zoom — runs once after mount ──
  // IMPORTANT: SVG is always rendered (not conditional), so svgRef/containerRef
  // always point to the same elements. This avoids the race where treeNodes
  // arrives before the full-canvas SVG is rendered.
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const svg = d3.select(svgRef.current);
    const { width: w, height: h } = containerRef.current.getBoundingClientRect();
    const W = w || 800, H = h || 600;
    svg.attr('viewBox', `0 0 ${W} ${H}`);

    const defs = svg.append('defs');

    // Soft radial gradient background
    const grad = defs.append('radialGradient')
      .attr('id', 'kg-bg').attr('cx', '50%').attr('cy', '42%').attr('r', '62%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', 'hsl(215, 65%, 97%)');
    grad.append('stop').attr('offset', '100%').attr('stop-color', 'hsl(220, 25%, 98%)');
    svg.insert('rect', ':first-child').attr('width', W).attr('height', H).attr('fill', 'url(#kg-bg)');

    // Glow filter for domain nodes
    const glow = defs.append('filter')
      .attr('id', 'kg-glow').attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%');
    glow.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'blur');
    const merge = glow.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Selection pulse filter
    const selGlow = defs.append('filter')
      .attr('id', 'kg-sel').attr('x', '-80%').attr('y', '-80%').attr('width', '260%').attr('height', '260%');
    selGlow.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'blur');
    const selMerge = selGlow.append('feMerge');
    selMerge.append('feMergeNode').attr('in', 'blur');
    selMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g');
    g.append('g').attr('class', 'links').style('pointer-events', 'none');
    g.append('g').attr('class', 'nodes');
    g.append('g').attr('class', 'labels').style('pointer-events', 'none');
    gRef.current = g.node();

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 5])
      .on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    svg.call(zoom.transform, d3.zoomIdentity.translate(W / 2, H / 2).scale(0.82));

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
      gRef.current = null;
    };
  }, []);

  // ── Update graph when data changes (reactive to Convex) ──
  useEffect(() => {
    if (!initDone.current || !gRef.current || !treeNodes || treeNodes.length === 0) return;
    const g = d3.select(gRef.current);

    // Build palette map indexed by root domain
    const domainNodes = treeNodes.filter((n) => !n.parentId);
    const paletteMap: Record<string, typeof DOMAIN_PALETTE[0]> = {};
    domainNodes.forEach((n, i) => { paletteMap[n._id] = DOMAIN_PALETTE[i % DOMAIN_PALETTE.length]; });

    function getRootId(id: string): string {
      const node = treeNodes.find((n) => n._id === id);
      if (!node || !node.parentId) return id;
      return getRootId(node.parentId);
    }

    const simNodes: any[] = treeNodes.map((n, i) => {
      const rootId = getRootId(n._id);
      const palette = paletteMap[rootId] || DOMAIN_PALETTE[0];
      const domainIdx = domainNodes.findIndex((d) => d._id === rootId);
      const angle = (domainIdx / Math.max(domainNodes.length, 1)) * Math.PI * 2;
      // Clean data (few domains, no entry_group mess) → tighter layout
      const isCompact = treeNodes.length <= 15;
      const spread = isCompact ? 150 : 215;
      const jitter = isCompact ? 18 : 60;
      const s = posRef.current.get(n._id);
      return {
        id: n._id, name: n.name, type: n.type,
        parentId: n.parentId, readme: n.readme,
        palette, domainAngle: angle, blobIndex: i % BLOBS.length,
        x: s?.x ?? Math.cos(angle) * spread + (Math.random() - 0.5) * jitter,
        y: s?.y ?? Math.sin(angle) * spread + (Math.random() - 0.5) * jitter,
      };
    });

    const nodeIds = new Set(simNodes.map((n) => n.id));
    const simEdges = simNodes
      .filter((n) => n.parentId && nodeIds.has(n.parentId))
      .map((n) => ({ source: n.parentId, target: n.id, palette: n.palette }));

    simRef.current?.stop();

    const isCompact = treeNodes.length <= 15;
    const sim = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(simEdges).id((d: any) => d.id).distance(65).strength(isCompact ? 0.5 : 0.22))
      .force('charge', d3.forceManyBody().strength(isCompact ? -165 : -265))
      .force('collide', d3.forceCollide().radius((d: any) => (NODE_R[d.type] || 7) + 10))
      .force('x', d3.forceX((d: any) => Math.cos(d.domainAngle) * (isCompact ? 160 : 215)).strength(isCompact ? 0.1 : 0.04))
      .force('y', d3.forceY((d: any) => Math.sin(d.domainAngle) * (isCompact ? 160 : 215)).strength(isCompact ? 0.1 : 0.04))
      .alpha(0.55)
      .alphaDecay(0.018);
    simRef.current = sim;

    // ─── Links — bezier curved paths ───────────────────────────────────────
    const link = g.select('.links')
      .selectAll<SVGPathElement, any>('path')
      .data(simEdges, (d: any) => `${d.source.id ?? d.source}-${d.target.id ?? d.target}`);
    link.exit().transition().duration(300).attr('opacity', 0).remove();
    const linkEnter = link.enter().append('path')
      .attr('fill', 'none')
      .attr('stroke-linecap', 'round')
      .attr('stroke', (d: any) => d.palette.light)
      .attr('stroke-width', 1.5)
      .attr('opacity', 0);
    linkEnter.transition().duration(600).attr('opacity', isCompact ? 0.65 : 0.38);
    const allLinks = linkEnter.merge(link);

    // ─── Nodes — organic blob shapes ───────────────────────────────────────
    const node = g.select('.nodes')
      .selectAll<SVGGElement, any>('.node')
      .data(simNodes, (d: any) => d.id);
    node.exit()
      .style('pointer-events', 'none')
      .transition().duration(450).style('opacity', 0).remove();
    const nodeEnter = node.enter().append('g').attr('class', 'node').style('cursor', 'pointer');

    nodeEnter.each(function(d: any) {
      const el = d3.select(this);
      const r = NODE_R[d.type] || 7;
      const { fill, light } = d.palette;

      // Selection ring — dashed circle that appears on click
      el.append('circle').attr('class', 'sel-ring')
        .attr('r', r + 9)
        .attr('fill', 'none')
        .attr('stroke', light)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4 3')
        .attr('opacity', 0);

      if (d.type === 'domain') {
        el.append('path')
          .attr('d', BLOBS[d.blobIndex])
          .attr('transform', `scale(${r / 50}) translate(-50,-50)`)
          .attr('fill', fill)
          .attr('filter', 'url(#kg-glow)')
          .attr('opacity', 0)
          .transition().duration(600).attr('opacity', 1);
        el.append('circle').attr('r', r * 0.62).attr('fill', 'white');
        el.append('circle').attr('r', r * 0.48).attr('fill', fill);
        el.append('circle').attr('r', 3.5).attr('fill', 'white');
      } else if (d.type === 'skill') {
        el.append('path')
          .attr('d', BLOBS[d.blobIndex])
          .attr('transform', 'scale(0) translate(-50,-50)')
          .attr('fill', fill)
          .transition().duration(450).ease(d3.easeBackOut)
          .attr('transform', `scale(${r / 50}) translate(-50,-50)`);
      } else {
        el.append('path')
          .attr('d', BLOBS[d.blobIndex])
          .attr('transform', 'scale(0) translate(-50,-50)')
          .attr('fill', fill)
          .attr('opacity', 0.38)
          .transition().duration(350).ease(d3.easeCubicOut)
          .attr('transform', `scale(${r / 50}) translate(-50,-50)`);
      }
    });

    // ─── Labels — separate top layer, radially positioned ──────────────────
    const labelData = simNodes.filter((d: any) => d.type === 'domain' || d.type === 'skill');
    const labelsGroup = g.select('.labels');
    const labelSel = labelsGroup
      .selectAll<SVGTextElement, any>('text')
      .data(labelData, (d: any) => d.id);
    labelSel.exit().transition().duration(300).attr('opacity', 0).remove();
    const labelEnter = labelSel.enter().append('text')
      .text((d: any) => d.name.length > 22 ? d.name.slice(0, 20) + '…' : d.name)
      .attr('text-anchor', 'middle')
      .attr('font-size', (d: any) => d.type === 'domain' ? '11px' : '9px')
      .attr('font-weight', (d: any) => d.type === 'domain' ? '700' : '500')
      .attr('fill', (d: any) => d.palette.label)
      .attr('stroke', 'white')
      .attr('stroke-width', 3)
      .attr('paint-order', 'stroke')
      .attr('opacity', 0);
    labelEnter.transition().delay(250).duration(400).attr('opacity', 1);
    const allLabels = labelEnter.merge(labelSel);

    // ─── Drag with resistance ───────────────────────────────────────────────
    const DRAG_SMOOTHING = 0.32;
    const drag = d3.drag<SVGGElement, any>()
      .on('start', function(e, d) {
        if (!e.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
        d3.select(this).style('cursor', 'grabbing');
      })
      .on('drag', (_e, d) => {
        d.fx = (d.fx ?? d.x) + (_e.x - (d.fx ?? d.x)) * DRAG_SMOOTHING;
        d.fy = (d.fy ?? d.y) + (_e.y - (d.fy ?? d.y)) * DRAG_SMOOTHING;
      })
      .on('end', function(e, d) {
        if (!e.active) sim.alphaTarget(0);
        d.x = d.fx ?? d.x; d.y = d.fy ?? d.y;
        d.fx = null; d.fy = null;
        d3.select(this).style('cursor', 'grab');
      });

    const allNodes = nodeEnter.merge(node);
    allNodes.call(drag);
    allNodes.on('click', (_e: any, d: any) => {
      _e.stopPropagation();
      setSelectedId(d.id);
      cbRef.current?.(d.id, d.readme, d.name, d.type);
    });

    // ─── Tick ──────────────────────────────────────────────────────────────
    sim.on('tick', () => {
      allLinks.attr('d', (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        if (dr === 0) return '';
        const nx = dx / dr, ny = dy / dr;
        const sr = (NODE_R[d.source.type] || 7) + 3;
        const tr = (NODE_R[d.target.type] || 7) + 6;
        const sx = d.source.x + nx * sr, sy = d.source.y + ny * sr;
        const ex = d.target.x - nx * tr, ey = d.target.y - ny * tr;
        const mx = (sx + ex) / 2 - ny * 10;
        const my = (sy + ey) / 2 + nx * 10;
        return `M${sx},${sy} Q${mx},${my} ${ex},${ey}`;
      });

      allNodes.attr('transform', (d: any) => `translate(${d.x},${d.y})`);

      const lo = 30;
      allLabels
        .attr('x', (d: any) => {
          const n = Math.sqrt(d.x * d.x + d.y * d.y) || 1;
          return d.x + (d.x / n) * lo;
        })
        .attr('y', (d: any) => {
          const n = Math.sqrt(d.x * d.x + d.y * d.y) || 1;
          return d.y + (d.y / n) * lo + 2;
        });

      simNodes.forEach((n) => posRef.current.set(n.id, { x: n.x, y: n.y }));
    });
  }, [treeNodes]);

  // ── Selection ring highlight ──
  useEffect(() => {
    if (!gRef.current) return;
    d3.select(gRef.current)
      .selectAll<SVGGElement, any>('.node')
      .select('.sel-ring')
      .transition().duration(250)
      .attr('opacity', (d: any) => (d.id === selectedId ? 1 : 0));
  }, [selectedId]);

  const legendNodes = treeNodes?.filter((n) => !n.parentId) ?? [];
  const visibleCount = treeNodes?.length ?? 0;

  return (
    <div className="relative w-full h-full" style={{ minHeight: '400px' }}>

      {/* Loading overlay */}
      {treeNodes === undefined && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10 card-organic"
          style={{ background: 'hsl(215 65% 97%)', border: '1px solid hsl(217 20% 91%)' }}
        >
          <div className="text-sm text-muted-foreground animate-pulse">Chargement du graphe…</div>
        </div>
      )}

      {/* Empty overlay */}
      {treeNodes?.length === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10 card-organic"
          style={{ background: 'hsl(215 65% 97%)', border: '1px solid hsl(217 20% 91%)' }}
        >
          <div className="text-center space-y-1.5">
            <div className="text-sm text-muted-foreground">Construction de la base de connaissances…</div>
            <div className="text-xs" style={{ color: 'hsl(217 20% 68%)' }}>Les nœuds apparaîtront ici</div>
          </div>
        </div>
      )}

      {/* Domain legend — top-left floating card (only with data) */}
      {legendNodes.length > 0 && (
        <div
          className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 card-organic px-3 py-2.5"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.94), hsl(215 50% 97% / 0.94))',
            backdropFilter: 'blur(12px)',
            border: '1px solid hsl(215 25% 90% / 0.6)',
            boxShadow: '0 2px 12px hsl(215 40% 55% / 0.08)',
          }}
        >
          {legendNodes.slice(0, 5).map((n, i) => {
            const p = DOMAIN_PALETTE[i % DOMAIN_PALETTE.length];
            return (
              <div key={n._id} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ background: p.fill, boxShadow: `0 0 5px ${p.light}` }}
                />
                <span style={{ color: p.label, fontWeight: 600 }}>{n.name}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Node count — bottom-right chip */}
      {visibleCount > 0 && (
        <div
          className="absolute bottom-3 right-3 z-10 text-xs px-2.5 py-1 btn-organic-pill font-medium"
          style={{
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(8px)',
            border: '1px solid hsl(217 20% 88%)',
            color: 'hsl(217 30% 55%)',
          }}
        >
          {visibleCount} nœuds
        </div>
      )}

      {/* Zoom hint */}
      {visibleCount > 0 && (
        <div
          className="absolute bottom-3 left-3 z-10 text-xs opacity-40 select-none"
          style={{ color: 'hsl(217 20% 55%)' }}
        >
          scroll to zoom · drag nodes
        </div>
      )}

      {/* Graph canvas — always rendered so refs are stable */}
      <div
        ref={containerRef}
        className="w-full h-full card-organic overflow-hidden"
        style={{ border: '1px solid hsl(215 20% 90%)' }}
      >
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </div>
  );
}
