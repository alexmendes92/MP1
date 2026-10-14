import React, { useState, useMemo } from 'react';
import { 
  Search, FileText, Mail, FileCheck, ArrowRight, Gavel, Archive, 
  ListTodo, BrainCircuit, Database, Send, ScanText, Palette, ClipboardCheck, 
  Stamp, FileSearch, Zap, BellRing, BookOpen, PartyPopper, Server, 
  FileBarChart, CalendarClock, Landmark, TrendingUp, Shield, Video, Layers,
  Scale, CheckCircle2, ChevronRight
} from 'lucide-react';
import { AppScreen } from '../types';

interface DashboardProps {
  onSelectScreen: (screen: AppScreen) => void;
}

interface ToolItem {
  id: AppScreen;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  category: 'ROTINA' | 'ANPP' | 'DOCUMENTOS' | 'PROCEDIMENTOS' | 'GESTAO';
  tag?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectScreen }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const tools: ToolItem[] = [
    // --- 1. ROTINA DIÁRIA (CORE) ---
    {
      id: 'ACTIVITIES' as AppScreen,
      title: 'Minhas Atividades',
      description: 'Gerencie e acompanhe suas atividades e processos pessoais.',
      icon: <ListTodo className="text-teal-400" size={32} />,
      color: 'bg-teal-950/40',
      borderColor: 'border-teal-800/50',
      category: 'ROTINA'
    },
    {
      id: 'DESPACHO_AGENDAMENTO' as AppScreen,
      title: 'Agendamento',
      description: 'Agende oitivas, reuniões e despachos com geração de convites.',
      icon: <CalendarClock className="text-pink-400" size={32} />,
      color: 'bg-pink-950/40',
      borderColor: 'border-pink-800/50',
      category: 'ROTINA'
    },
    {
      id: 'PESQUISA_NI' as AppScreen,
      title: 'Pesquisa de NI',
      description: 'Gere solicitações de localização de partes para o SIS/NI.',
      icon: <Search className="text-amber-400" size={32} />,
      color: 'bg-amber-950/40',
      borderColor: 'border-amber-800/50',
      category: 'ROTINA'
    },
    {
      id: 'LOTE_PESQUISA_NI' as AppScreen,
      title: 'Pesquisa de NI em Lote',
      description: 'Processamento em massa de mandados e autos para expedição de pesquisas de localização (Word, E-mail, ZIP).',
      icon: <Layers className="text-amber-400" size={32} />,
      color: 'bg-gradient-to-br from-amber-950/70 to-red-950/70',
      borderColor: 'border-amber-500/60',
      category: 'ROTINA'
    },

    // --- 2. GESTÃO ANPP (ACORDO DE NÃO PERSECUÇÃO PENAL) ---
    {
      id: 'ANPP' as AppScreen,
      title: 'Formulário ANPP',
      description: 'Acordo de Não Persecução Penal (Minuta e Teams).',
      icon: <FileCheck className="text-emerald-400" size={32} />,
      color: 'bg-emerald-950/50',
      borderColor: 'border-emerald-600/70',
      category: 'ANPP'
    },

    // --- 3. DOCUMENTOS & MODELOS ---
    {
      id: 'SISDIGITAL' as AppScreen,
      title: 'SISDIGITAL',
      description: 'Termo de Conclusão para Notícia de Fato.',
      icon: <FileText className="text-blue-400" size={32} />,
      color: 'bg-blue-950/40',
      borderColor: 'border-blue-800/50',
      category: 'DOCUMENTOS'
    },
    {
      id: 'OFICIO' as AppScreen,
      title: 'Ofício',
      description: 'Modelos de ofícios para DPs, GAESP, Corregedoria e outros.',
      icon: <Mail className="text-red-400" size={32} />,
      color: 'bg-red-950/40',
      borderColor: 'border-red-800/50',
      category: 'DOCUMENTOS'
    },
    {
      id: 'BATALHOES_CONTACTS' as AppScreen,
      title: 'Contatos dos Batalhões',
      description: 'Diretório completo de e-mails da PMESP (BPM/M, BAEP, Choque, etc).',
      icon: <Shield className="text-red-400" size={32} />,
      color: 'bg-red-950/40',
      borderColor: 'border-red-800/50',
      category: 'DOCUMENTOS'
    },

    // --- 4. PROCEDIMENTOS ESPECÍFICOS ---
    {
      id: 'PROVIDENCIAS' as AppScreen,
      title: 'Providências',
      description: 'Gerador de Certidões simples para cumprimento de cotas.',
      icon: <ClipboardCheck className="text-cyan-400" size={32} />,
      color: 'bg-cyan-950/40',
      borderColor: 'border-cyan-800/50',
      category: 'PROCEDIMENTOS'
    },
    {
      id: 'REQUERIMENTO_JUNTADA' as AppScreen,
      title: 'Requerimento de Juntada',
      description: 'Gere petições e termos de juntada aos autos (Pesquisa NI, diligências, ofícios, laudos).',
      icon: <FileText className="text-rose-400" size={32} />,
      color: 'bg-gradient-to-br from-rose-950/70 to-red-950/70',
      borderColor: 'border-rose-500/60',
      category: 'PROCEDIMENTOS'
    },
    {
      id: 'NOTICIA_FATO_PROCEDURE' as AppScreen,
      title: 'Procedimento N.F.',
      description: 'Documentar tentativas de contato e declarações em Notícia de Fato.',
      icon: <FileSearch className="text-orange-400" size={32} />,
      color: 'bg-orange-950/40',
      borderColor: 'border-orange-800/50',
      category: 'PROCEDIMENTOS'
    },
    {
      id: 'MULTA_PENAL' as AppScreen,
      title: 'Multa Penal',
      description: 'Extração automática de dados de certidões de multa.',
      icon: <Gavel className="text-purple-400" size={32} />,
      color: 'bg-purple-950/40',
      borderColor: 'border-purple-800/50',
      category: 'PROCEDIMENTOS'
    },
    {
      id: 'PROMOCAO_ARQUIVAMENTO' as AppScreen,
      title: 'Arquivamento',
      description: 'Limpeza e extração de texto de Promoções de Arquivamento.',
      icon: <Archive className="text-slate-400" size={32} />,
      color: 'bg-slate-900',
      borderColor: 'border-slate-800',
      category: 'PROCEDIMENTOS'
    },
    {
      id: 'LOTE_NOTIFICACAO_ARQUIVAMENTO' as AppScreen,
      title: 'Notificações de Arquivamento em Lote',
      description: 'Recepção de promoções em PDF, extração no rodapé e geração em massa de Cartas, Certidões (.docx) e ZIP.',
      icon: <Layers className="text-red-400" size={32} />,
      color: 'bg-red-950/60',
      borderColor: 'border-red-600/60',
      category: 'PROCEDIMENTOS'
    },
    {
      id: 'INTIMACAO_ARQUIVAMENTO' as AppScreen,
      title: 'Notificação Individual (Art. 28)',
      description: 'Gestão de comunicações unitárias via WhatsApp, E-mail e Correios.',
      icon: <BellRing className="text-rose-400" size={32} />,
      color: 'bg-rose-950/40',
      borderColor: 'border-rose-800/50',
      category: 'PROCEDIMENTOS'
    },

    // --- 5. GESTÃO & APOIO ---
    {
      id: 'RELATORIO_CGMP' as AppScreen,
      title: 'Relatório CGMP',
      description: 'Tabela de produtividade mensal dos Promotores (Inquéritos, Audiências, etc).',
      icon: <FileBarChart className="text-blue-400" size={32} />,
      color: 'bg-blue-900/40',
      borderColor: 'border-blue-800/50',
      category: 'GESTAO'
    },
    {
      id: 'PARTY_FINANCE' as AppScreen,
      title: 'Gestor de Eventos',
      description: 'Controle financeiro de festas e confraternizações da 4ª PJ.',
      icon: <PartyPopper className="text-pink-400" size={32} />,
      color: 'bg-pink-950/40',
      borderColor: 'border-pink-800/50',
      category: 'GESTAO'
    },
    {
      id: 'DATABASE' as AppScreen,
      title: 'Gerenciador de Dados',
      description: 'Edite as tabelas de Promotores e Cargos do sistema.',
      icon: <Database className="text-indigo-400" size={32} />,
      color: 'bg-indigo-950/40',
      borderColor: 'border-indigo-800/50',
      category: 'GESTAO'
    },
    {
      id: 'USER_GUIDE' as AppScreen,
      title: 'Guia do Usuário',
      description: 'Manual completo e tutoriais de uso das ferramentas do sistema.',
      icon: <BookOpen className="text-white" size={32} />,
      color: 'bg-indigo-600',
      borderColor: 'border-indigo-500',
      category: 'GESTAO'
    },
    {
      id: 'DB_SCHEMA_DOCS' as AppScreen,
      title: 'Estrutura de Dados (SQL)',
      description: 'Documentação técnica do esquema de banco de dados.',
      icon: <Server className="text-emerald-400" size={32} />,
      color: 'bg-emerald-950/40',
      borderColor: 'border-emerald-800/50',
      category: 'GESTAO'
    },
    {
      id: 'LAYOUT_DOCS' as AppScreen,
      title: 'Design System',
      description: 'Documentação visual, paleta de cores e estrutura do app.',
      icon: <Palette className="text-slate-200" size={32} />,
      color: 'bg-slate-800',
      borderColor: 'border-slate-600',
      category: 'GESTAO'
    }
  ];

  const categories = [
    { id: 'TODAS', label: 'Todas' },
    { id: 'ROTINA', label: 'Rotina & Core' },
    { id: 'ANPP', label: 'Gestão ANPP' },
    { id: 'DOCUMENTOS', label: 'Documentos' },
    { id: 'PROCEDIMENTOS', label: 'Procedimentos' },
    { id: 'GESTAO', label: 'Gestão & Apoio' },
  ];

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchesCategory = selectedCategory === 'TODAS' || tool.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || 
        tool.title.toLowerCase().includes(q) || 
        tool.description.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [tools, selectedCategory, searchQuery]);

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-950 flex flex-col items-center custom-scrollbar">
      <div className="w-full max-w-6xl space-y-6">
        
        {/* BARRA DE PESQUISA & SEGMENTED CONTROLS */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          
          {/* Segmented Category Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar ferramentas..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
            <div className="text-[11px] font-bold text-slate-500 shrink-0">
              {filteredTools.length} {filteredTools.length === 1 ? 'módulo' : 'módulos'}
            </div>
          </div>
        </div>

        {/* GRADE DE FERRAMENTAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => onSelectScreen(tool.id)}
              className="group bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl hover:shadow-indigo-950/20 hover:border-slate-700 transition-all flex flex-col items-center text-center relative overflow-hidden active:scale-95 text-left"
            >
              {tool.tag && (
                <span className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {tool.tag}
                </span>
              )}

              <div className={`w-20 h-20 ${tool.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ring-1 ${tool.borderColor}`}>
                {tool.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-3 uppercase tracking-tight">{tool.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                {tool.description}
              </p>
              <div className="mt-auto flex items-center gap-2 text-slate-500 group-hover:text-slate-200 font-bold text-[10px] uppercase tracking-widest transition-colors">
                Acessar Ferramenta <ArrowRight size={14} />
              </div>
              
              <div className={`absolute top-0 right-0 w-24 h-24 ${tool.color} opacity-20 rounded-full blur-2xl -mr-12 -mt-12`}></div>
            </button>
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center py-16 bg-slate-900/50 rounded-3xl border border-slate-800">
            <p className="text-sm text-slate-400">Nenhuma ferramenta encontrada com os termos pesquisados.</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300"
            >
              Limpar Pesquisa
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
