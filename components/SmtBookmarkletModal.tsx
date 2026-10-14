import React, { useState } from 'react';
import { X, Copy, Check, Zap, Download, ExternalLink, HelpCircle, ArrowRight } from 'lucide-react';
import { SMT_BOOKMARKLET_SCRIPT, SMT_BOOKMARKLET_ENCODED } from '../utils/smtBookmarklet';

interface SmtBookmarkletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmtBookmarkletModal: React.FC<SmtBookmarkletModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SMT_BOOKMARKLET_ENCODED);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Favorito / Bookmarklet SMT Correios
                <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                  Novo: Botão Extrair
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Atua diretamente na tela do formulário do Sistema de Mensagens dos Correios (SMT)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {/* Quick Actions Card */}
          <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Draggable button for bookmarks bar */}
              <a
                href={SMT_BOOKMARKLET_ENCODED}
                onClick={(e) => {
                  e.preventDefault();
                  handleCopy();
                }}
                title="Arraste este botão para a sua Barra de Favoritos do navegador!"
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-center transition-all cursor-grab active:cursor-grabbing border border-indigo-400/40 select-none group"
              >
                <Zap size={16} className="text-yellow-300 group-hover:scale-110 transition-transform" />
                <span>⚡ Autopreencher & Extrator SMT</span>
              </a>

              {/* Copy button */}
              <button
                onClick={handleCopy}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all shadow-md"
              >
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                <span>{copied ? 'Copiado para o Clipboard!' : 'Copiar Código'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1.5">
              <span>💡</span>
              <b>Dica rápida:</b> Arraste o botão roxo para a barra de favoritos do navegador ou clique em <b>Copiar Código</b> e edite seu favorito atual.
            </p>
          </div>

          {/* O que há de novo */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Recursos disponíveis no painel do Favorito no SMT:
            </h4>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-1">
                <div className="font-bold text-sky-400 flex items-center gap-1.5">
                  <span>📥</span> Botão "Extrair do SMT" (Novo!)
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Lê os campos já digitados no formulário do SMT (Nome, CEP, Número, Complemento, Processo) e copia automaticamente para o clipboard.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-1">
                <div className="font-bold text-indigo-400 flex items-center gap-1.5">
                  <span>📋</span> Botão "Colar & Preencher"
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Lê a qualificação copiada do SIS-NI, B.O. ou processo e autocompleta os campos do formulário SMT e campos proprietários em 1 clique.
                </p>
              </div>
            </div>
          </div>

          {/* Passo a passo de instalação */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Como atualizar ou instalar o favorito:
            </h4>
            <ol className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/60">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                <span>Clique em <b>Copiar Código</b> acima.</span>
              </li>
              <li className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/60">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                <span>Na barra de favoritos do navegador, clique com o botão direito no favorito existente do SMT e selecione <b>Editar</b>.</span>
              </li>
              <li className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/60">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                <span>No campo <b>URL</b>, substitua todo o conteúdo pelo novo código colado e salve.</span>
              </li>
              <li className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/60">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">4</span>
                <span>Pronto! Ao abrir a página do SMT e clicar no favorito, o novo botão <b>📥 Extrair do SMT</b> estará pronto para uso.</span>
              </li>
            </ol>
          </div>

          {/* Código Raw Expandable */}
          <div className="border-t border-slate-800 pt-4">
            <button
              onClick={() => setShowCode(!showCode)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-medium transition-colors"
            >
              {showCode ? 'Ocultar código fonte' : 'Visualizar código JavaScript completo'}
            </button>
            {showCode && (
              <div className="mt-3">
                <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 font-mono overflow-x-auto max-h-48 whitespace-pre-wrap select-all">
                  {SMT_BOOKMARKLET_ENCODED}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
