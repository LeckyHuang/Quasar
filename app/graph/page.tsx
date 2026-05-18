'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { GraphData, GraphEdge } from '@/app/api/graph/route';
import { Bi, Badge, Spinner } from '@/components/ui';

const REASON_LABEL: Record<GraphEdge['reason'], string> = {
  'source-code': 'Source repo',
  'mentioned-in-claude': 'In CLAUDE.md',
  'mentioned-in-readme': 'In README',
  'tech-match': 'Tech match',
};

const REASON_TONE: Record<GraphEdge['reason'], string> = {
  'source-code': 'ok',
  'mentioned-in-claude': 'accent',
  'mentioned-in-readme': 'info',
  'tech-match': 'soft',
};

const STRENGTH_OPACITY: Record<number, number> = { 3: 0.95, 2: 0.7, 1: 0.35 };

export default function GraphPage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  useEffect(() => {
    fetch('/api/graph').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDims({ w: rect.width, h: Math.max(rect.height, 500) });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const activeSkill = hoveredSkill;
  const activeProject = hoveredProject;

  // Derive highlighted edges
  const highlightedEdges = data?.edges.filter(e =>
    (activeSkill && e.skillId === activeSkill) ||
    (activeProject && e.projectId === activeProject)
  ) ?? [];

  const highlightedSkillIds = new Set(highlightedEdges.map(e => e.skillId));
  const highlightedProjectIds = new Set(highlightedEdges.map(e => e.projectId));

  const isHighlightMode = activeSkill || activeProject;

  if (loading) return (
    <div className="page">
      <div className="page__top"><h1 className="page__title"><Bi en="Graph" cn="关联图" /></h1></div>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spinner size={24} /></div>
    </div>
  );

  if (!data) return null;

  const PAD_X = 140;
  const PAD_Y = 40;
  const skillCount = data.skills.length;
  const projectCount = data.projects.length;
  const maxNodes = Math.max(skillCount, projectCount, 1);
  const rowH = Math.min(38, (dims.h - PAD_Y * 2) / maxNodes);

  const skillY = (i: number) => PAD_Y + i * rowH + rowH / 2;
  const projectY = (i: number) => PAD_Y + i * rowH + rowH / 2;
  const skillX = PAD_X;
  const projX = dims.w - PAD_X;

  const edgeColor = (e: GraphEdge) => {
    if (e.reason === 'source-code') return 'var(--ok)';
    if (e.reason === 'mentioned-in-claude') return 'var(--ac-1)';
    if (e.reason === 'mentioned-in-readme') return 'var(--info)';
    return 'var(--tx-4)';
  };

  return (
    <div className="page">
      <div className="page__top">
        <h1 className="page__title"><Bi en="Graph" cn="关联图" />
          <span className="tx-3" style={{ fontWeight: 400, fontSize: 13 }}>
            · {data.edges.length} connections
          </span>
        </h1>
        <div className="page__top-actions">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12, color: 'var(--tx-3)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-block', width: 24, height: 2, background: 'var(--ok)', borderRadius: 1 }} /> Source repo
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-block', width: 24, height: 2, background: 'var(--ac-1)', borderRadius: 1 }} /> CLAUDE.md
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-block', width: 24, height: 2, background: 'var(--info)', borderRadius: 1 }} /> README
            </span>
          </div>
        </div>
      </div>

      <div className="page__scroll">
        <div ref={containerRef} style={{ position: 'relative', flex: 1, minHeight: 500 }}>
          {/* Column headers */}
          <div style={{ position: 'absolute', top: 8, left: PAD_X - 60, fontSize: 11, color: 'var(--tx-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Skills · {skillCount}
          </div>
          <div style={{ position: 'absolute', top: 8, right: PAD_X - 60, fontSize: 11, color: 'var(--tx-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Projects · {projectCount}
          </div>

          <svg ref={svgRef} width="100%" height={dims.h} style={{ display: 'block' }}>
            {/* Edges */}
            {data.edges.map((e, i) => {
              const si = data.skills.findIndex(s => s.id === e.skillId);
              const pi = data.projects.findIndex(p => p.id === e.projectId);
              if (si < 0 || pi < 0) return null;
              const x1 = skillX + 60;
              const y1 = skillY(si);
              const x2 = projX - 60;
              const y2 = projectY(pi);
              const mx = (x1 + x2) / 2;

              const isHL = highlightedEdges.some(he => he.skillId === e.skillId && he.projectId === e.projectId);
              const opacity = isHighlightMode
                ? (isHL ? STRENGTH_OPACITY[e.strength] : 0.04)
                : STRENGTH_OPACITY[e.strength] * 0.6;

              return (
                <path
                  key={i}
                  d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                  fill="none"
                  stroke={edgeColor(e)}
                  strokeWidth={e.strength === 3 ? 2 : 1}
                  opacity={opacity}
                  style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                  onClick={() => setSelectedEdge(selectedEdge?.skillId === e.skillId && selectedEdge?.projectId === e.projectId ? null : e)}
                />
              );
            })}
          </svg>

          {/* Skill nodes (left) */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: PAD_X + 60, pointerEvents: 'none' }}>
            {data.skills.map((s, i) => {
              const y = skillY(i);
              const isHL = !isHighlightMode || highlightedSkillIds.has(s.id);
              return (
                <div
                  key={s.id}
                  style={{
                    position: 'absolute', top: y - rowH / 2, left: 8, right: 0, height: rowH,
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8,
                    opacity: isHL ? 1 : 0.2, transition: 'opacity 0.15s', pointerEvents: 'all', cursor: 'default',
                  }}
                  onMouseEnter={() => setHoveredSkill(s.id)}
                  onMouseLeave={() => setHoveredSkill(null)}
                >
                  <Link href={`/skills/${s.id}`} style={{ textDecoration: 'none' }}>
                    <span style={{
                      fontSize: 12, color: hoveredSkill === s.id ? 'var(--tx-1)' : 'var(--tx-2)',
                      fontFamily: 'var(--f-mono)', whiteSpace: 'nowrap', transition: 'color 0.1s',
                    }}>{s.name}</span>
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Project nodes (right) */}
          <div style={{ position: 'absolute', top: 0, right: 0, width: PAD_X + 60 }}>
            {data.projects.map((p, i) => {
              const y = projectY(i);
              const isHL = !isHighlightMode || highlightedProjectIds.has(p.id);
              return (
                <div
                  key={p.id}
                  style={{
                    position: 'absolute', top: y - rowH / 2, left: 0, right: 8, height: rowH,
                    display: 'flex', alignItems: 'center', paddingLeft: 8,
                    opacity: isHL ? 1 : 0.2, transition: 'opacity 0.15s', cursor: 'default',
                  }}
                  onMouseEnter={() => setHoveredProject(p.id)}
                  onMouseLeave={() => setHoveredProject(null)}
                >
                  <Link href={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                    <span style={{
                      fontSize: 12, color: hoveredProject === p.id ? 'var(--tx-1)' : 'var(--tx-2)',
                      fontFamily: 'var(--f-mono)', whiteSpace: 'nowrap', transition: 'color 0.1s',
                    }}>{p.name}</span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected edge detail */}
        {selectedEdge && (() => {
          const skill = data.skills.find(s => s.id === selectedEdge.skillId);
          const project = data.projects.find(p => p.id === selectedEdge.projectId);
          return (
            <div style={{ margin: '0 24px 24px', padding: '14px 18px', background: 'var(--bg-2)', border: '1px solid var(--hl-1)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 16, fontSize: 13 }}>
              <Link href={`/skills/${selectedEdge.skillId}`} style={{ textDecoration: 'none', color: 'var(--ac-1)', fontFamily: 'var(--f-mono)' }}>{skill?.name}</Link>
              <span style={{ color: 'var(--tx-3)' }}>→</span>
              <Link href={`/projects/${selectedEdge.projectId}`} style={{ textDecoration: 'none', color: 'var(--ok)', fontFamily: 'var(--f-mono)' }}>{project?.name}</Link>
              <Badge tone={REASON_TONE[selectedEdge.reason] as 'ok' | 'accent' | 'info' | 'soft'}>{REASON_LABEL[selectedEdge.reason]}</Badge>
              <button style={{ marginLeft: 'auto', background: 'none', border: 0, color: 'var(--tx-3)', cursor: 'pointer', fontSize: 16 }} onClick={() => setSelectedEdge(null)}>×</button>
            </div>
          );
        })()}

        {/* Empty state */}
        {data.edges.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--tx-3)' }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>No connections found</div>
            <div style={{ fontSize: 12 }}>Connections are detected when a skill is mentioned in a project&apos;s README or CLAUDE.md</div>
          </div>
        )}
      </div>
    </div>
  );
}
