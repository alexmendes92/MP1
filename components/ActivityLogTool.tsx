
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Activity, PromotoriaDef, ACTIVITY_TYPES, ACTIVITY_STATUSES, ActivityStatus } from '../types';
import { ListTodo, Plus, Trash2, Search, Pencil, Check, Save, Loader2, Sparkles, LayoutGrid, CalendarDays, Inbox, MessageSquare, Copy, LayoutList, X, Table as TableIcon, List, BrainCircuit, UserRound } from 'lucide-react';

// MOCK DATA FOR LOCAL STORAGE
const MOCK_ACTIVITIES: Activity[] = [
    {
        id: '1',
        numeroProcesso: '1500000-00.2024.8.26.0050',
        data: new Date().toISOString().split('T')[0],
        status: 'PENDENTE',
        tipo: 'Multa Penal',
        cargo: '79º Promotor de Justiça',
        promotor: 'Margareth Ferraz França',
        observacao: 'Verificar cálculo da multa.'
    }
];

interface ActivityLogToolProps {
  onOpenActivity: (activity: Activity) => void;
  onAnalyzeActivity: (activity: Activity) => void;
  promotorias: PromotoriaDef[];
}

const ActivityLogTool: React.FC<ActivityLogToolProps> = ({ onOpenActivity, onAnalyzeActivity, promotorias }) => {
  const [activities, setActivities] = useState<Activity[]>(MOCK_ACTIVITIES);
  const [isLoading, setIsLoading] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState<Omit<Activity, 'id' | 'promotor'>>({
    numeroProcesso: '',
    data: new Date().toISOString().split('T')[0],
    status: 'NAO_VERIFICADO',
    tipo: '',
    cargo: '',
    observacao: ''
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCargo, setFilterCargo] = useState<string>('ALL');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedProcessoId, setCopiedProcessoId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID' | 'TABLE'>('LIST');
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatText, setChatText] = useState('');
  const [isProcessingChat, setIsProcessingChat] = useState(false);

  // LÓGICA PARA PUXAR DADOS DO NOME (PROMOTOR)
  const currentPromotorName = useMemo(() => {
    if (!formData.cargo || !formData.data) return "Selecione Cargo e Data";
    const promotoria = promotorias.find(p => p.label === formData.cargo);
    if (!promotoria) return "Cargo não encontrado";
    
    const day = parseInt(formData.data.split('-')[2]);
    const entry = promotoria.schedule.find(s => day >= s.start && day <= s.end);
    
    return entry ? entry.name : promotoria.schedule[0].name;
  }, [formData.cargo, formData.data, promotorias]);

  const getTypeBadgeStyles = (tipo: string) => {
    if (tipo === 'Multa Penal') return 'bg-purple-900/30 text-purple-400 border-purple-800/50';
    if (tipo === 'Pesquisa de NI') return 'bg-amber-900/30 text-amber-400 border-amber-800/50';
    if (tipo === 'Ofício') return 'bg-red-900/30 text-red-400 border-red-800/50';
    if (tipo.includes('ANPP')) return 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50';
    if (tipo === 'Notícia de Fato') return 'bg-indigo-900/30 text-indigo-400 border-indigo-800/50';
    if (tipo.includes('Notificação')) return 'bg-orange-900/30 text-orange-400 border-orange-800/50';
    return 'bg-slate-800 text-slate-400 border-slate-700';
  };

  const getStatusDef = (statusValue: ActivityStatus) => {
    return ACTIVITY_STATUSES.find(s => s.value === statusValue) || ACTIVITY_STATUSES[0];
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value as any }));
  };

  const handleResetForm = () => {
    setFormData({ numeroProcesso: '', data: new Date().toISOString().split('T')[0], status: 'NAO_VERIFICADO', tipo: '', cargo: '', observacao: '' });
    setEditingId(null);
  };

  const handleSaveActivity = () => {
    if (!formData.numeroProcesso || !formData.data || !formData.status || !formData.tipo || !formData.cargo) return alert("Preencha todos os campos obrigatórios.");
    
    const newActivity: Activity = {
        id: editingId || crypto.randomUUID(),
        ...formData,
        promotor: currentPromotorName // Puxa o nome dinamicamente calculado
    };

    if (editingId) {
        setActivities(prev => prev.map(a => a.id === editingId ? newActivity : a));
    } else {
        setActivities(prev => [newActivity, ...prev]);
    }
    
    handleResetForm();
  };

  const handleEdit = (activity: Activity) => {
    setIsChatMode(false);
    setFormData({ numeroProcesso: activity.numeroProcesso, data: activity.data, status: activity.status, tipo: activity.tipo, cargo: activity.cargo, observacao: activity.observacao || '' });
    setEditingId(activity.id);
    if (sidebarRef.current) sidebarRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  const handleCopyProcesso = (processo: string, id: string) => {
    navigator.clipboard.writeText(processo).then(() => {
        setCopiedProcessoId(id);
        setTimeout(() => setCopiedProcessoId(null), 2000);
    });
  };

  const filteredActivities = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return activities.filter(act => {
        const matchesSearch = (act.numeroProcesso || '').toLowerCase().includes(term) || (act.tipo || '').toLowerCase().includes(term) || (act.observacao || '').toLowerCase().includes(term);
        const matchesStatus = filterStatus === 'ALL' || act.status === filterStatus;
        const matchesType = filterType === 'ALL' || act.tipo === filterType;
        const matchesCargo = filterCargo === 'ALL' || act.cargo === filterCargo;
        return matchesSearch && matchesStatus && matchesType && matchesCargo;
    });
  }, [activities, searchTerm, filterStatus, filterType, filterCargo]);

  const metrics = useMemo(() => {
    const total = activities.length;
    const completed = activities.filter(a => a.status === 'CONCLUIDO' || a.status === 'FINALIZADO').length;
    return { total, completed, pending: total - completed, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [activities]);

  const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all placeholder-slate-500 text-slate-100";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 relative bg-slate-950">
      {/* Sidebar Form */}
      <div ref={sidebarRef} className={`w-full md:w-[420px] bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6 shadow-2xl z-20 overflow-y-auto custom-scrollbar transition-all duration-300 ${editingId ? 'ring-1 ring-inset ring-amber-500/20 bg-amber-950/5' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg text-white transition-all duration-500 ${editingId ? 'bg-amber-600' : isChatMode ? 'bg-indigo-600' : 'bg-teal-600'}`}>
              {editingId ? <Pencil size={20} /> : isChatMode ? <MessageSquare size={20} /> : <ListTodo size={20} />}
            </div>
            <div>
              <h2 className={`font-bold uppercase tracking-tight ${editingId ? 'text-amber-500' : 'text-slate-100'}`}>
                  {editingId ? 'Editando Tarefa' : isChatMode ? 'Importar' : 'Atividades'}
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Painel Operacional</p>
            </div>
          </div>
          {editingId && (
            <button onClick={handleResetForm} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        {!isChatMode ? (
          <div className="space-y-4">
            <div><label className={labelClass}>Processo</label><input type="text" name="numeroProcesso" value={formData.numeroProcesso} onChange={handleChange} className={inputClass} placeholder="0000000-00..." /></div>
            
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Data</label><input type="date" name="data" value={formData.data} onChange={handleChange} className={inputClass} /></div>
              <div><label className={labelClass}>Status</label><select name="status" value={formData.status} onChange={handleChange} className={inputClass}>{ACTIVITY_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
            </div>

            <div><label className={labelClass}>Cargo</label><select name="cargo" value={formData.cargo} onChange={handleChange} className={inputClass}><option value="">Selecione o Cargo</option>{promotorias.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}</select></div>
            
            {/* CAMPO QUE PUXA O NOME AUTOMATICAMENTE */}
            <div className="p-4 bg-teal-950/20 border border-teal-800/50 rounded-xl flex items-center gap-3">
                <UserRound size={18} className="text-teal-500" />
                <div>
                   <p className="text-[9px] font-bold text-teal-600 uppercase tracking-widest">Promotor em Exercício</p>
                   <p className="text-sm font-black text-slate-100 uppercase">{currentPromotorName}</p>
                </div>
            </div>

            <div><label className={labelClass}>Tipo de Atividade</label><select name="tipo" value={formData.tipo} onChange={handleChange} className={inputClass}><option value="">Selecione o Tipo</option>{ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            
            <div><label className={labelClass}>Observações</label><textarea name="observacao" value={formData.observacao} onChange={handleChange} className={`${inputClass} h-24 resize-none`} placeholder="Notas..." /></div>
            
            <button onClick={handleSaveActivity} className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 ${editingId ? 'bg-amber-600 text-white shadow-amber-900/40 hover:bg-amber-500' : 'bg-teal-600 text-white shadow-teal-900/40 hover:bg-teal-500'}`}>
                {editingId ? <Save size={18} /> : <Plus size={18} />} {editingId ? 'Salvar Alterações' : 'Adicionar Tarefa'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="p-4 bg-indigo-950/30 rounded-xl border border-indigo-900/50 text-xs text-indigo-300 italic">Cole aqui o texto ou cota para extração inteligente.</div>
             <textarea value={chatText} onChange={(e) => setChatText(e.target.value)} className={`${inputClass} h-48`} placeholder="Texto da conversa..." />
             <button disabled={isProcessingChat || !chatText} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">{isProcessingChat ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Iniciar IA</button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto flex flex-col custom-scrollbar">
        <div className="max-w-6xl w-full mx-auto space-y-6">
          
          {/* Metrics */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Geral</p>
                <span className="text-3xl font-black text-slate-100">{metrics.total}</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-teal-500">{metrics.rate}%</span>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Concluídas</p>
              </div>
            </div>
            <div className="flex gap-2">
               <div className="bg-slate-900 px-8 py-5 rounded-3xl border border-slate-800 flex flex-col justify-center">
                  <span className="text-2xl font-black text-amber-500">{metrics.pending}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pendentes</span>
               </div>
               <div className="bg-slate-900 px-8 py-5 rounded-3xl border border-slate-800 flex flex-col justify-center">
                  <span className="text-2xl font-black text-teal-500">{metrics.completed}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Finais</span>
               </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col lg:flex-row gap-4 shadow-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input type="text" placeholder="Filtrar por processo ou tipo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 text-slate-100" />
            </div>
            <div className="flex items-center gap-2">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-[10px] font-bold text-slate-300 outline-none">
                <option value="ALL">TODOS STATUS</option>
                {ACTIVITY_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label.toUpperCase()}</option>)}
              </select>
              
              <div className="h-10 w-px bg-slate-800 mx-1"></div>
              
              <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button onClick={() => setViewMode('LIST')} className={`p-2 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-slate-700 text-teal-400 shadow-md' : 'text-slate-500 hover:text-slate-300'}`} title="Lista"><List size={18}/></button>
                <button onClick={() => setViewMode('GRID')} className={`p-2 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-slate-700 text-teal-400 shadow-md' : 'text-slate-500 hover:text-slate-300'}`} title="Grade"><LayoutGrid size={18}/></button>
                <button onClick={() => setViewMode('TABLE')} className={`p-2 rounded-lg transition-all ${viewMode === 'TABLE' ? 'bg-slate-700 text-teal-400 shadow-md' : 'text-slate-500 hover:text-slate-300'}`} title="Tabela"><TableIcon size={18}/></button>
              </div>
            </div>
          </div>

          {/* Activities Content */}
          <div className="animate-in fade-in duration-700">
            {filteredActivities.length === 0 ? (
              <div className="py-32 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600">
                <Inbox size={48} className="mb-4 opacity-20" />
                <p className="font-bold text-xs uppercase tracking-widest">Nenhuma tarefa encontrada</p>
              </div>
            ) : viewMode === 'TABLE' ? (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Processo</th>
                      <th className="px-6 py-4">Atividade</th>
                      <th className="px-6 py-4">Cargo / Promotor</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredActivities.map(act => {
                      const status = getStatusDef(act.status);
                      const badgeStyles = getTypeBadgeStyles(act.tipo);
                      return (
                        <tr key={act.id} className={`hover:bg-slate-800/50 transition-colors group ${editingId === act.id ? 'bg-amber-900/10' : ''}`}>
                          <td className="px-6 py-4 text-xs font-bold text-slate-400">{new Date(act.data).toLocaleDateString('pt-BR')}</td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-2">
                               <span className="text-sm font-black text-slate-100">{act.numeroProcesso || '-'}</span>
                               <button onClick={() => handleCopyProcesso(act.numeroProcesso, act.id)} className="text-slate-600 hover:text-teal-400 opacity-0 group-hover:opacity-100 transition-all"><Copy size={14}/></button>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${badgeStyles}`}>
                               {act.tipo}
                             </span>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex flex-col">
                               <span className="text-[10px] font-bold text-slate-300 uppercase truncate max-w-[150px]">{act.cargo}</span>
                               <span className="text-[9px] text-slate-500 font-bold uppercase">{act.promotor.split(' ')[0]}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${status.colorClass.bg} ${status.colorClass.text} opacity-90`}>
                               {status.label}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                               <button 
                                  onClick={() => onAnalyzeActivity(act)} 
                                  className="p-2 bg-violet-900/20 text-violet-400 hover:bg-violet-600 hover:text-white rounded-lg border border-violet-900/50 transition-all" 
                                  title="Analisar com IA"
                                >
                                  <BrainCircuit size={16}/>
                                </button>
                                <button onClick={() => handleEdit(act)} className="p-2 text-slate-400 hover:text-amber-500"><Pencil size={16}/></button>
                                <button onClick={() => handleDelete(act.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                             </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={`grid gap-6 ${viewMode === 'GRID' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                {filteredActivities.map(act => {
                  const status = getStatusDef(act.status);
                  const badgeStyles = getTypeBadgeStyles(act.tipo);
                  const isEditingThis = editingId === act.id;
                  
                  return (
                    <div key={act.id} className={`bg-slate-900 rounded-3xl border border-slate-800 shadow-xl group hover:shadow-2xl transition-all relative flex flex-col ${isEditingThis ? 'ring-2 ring-amber-500 z-10 scale-[1.02] bg-slate-800' : ''}`}>
                      {/* Header */}
                      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-500">
                          <CalendarDays size={16} />
                          <span className="text-xs font-bold">{new Date(act.data).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${status.colorClass.bg} ${status.colorClass.text} opacity-90 shadow-sm ml-4 whitespace-nowrap`}>
                          {status.label}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="p-6 flex-1 flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                           <div className="flex items-center gap-2">
                             <span className={`inline-flex px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${badgeStyles}`}>
                               {act.tipo}
                             </span>
                             {isEditingThis && <span className="bg-amber-600 text-white text-[9px] font-black px-2 py-0.5 rounded animate-pulse">Editando</span>}
                           </div>
                           <div className="flex items-center justify-between group/proc">
                             <h3 className="font-black text-slate-100 text-lg truncate pr-8">{act.numeroProcesso || "Sem Número"}</h3>
                             <button onClick={() => handleCopyProcesso(act.numeroProcesso, act.id)} className={`p-2 rounded-lg transition-all ${copiedProcessoId === act.id ? 'text-teal-400' : 'text-slate-600 hover:text-slate-300 opacity-0 group-hover/proc:opacity-100'}`}>
                                {copiedProcessoId === act.id ? <Check size={16} /> : <Copy size={16} />}
                             </button>
                           </div>
                        </div>

                        <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800/50 min-h-[80px]">
                          <p className="text-sm text-slate-400 italic leading-relaxed line-clamp-3">"{act.observacao || "Sem notas adicionais."}"</p>
                        </div>

                        <div className="mt-auto pt-4 border-t border-slate-800 flex items-center justify-between">
                           <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest truncate max-w-[160px]">
                              <LayoutList size={14} />
                              <span className="truncate">{act.cargo}</span>
                           </div>
                           <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-400">
                                 {act.promotor ? act.promotor.charAt(0) : '?'}
                              </div>
                              <span className="text-[10px] font-black text-slate-300 uppercase">{act.promotor.split(' ')[0]}</span>
                           </div>
                        </div>
                      </div>

                      {/* Floating Actions - Moved to avoid overlap with status badge */}
                      <div className="absolute top-[80px] right-6 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                         <button 
                            onClick={() => onAnalyzeActivity(act)} 
                            className="p-2 bg-violet-600 text-white hover:bg-violet-500 rounded-xl shadow-lg shadow-violet-900/40 border border-violet-500 transition-all transform hover:scale-105" 
                            title="Analisar com IA"
                         >
                           <BrainCircuit size={16}/>
                         </button>
                         <button onClick={() => handleEdit(act)} className="p-2 bg-slate-800 text-slate-300 hover:bg-amber-600 hover:text-white rounded-xl shadow-lg border border-slate-700 transition-all"><Pencil size={16}/></button>
                         <button onClick={() => handleDelete(act.id)} className="p-2 bg-slate-800 text-slate-300 hover:bg-red-600 hover:text-white rounded-xl shadow-lg border border-slate-700 transition-all"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogTool;
