'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '../components/ui/Header';
import ChatInput from '../components/ui/ChatInput';
import QueryResponseView from '../components/QueryResponseView';
import SecurityBadge from '../components/ui/SecurityBadge';
import { Database, AlertCircle, RefreshCw, Trash2, MessageSquare, User, Bot, Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchBackendStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) return 'offline';
    const data = await res.json();
    return data.status === 'ok' ? 'online' : 'offline';
  } catch {
    return 'offline';
  }
}

export default function Home() {
  const [backendStatus, setBackendStatus] = useState('checking');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const chatBottomRef = useRef(null);

  const checkBackendHealth = async () => {
    setBackendStatus('checking');
    setBackendStatus(await fetchBackendStatus());
  };

  // Verificação inicial: o estado já nasce como 'checking', então só atualiza quando a resposta chega.
  useEffect(() => {
    let active = true;
    fetchBackendStatus().then((status) => {
      if (active) setBackendStatus(status);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSendQuery = async (questionText) => {
    setIsLoading(true);

    const messageId = Date.now();
    const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    try {
      const res = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: questionText }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          // 403 = SQL Mutation Guard bloqueou a query antes de chegar ao banco.
          setMessages((prev) => [
            ...prev,
            {
              id: messageId,
              question: questionText,
              timestamp: timeString,
              securityError: {
                detail: data.detail || 'Operação de mutação rejeitada pelo sistema de segurança.',
                sql: data.detail?.includes('SQL rejeitado:') ? data.detail.split('SQL rejeitado:')[1] : null,
              },
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: messageId,
              question: questionText,
              timestamp: timeString,
              generalError: data.detail || 'Ocorreu um erro ao processar sua pergunta.',
            },
          ]);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: messageId,
            question: questionText,
            timestamp: timeString,
            queryResponse: data,
          },
        ]);
        setBackendStatus('online');
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          question: questionText,
          timestamp: timeString,
          generalError: `Não foi possível conectar ao servidor backend (${API_BASE}). Verifique se o servidor FastAPI está rodando.`,
        },
      ]);
      setBackendStatus('offline');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 selection:bg-blue-600 selection:text-white">
      <Header backendStatus={backendStatus} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6 flex flex-col">

        {backendStatus === 'offline' && (
          <div className="w-full p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>O backend não está respondendo em <code>{API_BASE}</code>. Inicie o FastAPI com <code>python -m uvicorn app.main:app --reload</code>.</span>
            </div>
            <button
              onClick={checkBackendHealth}
              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 flex items-center gap-1 font-medium transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3 h-3" /> Tentar Novamente
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="text-center max-w-2xl mx-auto space-y-4 py-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400">
              <Database className="w-3.5 h-3.5" /> Banco SQLite • vendas_ficticias.db (150 registros)
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Chat Interativo de <span className="gradient-text">Inteligência de Dados</span>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Faça perguntas em linguagem natural e acompanhe todo o histórico da conversa com análises textuais geradas pelo <strong className="text-slate-200">IA</strong>, consultas SQL validadas, tabelas e gráficos dinâmicos.
            </p>
          </div>
        )}

        {messages.length > 0 && (
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span>Histórico da Conversa ({messages.length} {messages.length === 1 ? 'consulta' : 'consultas'})</span>
            </div>
            <button
              onClick={handleClearHistory}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-rose-950/40 hover:text-rose-300 text-slate-400 border border-slate-700/60 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Limpar Histórico"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Limpar Histórico
            </button>
          </div>
        )}

        <div className="flex-1 space-y-8 min-h-[200px]">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">

              <div className="flex items-start justify-end gap-3">
                <div className="bg-blue-600/90 border border-blue-500/40 text-white rounded-2xl rounded-tr-none px-4 py-3 max-w-2xl shadow-lg">
                  <div className="flex items-center justify-between gap-4 text-[10px] text-blue-200 mb-1">
                    <span className="font-semibold uppercase tracking-wider">Você</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed">{msg.question}</p>
                </div>
                <div className="p-2 rounded-full bg-blue-600 text-white shrink-0 shadow-md">
                  <User className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-indigo-600 text-white shrink-0 shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex-1 max-w-4xl">
                  {msg.generalError && (
                    <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-sm flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-semibold block text-rose-300">Erro na Consulta:</strong>
                        <span>{msg.generalError}</span>
                      </div>
                    </div>
                  )}

                  {msg.securityError && (
                    <SecurityBadge errorDetail={msg.securityError.detail} sqlBlocked={msg.securityError.sql} />
                  )}

                  {msg.queryResponse && (
                    <QueryResponseView responseData={msg.queryResponse} question={msg.question} />
                  )}
                </div>
              </div>

            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3 animate-pulse">
              <div className="p-2 rounded-full bg-indigo-600/80 text-white shrink-0 shadow-md">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="glass-panel px-4 py-3 rounded-2xl text-xs text-blue-300 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span>A IA está gerando a consulta SQL e sintetizando os dados...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        <div className="sticky bottom-0 z-40 pt-8 pb-4 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-gradient-to-t from-[#090d16] from-75% to-transparent">
          <ChatInput onSendQuery={handleSendQuery} isLoading={isLoading} />
        </div>

      </main>

      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        <p>Data Intelligence Assistant — Text-to-SQL (FastAPI + Next.js)</p>
      </footer>
    </div>
  );
}
