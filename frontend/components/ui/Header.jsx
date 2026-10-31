'use client';


import { Database, Activity, ShieldCheck } from 'lucide-react';

export default function Header({ backendStatus }) {
  return (
    <header className="sticky top-0 z-50 glass-header px-6 py-4 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">

        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Data <span className="gradient-text">Intelligence</span>
              </h1>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Text-to-SQL
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Análise Inteligente de Dados — Text-to-SQL
            </p>
          </div>
        </div>

        {/* Badges & Health Status */}
        <div className="flex items-center gap-3 text-xs">
          {/* Security Guard Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium">SQL Mutation Guard</span>
          </div>

          {/* Backend Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">Backend:</span>
            {backendStatus === 'online' ? (
              <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Online
              </span>
            ) : backendStatus === 'offline' ? (
              <span className="flex items-center gap-1.5 font-semibold text-rose-400">
                <span className="inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                Offline
              </span>
            ) : (
              <span className="text-amber-400 animate-pulse font-medium">Conectando...</span>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
