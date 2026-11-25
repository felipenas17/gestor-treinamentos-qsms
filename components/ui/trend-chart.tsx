'use client';

import React from 'react';

export interface TrendPoint {
  date: string;   // YYYY-MM-DD
  score: number;  // 0–100
}

interface TrendChartProps {
  data: TrendPoint[];
  /** Height class for the SVG element. Default "h-16". */
  heightClass?: string;
  /** Whether to show the date range + delta header. Default true. */
  showHeader?: boolean;
}

export function TrendChart({ data, heightClass = 'h-16', showHeader = true }: TrendChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-16 text-xs text-slate-400">
        Histórico insuficiente — acumula com o uso diário
      </div>
    );
  }

  const W = 500;
  const H = 80;
  const PAD = 8;

  const scores = data.map((d) => d.score);
  const minS = Math.max(0, Math.min(...scores) - 5);
  const maxS = Math.min(100, Math.max(...scores) + 5);

  const toX = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const toY = (s: number) => H - PAD - ((s - minS) / (maxS - minS || 1)) * (H - PAD * 2);

  const pts = data.map((d, i) => `${toX(i)},${toY(d.score)}`).join(' ');

  // Closed area polygon
  const area = [
    `M ${toX(0)},${H}`,
    ...data.map((d, i) => `L ${toX(i)},${toY(d.score)}`),
    `L ${toX(data.length - 1)},${H}`,
    'Z',
  ].join(' ');

  const last = data[data.length - 1].score;
  const first = data[0].score;
  const delta = last - first;
  const color = last >= 80 ? '#10b981' : last >= 60 ? '#f59e0b' : '#ef4444';

  const fmtDate = (d: string) => d.slice(5); // MM-DD

  return (
    <div>
      {showHeader && (
        <div className="flex items-center justify-between mb-1 text-xs text-slate-500">
          <span>
            {fmtDate(data[0].date)} → {fmtDate(data[data.length - 1].date)}
          </span>
          <span
            className={`font-semibold ${
              delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-slate-400'
            }`}
          >
            {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}pp
          </span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={`w-full ${heightClass}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#trendGrad)" />
        <polyline
          points={pts}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={toX(data.length - 1)}
          cy={toY(last)}
          r="4"
          fill={color}
        />
      </svg>
    </div>
  );
}
