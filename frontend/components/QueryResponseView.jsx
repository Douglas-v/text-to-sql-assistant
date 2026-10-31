'use client';

import { useState } from 'react';
import {
  Sparkles,
  Code2,
  Table as TableIcon,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';
import DynamicChart from './charts/DynamicChart';
import { formatTableCell, formatColumnHeader } from '../lib/formatters';

export default function QueryResponseView({ responseData, question }) {
  if (!responseData) return null;

  // `key` remonta o conteúdo a cada nova query, reiniciando aba ativa e paginação.
  return <QueryResponseContent key={responseData.sql} responseData={responseData} question={question} />;
}

function QueryResponseContent({ responseData, question }) {
  const { sql, sintese, columns, rows, total_registros } = responseData;

  const isScalarResult = rows?.length === 1 && columns?.length === 1;

  const [showSql, setShowSql] = useState(true);
  const [activeView, setActiveView] = useState(isScalarResult ? 'table' : 'chart');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const totalPages = Math.ceil((rows?.length || 0) / rowsPerPage);
  const paginatedRows = rows?.slice((page - 1) * rowsPerPage, page * rowsPerPage) || [];

  const exportToCsv = () => {
    if (!columns?.length || !rows?.length) return;

    const escape = (val) => {
      const str = val === null || val === undefined ? '' : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      columns.map(escape).join(','),
      ...rows.map((row) => row.map(escape).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `exportacao_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

      <div className="glass-card rounded-xl p-4 border border-blue-500/20 bg-gradient-to-r from-blue-950/40 via-indigo-950/20 to-slate-900/60 relative overflow-hidden">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs uppercase font-bold tracking-wider text-blue-300">
              Síntese dos Dados
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed font-normal">
              {sintese}
            </p>
          </div>
        </div>
      </div>

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

      {total_registros > 0 && (
        <div className="space-y-4 pt-2">

          {!isScalarResult && (
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
                  <TableIcon className="w-4 h-4" /> Tabela de Dados
                </button>
              </div>

              <span className="text-xs text-slate-500 hidden sm:inline">
                Total de registros: <strong className="text-slate-300">{total_registros}</strong>
              </span>
            </div>
          )}

          {activeView === 'chart' && !isScalarResult ? (
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
                            {formatColumnHeader(col)}
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
                  <p className="px-4 py-6 text-center text-xs text-slate-500">
                    Nenhuma coluna retornada pela consulta.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1 px-1">
                {totalPages > 1 ? (
                  <div className="flex items-center gap-3">
                    <span>
                      Página <strong>{page}</strong> de <strong>{totalPages}</strong>
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setPage((p) => Math.max(p - 1, 1))}
                        disabled={page === 1}
                        className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 cursor-pointer transition-colors"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                        disabled={page === totalPages}
                        className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 cursor-pointer transition-colors"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                ) : (
                  <span />
                )}

                {!isScalarResult && rows?.length > 0 && (
                  <button
                    onClick={exportToCsv}
                    title={`Exportar ${rows.length} registros como CSV`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-blue-300 hover:bg-blue-600/10 border border-transparent hover:border-blue-500/30 transition-all duration-200 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar CSV</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
