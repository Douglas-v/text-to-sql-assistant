'use client';

import { ShieldAlert, Lock, AlertTriangle } from 'lucide-react';

export default function SecurityBadge({ errorDetail, sqlBlocked }) {
  return (
    <div className="glass-panel border-rose-500/30 bg-rose-950/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-3">
      {/* Background Glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-start gap-4 relative z-10">
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Bloqueio HTTP 403
            </span>
            <span className="text-xs text-rose-400 font-medium">SQL Security Guard</span>
          </div>

          <h3 className="text-base font-semibold text-rose-200">
            Operação de Mutação Detectada e Bloqueada
          </h3>

          <p className="text-sm text-slate-300 leading-relaxed">
            {errorDetail || "A consulta SQL foi abortada por violar as políticas de segurança. O backend permite exclusivamente comandos SELECT de leitura."}
          </p>

          {sqlBlocked && (
            <div className="mt-3 p-3 rounded-lg bg-slate-950/80 border border-rose-500/20 font-mono text-xs text-rose-300 overflow-x-auto">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" /> SQL Rejeitado:
              </div>
              <code>{sqlBlocked}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
