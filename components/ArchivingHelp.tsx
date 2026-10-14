
import React from 'react';
import { ArrowLeft, BellRing, FileText, Send, User, Sparkles, CheckCircle, HelpCircle, Archive, Clipboard } from 'lucide-react';

interface ArchivingHelpProps {
  onBack: () => void;
}

const ArchivingHelp: React.FC<ArchivingHelpProps> = ({ onBack }) => {
  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col items-center">
        <div className="w-full max-w-5xl">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-12 border-b border-slate-800 pb-8">
            <div className="flex items-center gap-4">
               <button onClick={onBack} className="p-3 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 hover:text-white text-slate-400 transition-all">
                  <ArrowLeft size={20} />
               </button>
               <div>
                  <h1 className="text-3xl font-bold text-slate-100 uppercase tracking-tight">Manual de Arquivamento</h1>
                  <p className="text-slate-500 text-sm mt-1">Guia de funcionamento das ferramentas de Art. 28 CPP e Promoção.</p>
               </div>
            </div>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-rose-950/20 border border-rose-900/50 rounded-lg text-rose-400 text-xs font-bold uppercase tracking-widest">
               <HelpCircle size={16} /> Central de Ajuda
            </div>
          </div>

          <div className="grid gap-12">
            
            {/* Seção 1: Notificação (Art. 28) */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-600 rounded-xl text-white shadow-lg shadow-rose-900/20">
                        <BellRing size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-200">1. Notificação de Arquivamento (Art. 28 CPP)</h2>
                </div>
                
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        Esta ferramenta gerencia o fluxo completo de comunicação às vítimas e investigados sobre o arquivamento do inquérito policial. 
                        O processo é dividido em 3 etapas lógicas:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Step 1 */}
                        <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl relative group hover:border-rose-500/50 transition-all">
                            <div className="absolute -top-3 -left-3 w-8 h-8 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center font-bold text-slate-200 shadow-md">1</div>
                            <div className="flex items-center gap-2 mb-3 text-rose-400 font-bold uppercase text-xs tracking-widest">
                                <User size={16} /> Cadastro
                            </div>
                            <h3 className="text-lg font-bold text-slate-200 mb-2">Dados da Parte</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                Cadastre manualmente ou use a <b>IA (Sparkles)</b> para colar o texto do B.O. e extrair nome, endereço e telefone automaticamente.
                            </p>
                            <div className="p-3 bg-rose-900/10 rounded-lg border border-rose-900/20 text-[10px] text-rose-300">
                                <Sparkles size={12} className="inline mr-1"/> Dica: Cole a qualificação inteira do PDF na caixa de IA.
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl relative group hover:border-rose-500/50 transition-all">
                            <div className="absolute -top-3 -left-3 w-8 h-8 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center font-bold text-slate-200 shadow-md">2</div>
                            <div className="flex items-center gap-2 mb-3 text-blue-400 font-bold uppercase text-xs tracking-widest">
                                <Send size={16} /> Canais
                            </div>
                            <h3 className="text-lg font-bold text-slate-200 mb-2">Escolha o Meio</h3>
                            <p className="text-sm text-slate-500">
                                Selecione como a parte será avisada. O sistema gera os textos ou documentos necessários:
                            </p>
                            <ul className="mt-3 space-y-2 text-xs text-slate-400">
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> <b>WhatsApp:</b> Gera texto padrão para envio.</li>
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> <b>E-mail:</b> Gera modelo formal.</li>
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div> <b>Correios:</b> Gera etiqueta de AR e CSV para SMT.</li>
                            </ul>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl relative group hover:border-rose-500/50 transition-all">
                            <div className="absolute -top-3 -left-3 w-8 h-8 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center font-bold text-slate-200 shadow-md">3</div>
                            <div className="flex items-center gap-2 mb-3 text-emerald-400 font-bold uppercase text-xs tracking-widest">
                                <FileText size={16} /> Finalização
                            </div>
                            <h3 className="text-lg font-bold text-slate-200 mb-2">Certidão Automática</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                Com base nos dados e no canal escolhido, o sistema gera a <b>Certidão de Oficial de Promotoria</b> pronta para imprimir (PDF) ou copiar (HTML).
                            </p>
                            <div className="flex items-center gap-2 text-[10px] bg-slate-900 p-2 rounded border border-slate-800">
                                <CheckCircle size={12} className="text-emerald-500"/>
                                <span className="text-slate-400">Layout A4 Padrão MPSP</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Seção 2: Promoção de Arquivamento */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-700 rounded-xl text-white shadow-lg shadow-slate-900/20">
                        <Archive size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-200">2. Ferramenta de Promoção (Limpeza)</h2>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col md:flex-row gap-8 shadow-xl">
                    <div className="flex-1 space-y-4">
                        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                            <Clipboard size={18} className="text-slate-500"/> O Problema
                        </h3>
                        <p className="text-sm text-slate-400 leading-relaxed text-justify">
                            Ao copiar textos de PDFs de Promoção de Arquivamento (especialmente peças antigas ou digitalizadas), o texto vem com quebras de linha erradas, cabeçalhos repetidos, números de página e margens de assinatura digital que "sujam" a colagem no Word.
                        </p>
                    </div>
                    
                    <div className="w-px bg-slate-800 hidden md:block"></div>

                    <div className="flex-1 space-y-4">
                        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                            <Sparkles size={18} className="text-amber-500"/> A Solução
                        </h3>
                        <p className="text-sm text-slate-400 leading-relaxed text-justify">
                            A ferramenta <b>Arquivamento (Promoção)</b> usa IA avançada para ler o PDF/Imagem, ignorar as margens laterais (assinaturas) e cabeçalhos, e reconstruir os parágrafos corretamente.
                        </p>
                        <ul className="text-xs text-slate-500 space-y-1 mt-2">
                            <li>• Remove "Assinado digitalmente por..."</li>
                            <li>• Remove numeração de folhas.</li>
                            <li>• Junta frases quebradas.</li>
                        </ul>
                    </div>
                </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchivingHelp;
