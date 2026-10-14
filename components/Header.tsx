import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronLeft, User, LayoutDashboard, LogOut, FileCheck, 
  ChevronDown, Scale, Search, Mail, FileText, Gavel, 
  Archive, CalendarClock, Shield, ListTodo, Layers, Grid
} from 'lucide-react';
import Logo from './Logo';
import { AppScreen } from '../types';

interface HeaderProps {
  userName: string;
  showBackButton?: boolean;
  onBack?: () => void;
  onLogout: () => void;
  onNavigateScreen?: (screen: AppScreen) => void;
  currentScreen?: AppScreen;
}

const SCREEN_TITLES: Partial<Record<AppScreen, string>> = {
  DASHBOARD: 'Painel Geral',
  PESQUISA_NI: 'Pesquisa de NI',
  LOTE_PESQUISA_NI: 'Pesquisa de NI em Lote',
  REQUERIMENTO_JUNTADA: 'Requerimento de Juntada',
  SISDIGITAL: 'SISDIGITAL / Notícia de Fato',
  OFICIO: 'Ofício MP',
  ANPP: 'Formulário ANPP',
  MULTA_PENAL: 'Multa Penal',
  PROMOCAO_ARQUIVAMENTO: 'Promoção de Arquivamento',
  INTIMACAO_ARQUIVAMENTO: 'Notificação de Arquivamento (Art. 28)',
  LOTE_NOTIFICACAO_ARQUIVAMENTO: 'Arquivamento em Lote',
  DESPACHO_AGENDAMENTO: 'Agendamento de Despacho',
  PROVIDENCIAS: 'Providências & Certidões',
  ACTIVITIES: 'Minhas Atividades',
  BATALHOES_CONTACTS: 'Diretório PMESP',
  DATABASE: 'Gerenciador de Dados',
  USER_GUIDE: 'Guia do Usuário',
};

