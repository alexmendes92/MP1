import React, { useState, useMemo, useEffect } from 'react';
import { PromotoriaDef, CaseData } from '../types';
import { FileText, Copy, CheckCircle, MessageSquare, FilePlus } from 'lucide-react';

interface SisDigitalToolProps {
  promotorias: PromotoriaDef[];
  caseData?: CaseData;
  onUpdateCaseData?: (updates: Partial<CaseData>) => void;
}

const SisDigitalTool: React.FC<SisDigitalToolProps> = ({ promotorias, caseData, onUpdateCaseData }) => {
  const [cargo, setCargo] = useState(() => caseData?.cargo || '');
  const [docId, setDocId] = useState(() => caseData?.numeroProcesso || '');
  const [tipoDoc, setTipoDoc] = useState<'NF' | 'ATENDIMENTO'>('NF');
  const [termoType, setTermoType] = useState<'CONCLUSAO' | 'JUNTADA'>('CONCLUSAO');

  useEffect(() => {
    if (caseData?.numeroProcesso && !docId) {
      setDocId(caseData.numeroProcesso);
    }
    if (caseData?.cargo && !cargo) {
      setCargo(caseData.cargo);
    }
  }, [caseData]);
  
  const [docJuntado, setDocJuntado] = useState('');
  const [folhas, setFolhas] = useState('');

  const [copiedTermo, setCopiedTermo] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  const selectedPromotoria = useMemo(() => 
    promotorias.find(p => p.label === cargo), [cargo, promotorias]);

  const promotorName = useMemo(() => {
    if (!selectedPromotoria || selectedPromotoria.schedule.length === 0) return "";
    return selectedPromotoria.schedule[0].name;
  }, [selectedPromotoria]);

  const cortesia = useMemo(() => {
    if (!selectedPromotoria || selectedPromotoria.schedule.length === 0) return "Dr(a).";
    return selectedPromotoria.schedule[0].gender === 'F' ? 'Dra.' : 'Dr.';
  }, [selectedPromotoria]);

  const cargoNumero = useMemo(() => {
    const match = cargo.match(/\d+/);
    return match ? match[0] : "";
  }, [cargo]);

  const docLabel = tipoDoc === 'NF' ? 'Notícia de Fato' : 'Atendimento';
  const docAbbr = tipoDoc === 'NF' ? 'N.F' : 'Atendimento';

  const termoConclusaoContent = useMemo(() => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.5; color: #000;">
      <p style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 20px;">TERMO DE CONCLUSÃO</p>
      <p>${docLabel} n° ${docId || '____._______/____'}.</p>
      <p>Cargo: ${cargoNumero || '____'}° Promotor de Justiça Criminal da Capital</p>
      <br>
      <p>Na data infra, eu, Alex Santana Mendes (assinatura eletrônica), Oficial de Promotoria, Matrícula 012078, faço estes autos conclusos ao(à) ${cortesia} <b>${promotorName || '________________'}</b>.</p>
    </div>
  `, [docId, cargoNumero, cortesia, promotorName, docLabel]);
  
  const termoJuntadaContent = useMemo(() => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.5; color: #000;">
      <p style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 20px;">TERMO DE JUNTADA</p>
      <p>${docLabel} n° ${docId || '____._______/____'}.</p>
      <p>Cargo: ${cargoNumero || '____'}° Promotor de Justiça Criminal da Capital</p>
      <br>
      <p>Nesta data, procedo à juntada do(a) <b>${docJuntado || '________________'}</b>, referente às fls. <b>${folhas || '____'}</b>.</p>
      <br>
      <p>São Paulo, data infra.</p>
      <br><br>
      <p>Alex Santana Mendes (assinatura eletrônica)<br>Oficial de Promotoria<br>Matrícula 012078</p>
    </div>
  `, [docId, cargoNumero, docLabel, docJuntado, folhas]);

  const prosecutorMsg = useMemo(() => {
    const firstName = promotorName ? promotorName.split(' ')[0] : 'Promotor(a)';
    return `${cortesia} ${firstName}, apenas para informar que foi aberto conclusão para análise na ${docAbbr} ${docId || '____._______/____'}`;
  }, [promotorName, cortesia, docAbbr, docId]);

  const handleCopyTermo = () => {
    const contentToCopy = termoType === 'CONCLUSAO' ? termoConclusaoContent : termoJuntadaContent;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contentToCopy;
    const plainText = tempDiv.innerText;
    
    const htmlBlob = new Blob([contentToCopy], { type: 'text/html' });
    const textBlob = new Blob([plainText], { type: 'text/plain' });
    
    navigator.clipboard.write([
      new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })
    ]).then(() => {
      setCopiedTermo(true);
      setTimeout(() => setCopiedTermo(false), 2000);
    });
  };

  const handleCopyMsg = () => {
    navigator.clipboard.writeText(prosecutorMsg).then(() => {
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    });
  };

  const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all placeholder-slate-500 text-slate-100";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      <div className="w-[380px] bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6 shadow-xl z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white"><FileText size={20} /></div>
          <div>
            <h2 className="font-bold uppercase tracking-tight text-slate-100">SISDIGITAL</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Gerador de Termos</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Tipo de Termo</label>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button 
                onClick={() => setTermoType('CONCLUSAO')}
                className={`flex items-center justify-center gap-2 flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${termoType === 'CONCLUSAO' ? 'bg-slate-800 shadow-sm text-blue-400' : 'text-slate-500'}`}
              >
                <FileText size={12}/> Conclusão
              </button>
              <button 
                onClick={() => setTermoType('JUNTADA')}
                className={`flex items-center justify-center gap-2 flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${termoType === 'JUNTADA' ? 'bg-slate-800 shadow-sm text-blue-400' : 'text-slate-500'}`}
              >
                <FilePlus size={12}/> Juntada
              </button>
            </div>
          </div>
          
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button 
              onClick={() => setTipoDoc('NF')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${tipoDoc === 'NF' ? 'bg-slate-800 shadow-sm text-blue-400' : 'text-slate-500'}`}
            >
              Notícia de Fato
            </button>
            <button 
              onClick={() => setTipoDoc('ATENDIMENTO')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${tipoDoc === 'ATENDIMENTO' ? 'bg-slate-800 shadow-sm text-blue-400' : 'text-slate-500'}`}
            >
              Atendimento
            </button>
          </div>

          <div>
            <label className={labelClass}>{tipoDoc === 'NF' ? 'Notícia de Fato nº' : 'Atendimento nº'}</label>
            <input 
              type="text" 
              value={docId} 
              onChange={(e) => setDocId(e.target.value)}
              placeholder="0000.0000000/0000"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Cargo</label>
            <select 
              value={cargo} 
              onChange={(e) => setCargo(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecione o Cargo</option>
              {promotorias.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
            </select>
          </div>
          
          {termoType === 'JUNTADA' && (
            <div className="space-y-4 pt-2 border-t border-slate-800 animate-in fade-in duration-300">
               <div>
                <label className={labelClass}>Documento Juntado</label>
                <input 
                  type="text" 
                  value={docJuntado} 
                  onChange={(e) => setDocJuntado(e.target.value)}
                  placeholder="Ex: Ofício da Polícia Civil, E-mail..."
                  className={inputClass}
                />
              </div>
               <div>
                <label className={labelClass}>Folhas</label>
                <input 
                  type="text" 
                  value={folhas} 
                  onChange={(e) => setFolhas(e.target.value)}
                  placeholder="Ex: 25-27"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {termoType === 'CONCLUSAO' && (
            <div className="pt-4 animate-in fade-in duration-300">
               <div className="p-4 bg-blue-900/10 border border-blue-900/30 rounded-xl">
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Destinatário</p>
                  <p className="text-sm font-bold text-slate-200 uppercase">{promotorName || "Selecione um cargo..."}</p>
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-slate-950 p-10 overflow-y-auto flex flex-col items-center gap-8 custom-scrollbar">
        {/* Document Card */}
        <div className="w-full max-w-[800px] bg-white shadow-2xl rounded-sm p-16 min-h-[500px] relative">
          <div dangerouslySetInnerHTML={{ __html: termoType === 'CONCLUSAO' ? termoConclusaoContent : termoJuntadaContent }} />
          
          <button 
            onClick={handleCopyTermo}
            className={`absolute top-6 right-6 px-6 py-2.5 rounded-lg shadow-md flex items-center gap-2 font-bold transition-all ${copiedTermo ? 'bg-green-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-900'}`}
          >
            {copiedTermo ? <CheckCircle size={18} /> : <Copy size={18} />}
            {copiedTermo ? 'Copiado!' : 'Copiar Termo'}
          </button>
        </div>

        {/* Prosecutor Message Card */}
        <div className={`w-full max-w-[800px] bg-slate-900 shadow-lg border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300 ${termoType === 'JUNTADA' ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-blue-500" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Mensagem para o Promotor</span>
            </div>
            <button 
              onClick={handleCopyMsg}
              disabled={termoType === 'JUNTADA'}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${copiedMsg ? 'bg-green-900/40 text-green-400 border border-green-900/50' : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-800'}`}
            >
              {copiedMsg ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copiedMsg ? 'Mensagem Copiada!' : 'Copiar Mensagem'}
            </button>
          </div>
          
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-400 text-sm leading-relaxed italic">
            "{prosecutorMsg}"
          </div>
        </div>
      </div>
    </div>
  );
};

export default SisDigitalTool;