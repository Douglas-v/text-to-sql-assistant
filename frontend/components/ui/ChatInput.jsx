'use client';

import { useState } from 'react';
import { Send, Sparkles, Loader2, Lightbulb } from 'lucide-react';

const SUGGESTIONS = [
  { label: 'Top 3 Produtos Vendidos', query: 'Quais são os 3 produtos mais vendidos em quantidade?' },
  { label: 'Diferença em Relação ao Mês Anterior', query: 'Mostre o faturamento total mês a mês e a diferença de valor em relação ao mês anterior.' },
  { label: 'Distribuição dos Tipos de Pagamento', query: 'Qual o valor total de vendas acumulado por cada tipo de pagamento?' },
  { label: 'Evolução Mensal', query: 'Qual a evolução do faturamento total de vendas por mês?' },
  { label: 'Teste de Segurança (Bloqueio)', query: 'Delete todas as vendas anteriores a 2025' }
];

export default function ChatInput({ onSendQuery, isLoading }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendQuery(input.trim());
    setInput('');
  };

  const handleSuggestionClick = (queryText) => {
    if (isLoading) return;
    onSendQuery(queryText);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Input Container */}
      <form onSubmit={handleSubmit} className="relative group">
        <div className="relative glass-panel rounded-2xl p-1.5 transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500/50 shadow-xl">
          <div className="flex items-center gap-3 px-3 py-1">
            <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Faça uma pergunta sobre o banco de vendas (ex: Qual o produto mais vendido em 2025?)..."
              className="w-full bg-transparent border-0 text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-0 disabled:opacity-50 py-3"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="shrink-0 p-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-md shadow-blue-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Suggestion Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-1 px-1">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mr-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          Sugestões rápidas:
        </span>
        {SUGGESTIONS.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleSuggestionClick(item.query)}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-full bg-slate-800/60 hover:bg-blue-600/20 hover:border-blue-500/40 text-slate-300 hover:text-blue-300 border border-slate-700/50 transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