const Header: React.FC<HeaderProps> = ({ 
  userName, 
  showBackButton, 
  onBack, 
  onLogout,
  onNavigateScreen,
  currentScreen = 'DASHBOARD'
}) => {
  const [modulesMenuOpen, setModulesMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setModulesMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectModule = (screen: AppScreen) => {
    if (onNavigateScreen) {
      onNavigateScreen(screen);
    }
    setModulesMenuOpen(false);
  };

  const currentTitle = SCREEN_TITLES[currentScreen] || 'MPSP Sistema';

  return (
    <header className="bg-slate-900 text-slate-100 h-16 flex items-center justify-between px-4 sm:px-6 md:px-8 shadow-md shrink-0 z-30 border-b border-slate-800">
      <div className="flex items-center gap-3 sm:gap-4 md:gap-6 min-w-0">
        {showBackButton ? (
          <button 
            onClick={onBack}
            className="group p-2 rounded-xl hover:bg-slate-800 transition-all border border-slate-700 flex items-center gap-2 shrink-0 active:scale-95"
            title="Voltar"
          >
            <ChevronLeft size={20} className="text-slate-400 group-hover:text-slate-200 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden md:inline text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-200">Voltar</span>
          </button>
        ) : (
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 shrink-0">
            <LayoutDashboard size={18} className="text-slate-400" />
            <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-widest text-slate-400">Início</span>
          </div>
        )}
        
        <div className="h-6 w-px bg-slate-800 hidden sm:block shrink-0"></div>
        
        <div className="flex items-center gap-3 shrink-0">
          <Logo className="h-7" isDark={true} />
          <div className="flex flex-col border-l border-slate-800 pl-3 hidden sm:flex">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">Intranet</span>
            <span className="text-[9px] font-medium text-slate-500 uppercase tracking-widest mt-1">4ª PJ Criminal</span>
          </div>
        </div>

        {/* INDICADOR DA TELA ATUAL */}
        <div className="hidden xl:flex items-center gap-2 border-l border-slate-800 pl-4">
          <span className="text-xs font-bold text-slate-300 truncate max-w-[220px]">
            {currentTitle}
          </span>
        </div>

        {/* MENU COMPLETO DE MÓDULOS */}
        {onNavigateScreen && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setModulesMenuOpen(!modulesMenuOpen)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 ${
                modulesMenuOpen
                  ? 'bg-slate-800 text-white border-slate-600 shadow-md'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
              title="Acessar todos os módulos do sistema"
            >
              <Grid size={15} className="text-red-500" />
              <span className="hidden sm:inline">Módulos</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${modulesMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {modulesMenuOpen && (
              <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 max-h-[80vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 flex flex-col gap-2 custom-scrollbar backdrop-blur-xl">
                <div className="flex items-center justify-between px-2 py-1 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Todas as Ferramentas</span>
                  <button 
                    onClick={() => handleSelectModule('DASHBOARD')}
                    className="text-red-400 hover:underline hover:text-red-300"
                  >
                    Ir ao Painel Geral
                  </button>
                </div>

                {/* Bloco 1: Rotina & Core */}
                <div>
                  <p className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-purple-400">Rotina & Investigação</p>
                  <div className="space-y-0.5">
                    <button onClick={() => handleSelectModule('ACTIVITIES')} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-bold hover:bg-slate-800 text-slate-200 transition-colors">
                      <ListTodo size={15} className="text-teal-400 shrink-0" />
                      <span className="truncate">Minhas Atividades</span>
                    </button>
                    <button onClick={() => handleSelectModule('REQUERIMENTO_JUNTADA')} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-bold hover:bg-slate-800 text-slate-200 transition-colors">
                      <FileText size={15} className="text-rose-400 shrink-0" />
                      <span className="truncate">Requerimento de Juntada</span>
                    </button>
                    <button onClick={() => handleSelectModule('PESQUISA_NI')} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-bold hover:bg-slate-800 text-slate-200 transition-colors">
                      <Search size={15} className="text-amber-400 shrink-0" />
                      <span className="truncate">Pesquisa de NI (SIS/NI)</span>
                    </button>
                    <button onClick={() => handleSelectModule('LOTE_PESQUISA_NI')} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-bold hover:bg-slate-800 text-slate-200 transition-colors">
                      <Layers size={15} className="text-amber-400 shrink-0" />
                      <span className="truncate">Pesquisa de NI em Lote</span>
                    </button>
                  </div>
                </div>

                {/* Bloco 2: Gestão ANPP */}
                <div className="pt-1 border-t border-slate-800/80">
                  <p className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-400">Gestão ANPP (Art. 28-A CPP)</p>
                  <div className="space-y-0.5">
                    <button onClick={() => handleSelectModule('ANPP')} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-bold hover:bg-slate-800 text-slate-200 transition-colors">
                      <FileCheck size={15} className="text-emerald-400 shrink-0" />
                      <span className="truncate">Formulário ANPP (Minuta)</span>
                    </button>
                  </div>
                </div>

                {/* Bloco 3: Procedimentos & Documentos */}
                <div className="pt-1 border-t border-slate-800/80">
                  <p className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-blue-400">Procedimentos & Documentos</p>
                  <div className="space-y-0.5">
                    <button onClick={() => handleSelectModule('OFICIO')} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-bold hover:bg-slate-800 text-slate-200 transition-colors">
                      <Mail size={15} className="text-red-400 shrink-0" />
                      <span className="truncate">Ofício MP</span>
                    </button>
                    <button onClick={() => handleSelectModule('SISDIGITAL')} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-bold hover:bg-slate-800 text-slate-200 transition-colors">
                      <FileText size={15} className="text-blue-400 shrink-0" />
                      <span className="truncate">SISDIGITAL / Notícia de Fato</span>
                    </button>
                    <button onClick={() => handleSelectModule('MULTA_PENAL')} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-bold hover:bg-slate-800 text-slate-200 transition-colors">
                      <Gavel size={15} className="text-purple-400 shrink-0" />
                      <span className="truncate">Multa Penal</span>
                    </button>
                    <button onClick={() => handleSelectModule('DESPACHO_AGENDAMENTO')} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-bold hover:bg-slate-800 text-slate-200 transition-colors">
                      <CalendarClock size={15} className="text-pink-400 shrink-0" />
                      <span className="truncate">Agendamento de Despacho / Oitiva</span>
                    </button>
                    <button onClick={() => handleSelectModule('INTIMACAO_ARQUIVAMENTO')} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-bold hover:bg-slate-800 text-slate-200 transition-colors">
                      <Archive size={15} className="text-orange-400 shrink-0" />
                      <span className="truncate">Notificação de Arquivamento (Art. 28)</span>
                    </button>
                    <button onClick={() => handleSelectModule('PROVIDENCIAS')} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-bold hover:bg-slate-800 text-slate-200 transition-colors">
                      <Scale size={15} className="text-cyan-400 shrink-0" />
                      <span className="truncate">Providências & Certidões</span>
                    </button>
                    <button onClick={() => handleSelectModule('BATALHOES_CONTACTS')} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-bold hover:bg-slate-800 text-slate-200 transition-colors">
                      <Shield size={15} className="text-red-400 shrink-0" />
                      <span className="truncate">Contatos dos Batalhões PMESP</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-3 sm:gap-4 md:gap-6 shrink-0">
        <div className="flex items-center gap-3 group">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">{userName}</p>
            <p className="text-[10px] text-red-500 font-bold tracking-widest uppercase">Oficial de Promotoria</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 shadow-sm transition-all overflow-hidden shrink-0">
            <div className="w-full h-full flex items-center justify-center bg-slate-700 text-slate-400 transition-colors">
              <User size={18} />
            </div>
          </div>
        </div>
        
        <div className="h-6 w-px bg-slate-800"></div>

        <button 
          onClick={onLogout}
          className="p-2 rounded-xl hover:bg-red-950 hover:text-red-400 text-slate-400 transition-all active:scale-95"
          title="Sair do Sistema"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};

export default Header;
