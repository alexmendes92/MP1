import React, { useState, useMemo, useEffect } from 'react';
import { PromotoriaDef, CaseData, Person } from '../types';
import { FileCheck, CheckCircle, RotateCcw, Printer, FileText, ChevronRight, ChevronLeft, User } from 'lucide-react';
import Logo from './Logo';

interface AnppToolProps {
  promotorias: PromotoriaDef[];
  caseData?: CaseData;
  people?: Person[];
}

const AnppTool: React.FC<AnppToolProps> = ({ promotorias, caseData, people = [] }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(() => {
    const initialPartes = Array(8).fill(null).map((_, idx) => {
      if (people && people[idx]) {
        const p = people[idx];
        return {
          nome: p.nome || '',
          endereco: p.endereco || '',
          contato: p.telefone || p.email || ''
        };
      }
      return { nome: '', endereco: '', contato: '' };
    });

    return {
      processo: caseData?.numeroProcesso || '',
      tipo: 'Digital',
      cargo: caseData?.cargo || '',
      prazoDefesa: '60',
      tipoAnpp: 'minuta',
      observacao: '',
      contatosVitima: '',
      partes: initialPartes
    };
  });

  useEffect(() => {
    if (caseData?.numeroProcesso && !formData.processo) {
      setFormData(prev => ({ ...prev, processo: caseData.numeroProcesso }));
    }
    if (caseData?.cargo && !formData.cargo) {
      setFormData(prev => ({ ...prev, cargo: caseData.cargo }));
    }
  }, [caseData]);
  const [copied, setCopied] = useState(false);

  const selectedPromotoria = useMemo(() => 
    promotorias.find(p => p.label === formData.cargo), [formData.cargo, promotorias]);

  const promotorName = useMemo(() => {
    if (!selectedPromotoria || selectedPromotoria.schedule.length === 0) return "";
    return selectedPromotoria.schedule[0].name;
  }, [selectedPromotoria]);

  const cargoNumero = useMemo(() => {
    const match = formData.cargo.match(/\d+/);
    return match ? match[0] : "";
  }, [formData.cargo]);

  const handlePartChange = (index: number, field: string, value: string) => {
    const newPartes = [...formData.partes];
    newPartes[index] = { ...newPartes[index], [field]: value };
    setFormData({ ...formData, partes: newPartes });
  };

  const handlePrint = () => {
    window.print();
  };

  const filledPartes = useMemo(() => {
    return formData.partes.filter(p => p.nome.trim() !== '');
  }, [formData.partes]);

  const CheckBox = ({ checked, label }: { checked: boolean, label: string }) => (
    <div className="flex items-center gap-1.5 mr-4">
      <div className={`w-4 h-4 border border-black flex items-center justify-center text-[10px] ${checked ? 'bg-black text-white' : 'bg-white'}`}>
        {checked ? 'X' : ''}
      </div>
      <span className="uppercase text-[9pt]">{label}</span>
    </div>
  );

  const generatedContent = useMemo(() => (
    <div id="printable-anpp" className="bg-white text-black p-0 printable-area" style={{ fontFamily: '"Arial", sans-serif', width: '100%', minHeight: '297mm', boxSizing: 'border-box' }}>
      <div className="flex items-start justify-between border-b-[3px] border-black pb-4 mb-6">
        <div className="flex items-center gap-5">
           <Logo className="h-14" />
           <div className="flex flex-col">
             <span className="text-[14pt] font-black leading-none tracking-tight">MINISTÉRIO PÚBLICO</span>
             <span className="text-[10pt] font-medium tracking-widest uppercase mt-1">Do Estado de São Paulo</span>
             <span className="text-[9pt] font-bold text-gray-600 mt-1">4ª Promotoria de Justiça Criminal da Capital</span>
           </div>
        </div>
        <div className="flex flex-col items-end justify-center h-full pt-1">
          <div className="bg-black text-white px-3 py-1 font-bold text-[9pt] uppercase tracking-widest mb-1">
            SAAf - Apoio à Atividade Fim
          </div>
          <span className="text-[8pt] font-bold uppercase text-gray-500">Formulário de Solicitação</span>
        </div>
      </div>

      <h2 className="text-center font-black text-[16pt] uppercase tracking-wide mb-6 border-2 border-black py-2 bg-gray-100">
        Solicitação de Acordo de Não Persecução Penal
      </h2>

      <table className="w-full border-collapse border border-black text-[10pt] mb-6">
        <tbody>
          <tr>
            <td className="w-[15%] bg-gray-200 font-bold p-2 border border-black uppercase text-[8pt]">Nº Autos</td>
            <td className="w-[45%] p-2 border border-black font-bold text-[11pt] uppercase">{formData.processo || '___'}</td>
            <td className="w-[10%] bg-gray-200 font-bold p-2 border border-black uppercase text-[8pt]">Formato</td>
            <td className="w-[30%] p-2 border border-black">
              <div className="flex"><CheckBox checked={formData.tipo === 'Físico'} label="Físico" /><CheckBox checked={formData.tipo === 'Digital'} label="Digital" /></div>
            </td>
          </tr>
          <tr>
            <td className="bg-gray-200 font-bold p-2 border border-black uppercase text-[8pt]">Promotor</td>
            <td colSpan={3} className="p-2 border border-black font-bold text-[11pt] uppercase">{promotorName || '___'}</td>
          </tr>
        </tbody>
      </table>

      <div className="mb-6">
        <div className="bg-black text-white font-bold text-[9pt] uppercase px-2 py-1 flex justify-between">
           <span>Dados dos Imputados / Investigados</span>
           <span>Total: {filledPartes.length || 1}</span>
        </div>
        <table className="w-full border-collapse border border-black text-[10pt]">
          <tbody>
             {(filledPartes.length > 0 ? filledPartes : [formData.partes[0]]).map((p, i) => (
                <tr key={i} className="border-t border-black">
                     <td className="w-[40px] bg-gray-300 text-center font-bold border-r border-black">{i + 1}</td>
                     <td className="p-2 uppercase"><b>{p.nome || '___'}</b><br/>{p.endereco || '___'}<br/>{p.contato || '___'}</td>
                </tr>
             ))}
          </tbody>
        </table>
      </div>
    </div>
  ), [formData, promotorName, cargoNumero, filledPartes]);

  const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all placeholder-slate-500 text-slate-100";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-anpp, #printable-anpp * { visibility: visible !important; }
          #printable-anpp { position: fixed !important; left: 0; top: 0; width: 210mm; height: 297mm; background: white; z-index: 9999; padding: 15mm; }
          .no-print { display: none !important; }
        }
      `}</style>
      
      <div className="w-[420px] bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-4 shadow-xl z-10 overflow-y-auto custom-scrollbar no-print">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-600 rounded-lg text-white"><FileCheck size={20} /></div>
          <div>
            <h2 className="font-bold uppercase tracking-tight text-slate-100">ANPP - SAAf</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Solicitação de Acordo</p>
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
               {['Digital', 'Físico'].map(t => (
                 <button key={t} onClick={() => setFormData({...formData, tipo: t})} className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${formData.tipo === t ? 'bg-slate-800 text-green-400' : 'text-slate-500'}`}>{t}</button>
               ))}
            </div>
            <input type="text" value={formData.processo} onChange={(e) => setFormData({...formData, processo: e.target.value})} placeholder="Processo nº" className={inputClass} />
            <select value={formData.cargo} onChange={(e) => setFormData({...formData, cargo: e.target.value})} className={inputClass}>
              <option value="">Selecione o Cargo...</option>
              {promotorias.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
            </select>
            <button onClick={() => setStep(2)} className="w-full bg-slate-100 text-slate-900 py-3 rounded-xl font-bold uppercase text-xs tracking-widest mt-2 flex items-center justify-center gap-2">Próximo Passo <ChevronRight size={16}/></button>
          </div>
        ) : (
          <div className="space-y-4">
            <button onClick={() => setStep(1)} className="text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase flex items-center gap-1 mb-2"><ChevronLeft size={12}/> Dados Iniciais</button>
            <div className="space-y-3">
              {formData.partes.slice(0, 3).map((part, idx) => (
                <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <input type="text" placeholder="Nome Completo" value={part.nome} onChange={(e) => handlePartChange(idx, 'nome', e.target.value)} className={inputClass} />
                  <input type="text" placeholder="Endereço" value={part.endereco} onChange={(e) => handlePartChange(idx, 'endereco', e.target.value)} className={inputClass} />
                </div>
              ))}
            </div>
            <button onClick={handlePrint} className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-green-900/40 flex items-center justify-center gap-2"><Printer size={16} /> Imprimir Formulário</button>
          </div>
        )}
      </div>

      <div className="flex-1 bg-slate-950 p-8 overflow-y-auto flex flex-col items-center custom-scrollbar">
        <div className="w-full max-w-[210mm] bg-white shadow-2xl p-[15mm] transform scale-90 origin-top">
          {generatedContent}
        </div>
      </div>
    </div>
  );
};

export default AnppTool;