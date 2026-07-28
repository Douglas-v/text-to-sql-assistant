'use client';

import { useState } from 'react';
import {
  Sparkles,
  Code2,
  Table as TableIcon,
  BarChart2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import DynamicChart from './DynamicChart';

export default function QueryResponseView({ responseData, question }) {
  const [copied, setCopied] = useState(false);
  const [showSql, setShowSql] = useState(true);
  const [activeView, setActiveView] = useState('chart'); // 'chart' ou 'table'
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  if (!responseData) return null;

  const { sql, sintese, columns, rows, total_registros } = responseData;

  const copyToClipboard = () => {
    if (!sql) return;
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalPages = Math.ceil((rows?.length || 0) / rowsPerPage);
  const paginatedRows = rows?.slice((page - 1) * rowsPerPage, page * rowsPerPage) || [];

  // Formata valores numéricos para moeda apenas quando apropriado (não para quantidades)
  const formatTableCell = (val, colName) => {
    if (val === null || val === undefined) return <span className="text-slate-600">-</span>;
    if (typeof val === 'number') {
      const colLower = colName.toLowerCase();
      // Regra estrita: se a coluna indicar quantidade/unidades/contagem, formata apenas como número simples
      const isQuantity = (
        colLower.includes('quantidade') ||
        colLower.includes('qtd') ||
        colLower.includes('unidade') ||
        colLower.includes('count') ||
        colLower.includes('itens')
      );

      const isCurrency = !isQuantity && (
        colLower.includes('valor') ||
        colLower.includes('preco') ||
        colLower.includes('price') ||
        colLower.includes('faturamento') ||
        colLower.includes('receita') ||
        colLower === 'total'
      );

      if (isCurrency) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
      }
      return val.toLocaleString('pt-BR');
    }
    return String(val);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* 1. Síntese Textual (Gemini Explanation) */}
      <div className="glass-card rounded-xl p-4 border border-blue-500/20 bg-gradient-to-r from-blue-950/40 via-indigo-950/20 to-slate-900/60 relative overflow-hidden">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs uppercase font-bold tracking-wider text-blue-300">
              Síntese dos Dados (Inteligência Gemini)
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed font-normal">
              {sintese}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Accordion de Código SQL Gerado (Oculta se sql for vazio/falso) */}
      {sql && sql.trim() !== "" && (
        <div className="rounded-xl bg-slate-950/80 border border-slate-800 overflow-hidden">
          <button
            onClick={() => setShowSql(!showSql)}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/60 hover:bg-slate-900 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-purple-400" />
              <span>Consulta SQL Gerada</span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
                SQLite
              </span>
            </div>
            <div className="flex items-center gap-2">
              {showSql ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showSql && (
            <div className="p-4 font-mono text-xs text-emerald-300 bg-slate-950 overflow-x-auto border-t border-slate-800/80">
              <code>{sql}</code>
            </div>
          )}
        </div>
      )}

      {/* 3. Tab Switcher: Gráfico vs Tabela (Oculta se total_registros for 0 ou falso) */}
      {total_registros > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveView('chart')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeView === 'chart'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
                  }`}
              >
                <BarChart2 className="w-4 h-4" /> Gráfico Dinâmico
              </button>
              <button
                onClick={() => setActiveView('table')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeView === 'table'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
                  }`}
              >
                <TableIcon className="w-4 h-4" /> Tabela de Dados ({total_registros})
              </button>
            </div>

            <span className="text-xs text-slate-500 hidden sm:inline">
              Total de registros: <strong className="text-slate-300">{total_registros}</strong>
            </span>
          </div>

          {/* View Content */}
          {activeView === 'chart' ? (
            <DynamicChart columns={columns} rows={rows} />
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                {columns.length > 0 ? (
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                      <tr>
                        {columns.map((col, i) => (
                          <th key={i} className="px-4 py-3">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {paginatedRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-900/50 transition-colors">
                          {row.map((val, cIdx) => (
                            <td key={cIdx} className="px-4 py-2.5 whitespace-nowrap">
                              {formatTableCell(val, columns[cIdx] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="px-4 py-6 text-center text-xs text-slate-500">Nenhuma coluna retornada pela consulta.</p>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 px-1">
                  <span>
                    Página <strong>{page}</strong> de <strong>{totalPages}</strong>
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      disabled={page === 1}
                      className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 cursor-pointer"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                      disabled={page === totalPages}
                      className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 cursor-pointer"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
