'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon } from 'lucide-react';
import { formatYearMonth } from '../../lib/formatters';

const PALETTE = [
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#ec4899',
  '#06b6d4',
  '#6366f1',
];

const GRADIENT_STOPS = [
  ['#3b82f6', '#1d4ed8'],
  ['#10b981', '#047857'],
  ['#8b5cf6', '#5b21b6'],
  ['#f59e0b', '#b45309'],
  ['#ec4899', '#9d174d'],
  ['#06b6d4', '#0e7490'],
  ['#6366f1', '#3730a3'],
];

const AREA_FILL_STOPS = [
  ['rgba(59,130,246,0.35)', 'rgba(59,130,246,0)'],
  ['rgba(16,185,129,0.35)', 'rgba(16,185,129,0)'],
  ['rgba(139,92,246,0.35)', 'rgba(139,92,246,0)'],
  ['rgba(245,158,11,0.35)', 'rgba(245,158,11,0)'],
  ['rgba(236,72,153,0.35)', 'rgba(236,72,153,0)'],
  ['rgba(6,182,212,0.35)', 'rgba(6,182,212,0)'],
  ['rgba(99,102,241,0.35)', 'rgba(99,102,241,0)'],
];

const DONUT_MAX_CATEGORIES = 3;

function isYearMonthLabel(val) {
  return typeof val === 'string' && /^\d{4}-\d{2}$/.test(val.trim());
}

function formatXLabel(val) {
  if (isYearMonthLabel(val)) return formatYearMonth(val);
  if (typeof val === 'string' && val.length > 12) return val.slice(0, 11) + '…';
  return val;
}

function formatYAxis(val) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
  return val;
}

function formatTooltipValue(value) {
  if (typeof value !== 'number') return value;
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

/**
 * Tooltip customizado para Bar e Area charts.
 * Recebe colorMap para exibir a cor correta da paleta — entry.fill retorna
 * "url(#barGrad_N)" (referência SVG) que não é válida como cor CSS.
 * @param {Record<string,string>} colorMap - { [dataKey]: hexColor }
 */
function CustomTooltip({ active, payload, label, colorMap = {} }) {
  if (!active || !payload || payload.length === 0) return null;

  const displayLabel = isYearMonthLabel(label) ? formatYearMonth(label) : label;

  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '0.75rem',
        padding: '10px 14px',
        minWidth: 170,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <p
        style={{
          color: '#94a3b8',
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 8,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          paddingBottom: 6,
        }}
      >
        {displayLabel}
      </p>
      {payload.map((entry, idx) => {
        const dotColor = colorMap[entry.dataKey] ?? PALETTE[idx % PALETTE.length];
        return (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              marginTop: idx > 0 ? 6 : 0,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#cbd5e1', fontSize: 11 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  backgroundColor: dotColor,
                  flexShrink: 0,
                  boxShadow: `0 0 6px ${dotColor}80`,
                }}
              />
              {entry.name}
            </span>
            <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
              {formatTooltipValue(entry.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function DynamicChart({ columns, rows }) {
  const [chartType, setChartType] = useState('bar');

  if (!columns || !rows || rows.length === 0 || columns.length < 2) {
    return null;
  }

  const labelCol = columns[0];
  const numericCols = columns.slice(1);
  const categoryCount = rows.length;
  const seriesCount = numericCols.length;

  const showDonut = categoryCount <= DONUT_MAX_CATEGORIES && seriesCount === 1;

  const effectiveChartType = chartType === 'pie' && !showDonut ? 'bar' : chartType;

  const chartData = rows.map((row) => {
    const item = { [labelCol]: String(row[0]) };
    numericCols.forEach((colName, idx) => {
      const val = row[idx + 1];
      item[colName] = typeof val === 'number' ? val : parseFloat(val) || 0;
    });
    return item;
  });

  const maxLabelLength = Math.max(...chartData.map((d) => String(d[labelCol]).length));
  const xBottomMargin = maxLabelLength > 8 ? 45 : 28;

  const colorFor = (idx) => PALETTE[idx % PALETTE.length];

  const colorMap = Object.fromEntries(numericCols.map((col, idx) => [col, colorFor(idx)]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Visualização Gráfica Dinâmica
        </span>
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setChartType('bar')}
            className={`p-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${effectiveChartType === 'bar' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            title="Gráfico de Barras"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Barras</span>
          </button>

          <button
            onClick={() => setChartType('line')}
            className={`p-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${effectiveChartType === 'line' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            title="Gráfico de Linha / Área"
          >
            <LineIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Linha</span>
          </button>

          {showDonut && (
            <button
              onClick={() => setChartType('pie')}
              className={`p-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${effectiveChartType === 'pie' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              title="Gráfico de Donut"
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Donut</span>
            </button>
          )}
        </div>
      </div>

      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {effectiveChartType === 'bar' ? (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: xBottomMargin }}>
              <defs>
                {numericCols.map((col, idx) => {
                  const [start, end] = GRADIENT_STOPS[idx % GRADIENT_STOPS.length];
                  return (
                    <linearGradient key={col} id={`barGrad_${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={start} stopOpacity={1} />
                      <stop offset="100%" stopColor={end} stopOpacity={0.85} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
              <XAxis
                dataKey={labelCol}
                stroke="#9ca3af"
                fontSize={11}
                tickLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                tickFormatter={formatXLabel}
              />
              <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} tickFormatter={formatYAxis} width={48} />
              <Tooltip content={(props) => <CustomTooltip {...props} colorMap={colorMap} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              {numericCols.map((col, idx) => (
                <Bar key={col} dataKey={col} fill={`url(#barGrad_${idx})`} radius={[6, 6, 0, 0]} />
              ))}
            </BarChart>
          ) : effectiveChartType === 'line' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: xBottomMargin }}>
              <defs>
                {numericCols.map((col, idx) => {
                  const [start, end] = AREA_FILL_STOPS[idx % AREA_FILL_STOPS.length];
                  return (
                    <linearGradient key={col} id={`areaGrad_${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={start} />
                      <stop offset="100%" stopColor={end} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
              <XAxis
                dataKey={labelCol}
                stroke="#9ca3af"
                fontSize={11}
                tickLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                tickFormatter={formatXLabel}
              />
              <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} tickFormatter={formatYAxis} width={48} />
              <Tooltip content={(props) => <CustomTooltip {...props} colorMap={colorMap} />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
              {numericCols.map((col, idx) => {
                const color = colorFor(idx);
                return (
                  <Area
                    key={col}
                    type="monotone"
                    dataKey={col}
                    stroke={color}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill={`url(#areaGrad_${idx})`}
                    dot={{ r: 3, fill: color, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: color, stroke: '#0f172a', strokeWidth: 2 }}
                  />
                );
              })}
            </AreaChart>
          ) : (
            <PieChart>
              <Pie
                data={chartData}
                dataKey={numericCols[0] || 'valor'}
                nameKey={labelCol}
                cx="50%"
                cy="50%"
                outerRadius={95}
                innerRadius={48}
                paddingAngle={4}
                label={({ name, percent }) => {
                  const shortName = isYearMonthLabel(name) ? formatYearMonth(name) : name;
                  return `${shortName} (${(percent * 100).toFixed(0)}%)`;
                }}
                labelLine={{ stroke: 'rgba(255,255,255,0.25)', strokeWidth: 1 }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} stroke="#0f172a" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
