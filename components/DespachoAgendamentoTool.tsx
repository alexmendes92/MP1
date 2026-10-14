
import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Clock, User, Video, MapPin, Copy, CheckCircle, Mail, MessageCircle, CalendarDays } from 'lucide-react';
import { PromotoriaDef, CaseData, Person } from '../types';

interface DespachoAgendamentoToolProps {
  promotorias: PromotoriaDef[];
  caseData?: CaseData;
  people?: Person[];
}

const DespachoAgendamentoTool: React.FC<DespachoAgendamentoToolProps> = ({ promotorias, caseData, people = [] }) => {
  const [formData, setFormData] = useState({
    processo: caseData?.numeroProcesso || '',
    data: caseData?.dataAudiencia ? caseData.dataAudiencia.split('T')[0] : '',
    hora: '',
    tipo: 'Oitiva',
    modalidade: 'Virtual (Teams)',
    interessado: people && people[0] ? people[0].nome : '',
    cargo: caseData?.cargo || '',
    linkTeams: ''
  });

  useEffect(() => {
    if (caseData?.numeroProcesso && !formData.processo) {
      setFormData(prev => ({ ...prev, processo: caseData.numeroProcesso }));
    }
    if (caseData?.cargo && !formData.cargo) {
      setFormData(prev => ({ ...prev, cargo: caseData.cargo }));
    }
    if (caseData?.dataAudiencia && !formData.data) {
      setFormData(prev => ({ ...prev, data: caseData.dataAudiencia.split('T')[0] }));
    }
  }, [caseData]);
  const [copied, setCopied] = useState(false);

  // Derivar Promotor
  const promotorName = useMemo(() => {
    if (!formData.cargo || !formData.data) return "";
    const promotoria = promotorias.find(p => p.label === formData.cargo);
    if (!promotoria) return "";
    const day = parseInt(formData.data.split('-')[2]);
    const entry = promotoria.schedule.find(s => day >= s.start && day <= s.end);
    return entry ? entry.name : promotoria.schedule[0].name;
  }, [formData.cargo, formData.data, promotorias]);

  const generatedInvitation = useMemo(() => {
    const formattedDate = formData.data ? new Date(formData.data).toLocaleDateString('pt-BR') : 'DD/MM/AAAA';
    
    if (formData.modalidade.includes('Virtual')) {
      return `Prezado(a) Sr(a). ${formData.interessado || 'Advogado/Parte'},

Ref.: Agendamento de Despacho - Autos nº ${formData.processo || '________________'}

De ordem do(a) Promotor(a) de Justiça, ${promotorName || 'Dr(a). Promotor'}, confirmamos o agendamento de ${formData.tipo} para a data abaixo:

📅 Data: *${formattedDate}*
⏰ Horário: *${formData.hora || '00:00'}*
💻 Modalidade: *${formData.modalidade}*

🔗 Link de Acesso: ${formData.linkTeams || '[LINK DA REUNIÃO AQUI]'}

Solicitamos a gentileza de confirmar o recebimento e acessar o link com 5 minutos de antecedência.

Atenciosamente,
Oficial de Promotoria
${formData.cargo}`;
    } else {
      return `Prezado(a) Sr(a). ${formData.interessado || 'Advogado/Parte'},

Ref.: Agendamento de Despacho - Autos nº ${formData.processo || '________________'}

De ordem do(a) Promotor(a) de Justiça, ${promotorName || 'Dr(a). Promotor'}, confirmamos o agendamento de ${formData.tipo} presencial para a data abaixo:

📅 Data: *${formattedDate}*
⏰ Horário: *${formData.hora || '00:00'}*
📍 Local: Fórum Criminal da Barra Funda - Av. Dr. Abraão Ribeiro, 313.
🏢 Sala: ${promotorias.find(p => p.label === formData.cargo)?.id || 'Verificar na portaria'}

Solicitamos a gentileza de comparecer com 15 minutos de antecedência munido de documento original com foto.

Atenciosamente,
Oficial de Promotoria
${formData.cargo}`;
    }
  }, [formData, promotorName, promotorias]);

  const generatedCertidao = useMemo(() => {
    const formattedDate = formData.data ? new Date(formData.data).toLocaleDateString('pt-BR') : '___/___/_____';
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000;">
        <h3 style="text-align: center; text-transform: uppercase;">Certidão de Agendamento</h3>
        <br/>
        <p>
          Certifico e dou fé que, nesta data, procedi ao agendamento de <b>${formData.tipo.toUpperCase()}</b> nestes autos digitais (nº ${formData.processo}), para o dia <b>${formattedDate}</b> às <b>${formData.hora} horas</b>, a ser realizada na modalidade <b>${formData.modalidade.toUpperCase()}</b>.
        </p>
        <p>
          Certifico ainda que as partes foram devidamente comunicadas através dos canais de contato constantes nos autos.
        </p>
        <br/>
        <p>São Paulo, ${new Date().toLocaleDateString('pt-BR')}.</p>
        <br/>
        <p>Eu, _________________, Oficial de Promotoria, digitei.</p>
      </div>
    `;
  }, [formData]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const inputClass = "w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all placeholder-slate-600";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      
      {/* Sidebar Inputs */}
      <div className="w-[400px] bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6 shadow-2xl z-10 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-600 rounded-lg text-white"><CalendarClock size={20} /></div>
          <div>
            <h2 className="font-bold uppercase tracking-tight text-white">Agendamento</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Despachos & Oitivas</p>
          </div>
        </div>

        <div className="space-y-4">
            <div><label className={labelClass}>Processo</label><input type="text" value={formData.processo} onChange={e => setFormData({...formData, processo: e.target.value})} className={inputClass} placeholder="0000000-00.0000..." /></div>
            
            <div><label className={labelClass}>Cargo / Promotor</label><select value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})} className={inputClass}><option value="">Selecione...</option>{promotorias.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}</select></div>

            <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass}>Data</label><input type="date" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Hora</label><input type="time" value={formData.hora} onChange={e => setFormData({...formData, hora: e.target.value})} className={inputClass} /></div>
            </div>

            <div><label className={labelClass}>Interessado (Nome)</label><input type="text" value={formData.interessado} onChange={e => setFormData({...formData, interessado: e.target.value})} className={inputClass} placeholder="Dr. Advogado ou Parte" /></div>

            <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass}>Tipo</label><select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})} className={inputClass}><option>Oitiva</option><option>Acordo ANPP</option><option>Reunião</option><option>Despacho</option></select></div>
                <div><label className={labelClass}>Modalidade</label><select value={formData.modalidade} onChange={e => setFormData({...formData, modalidade: e.target.value})} className={inputClass}><option>Virtual (Teams)</option><option>Presencial</option></select></div>
            </div>

            {formData.modalidade.includes('Virtual') && (
                <div className="animate-in slide-in-from-top-2">
                    <label className={labelClass}>Link do Teams</label>
                    <input type="text" value={formData.linkTeams} onChange={e => setFormData({...formData, linkTeams: e.target.value})} className={inputClass} placeholder="https://teams.microsoft.com/..." />
                </div>
            )}
        </div>
      </div>

      {/* Main Content - Preview */}
      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-slate-950 flex flex-col items-center gap-8">
         
         {/* Convite Card */}
         <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative group">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase text-xs tracking-widest"><Mail size={16}/> Modelo de Convite (E-mail/Zap)</div>
                <button onClick={() => handleCopy(generatedInvitation)} className="text-slate-400 hover:text-white transition-colors"><Copy size={16}/></button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-300 leading-relaxed">{generatedInvitation}</pre>
         </div>

         {/* Certidão Card */}
         <div className="w-full max-w-3xl bg-white text-black rounded-sm shadow-2xl p-12 min-h-[400px] relative">
            <div className="absolute top-4 right-4 no-print flex gap-2">
                <button onClick={() => { const el = document.createElement('div'); el.innerHTML = generatedCertidao; handleCopy(el.innerText); }} className="bg-slate-100 hover:bg-slate-200 p-2 rounded text-slate-600"><Copy size={16}/></button>
            </div>
            <div dangerouslySetInnerHTML={{ __html: generatedCertidao }} />
         </div>

      </div>
    </div>
  );
};

const CalendarClock = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M18 22a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M18 16v2.5l1.5 1.5"/></svg>
);

export default DespachoAgendamentoTool;
