'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1'];

export default function DynamicChart({ columns, rows }) {
  const [chartType, setChartType] = useState('bar');

  if (!columns || !rows || rows.length === 0 || columns.length < 2) {
    return null;
  }

  // Identifica a coluna de rótulo (geralmente a primeira coluna string/texto)
  const labelCol = columns[0];
  // Identifica colunas numéricas (a partir da segunda coluna)
  const numericCols = columns.slice(1);

  // Transforma as linhas em objetos JSON legíveis pelo Recharts
  const chartData = rows.map((row) => {
    const item = { [labelCol]: String(row[0]) };
    numericCols.forEach((colName, idx) => {
      const val = row[idx + 1];
      item[colName] = typeof val === 'number' ? val : parseFloat(val) || 0;
    });
    return item;
  });

  // Formatação amigável para números no Tooltip e no Eixo Y
  const formatValue = (value) => {
    if (typeof value !== 'number') return value;
    return value.toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-4">
      {/* Chart Toolbar / Controls */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Visualização Gráfica Dinâmica
        </span>
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setChartType('bar')}
            className={`p-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${chartType === 'bar' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            title="Gráfico de Barras"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Barras</span>
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`p-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${chartType === 'line' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            title="Gráfico de Linha / Área"
          >
            <LineIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Linha</span>
          </button>
          <button
            onClick={() => setChartType('pie')}
            className={`p-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${chartType === 'pie' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            title="Gráfico de Pizza"
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pizza</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
              <XAxis dataKey={labelCol} stroke="#9ca3af" fontSize={11} tickLine={false} interval={0} angle={-15} textAnchor="end" />
              <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#f3f4f6' }}
                formatter={(val) => [formatValue(val), '']}
              />
              {numericCols.map((col) => (
                <Bar key={col} dataKey={col} fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
              ))}
            </BarChart>
          ) : chartType === 'line' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
              <XAxis dataKey={labelCol} stroke="#9ca3af" fontSize={11} tickLine={false} interval={0} angle={-15} textAnchor="end" />
              <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#f3f4f6' }}
                formatter={(val) => [formatValue(val), '']}
              />
              {numericCols.map((col) => (
                <Area key={col} type="monotone" dataKey={col} stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#areaGradient)" />
              ))}
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
                innerRadius={45}
                paddingAngle={4}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#0f172a" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#f3f4f6' }}
                formatter={(val) => [formatValue(val), '']}
              />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
