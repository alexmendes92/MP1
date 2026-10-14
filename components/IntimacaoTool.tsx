import React, { useState, useMemo, useEffect } from 'react';
import { Person, CaseData, PromotoriaDef } from '../types';
import { Send, Mail, Truck, MessageCircle, Printer, MapPin, Copy, CheckCircle, User, AlertCircle, Briefcase, Gavel, Calendar } from 'lucide-react';

interface IntimacaoToolProps {
  people: Person[];
  caseData: CaseData;
  promotorias: PromotoriaDef[];
}

type IntimacaoChannel = 'WHATSAPP' | 'EMAIL' | 'CORREIOS';
type CorreiosDoc = 'AR' | 'ETIQUETA' | 'REMESSA';

const IntimacaoTool: React.FC<IntimacaoToolProps> = ({ people, caseData, promotorias }) => {
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [channel, setChannel] = useState<IntimacaoChannel>('WHATSAPP');
  const [correiosDoc, setCorreiosDoc] = useState<CorreiosDoc>('AR');
  
  // Local state for Process Data (since CaseInfoBar is not present)
  const [localProcesso, setLocalProcesso] = useState(caseData.numeroProcesso || '');
  const [localCargo, setLocalCargo] = useState(caseData.cargo || '');
  
  // Form States
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [cep, setCep] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const selectedPerson = useMemo(() => people.find(p => p.id === selectedPersonId), [people, selectedPersonId]);

  // Derived Promotor Name based on internal schedule
  const currentPromotorName = useMemo(() => {
    if (!localCargo) return '';
    const promotoria = promotorias.find(p => p.label === localCargo);
    if (!promotoria) return '';
    
    const today = new Date().getDate();
    const entry = promotoria.schedule.find(s => today >= s.start && today <= s.end);
    return entry ? entry.name : (promotoria.schedule[0]?.name || '');
  }, [localCargo, promotorias]);

  const currentPromotorGender = useMemo(() => {
    if (!localCargo) return 'M';
    const promotoria = promotorias.find(p => p.label === localCargo);
    if (!promotoria) return 'M';
    const today = new Date().getDate();
    const entry = promotoria.schedule.find(s => today >= s.start && today <= s.end);
    return entry ? entry.gender : (promotoria.schedule[0]?.gender || 'M');
  }, [localCargo, promotorias]);

  // Update form fields when person changes
  useEffect(() => {
    if (selectedPerson) {
      setPhone(selectedPerson.cpf ? '' : ''); // Placeholder logic
      // In a real app, Person would have phone/email/address fields
      setMessage(getTemplateMessage(selectedPerson.nome, 'VITIMA')); 
    }
  }, [selectedPerson, localProcesso, currentPromotorName]);

  const getTemplateMessage = (name: string, type: 'VITIMA' | 'INVESTIGADO') => {
    const saudacao = `Prezado(a) Sr(a). *${name || 'Nome da Parte'}*,`;
    const intro = `Aqui é do Ministério Público do Estado de São Paulo. Entramos em contato referente ao processo nº *${localProcesso || '0000000-00.0000.0.00.0000'}*.`;
    
    if (type === 'VITIMA') {
      return `${saudacao}\n\n${intro}\n\nGostaríamos de informá-lo(a) sobre uma recente decisão referente ao seu caso. De acordo com o art. 28 do CPP, você tem o direito de ser comunicado(a).\n\nPor favor, responda esta mensagem para confirmarmos o recebimento.\n\nAtenciosamente,\n${currentPromotorName}\n${localCargo}`;
    } else {
      return `${saudacao}\n\n${intro}\n\nInformamos que foi proposto Acordo de Não Persecução Penal (ANPP). Caso tenha interesse, favor contatar seu advogado ou a Defensoria Pública.\n\nAtenciosamente,\n${currentPromotorName}\n${localCargo}`;
    }
  };

  const handleWhatsAppSend = () => {
    if (!phone) return alert("Informe um número de telefone.");
    const encodedMsg = encodeURIComponent(message);
    const url = `https://api.whatsapp.com/send/?phone=${phone.replace(/\D/g, '')}&text=${encodedMsg}`;
    window.open(url, '_blank');
  };

  const handleEmailSend = () => {
    if (!email) return alert("Informe um e-mail.");
    const subject = encodeURIComponent(`Intimação - Processo ${localProcesso}`);
    const body = encodeURIComponent(message);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Renderização do AR (Simulado)
  const renderAR = () => (
    <div className="border-2 border-slate-800 p-4 bg-yellow-100 text-black font-sans text-sm h-[300px] w-full relative overflow-hidden shadow-md">
      <div className="absolute top-2 right-2 font-bold border border-black px-2">AR</div>
      <div className="flex justify-between items-start mb-4">
         <div className="w-1/2 border-r border-slate-400 pr-2">
            <p className="font-bold text-[10px] uppercase text-slate-600">Destinatário</p>
            <p className="font-bold text-lg uppercase leading-tight">{selectedPerson?.nome || 'NOME DA PARTE'}</p>
            <p className="mt-1">{address || 'Endereço Completo, Nº'}</p>
            <p>{cep || '00000-000'} - São Paulo/SP</p>
         </div>
         <div className="w-1/2 pl-2">
            <p className="font-bold text-[10px] uppercase text-slate-600">Remetente</p>
            <p className="font-bold">MINISTÉRIO PÚBLICO DO ESTADO DE SÃO PAULO</p>
            <p className="text-xs font-bold mt-1 uppercase">{currentPromotorName || 'Promotor de Justiça'}</p>
            <p className="text-xs">{localCargo || 'Promotoria Criminal'}</p>
            <p className="text-[10px] mt-2 text-slate-600">Rua da Glória, 459 - Liberdade - São Paulo/SP</p>
         </div>
      </div>
      <div className="border-t border-slate-800 pt-2 mt-auto">
         <p className="text-[10px] font-bold uppercase">Declaração de Conteúdo</p>
         <p className="text-xs">Intimação referente aos autos nº <b>{localProcesso || '________________'}</b></p>
      </div>
    </div>
  );

  const inputClass = "w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-pink-600/20 focus:border-pink-600 transition-all placeholder-slate-600";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      {/* 1. Sidebar - Seleção da Parte e Dados do Processo */}
      <div className="w-[340px] bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-2xl">
        
        {/* Configuração do Processo (Já que não temos CaseInfoBar nesta tela) */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 space-y-3">
           <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-pink-600 rounded text-white"><Briefcase size={16}/></div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Dados do Processo</span>
           </div>
           
           <div>
              <div className="relative group">
                 <Gavel size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-pink-500 transition-colors" />
                 <input 
                    type="text" 
                    value={localProcesso} 
                    onChange={(e) => setLocalProcesso(e.target.value)} 
                    placeholder="Nº do Processo"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-pink-500 transition-all placeholder-slate-600"
                 />
              </div>
           </div>

           <div>
              <div className="relative group">
                 <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-pink-500 transition-colors" />
                 <select 
                    value={localCargo} 
                    onChange={(e) => setLocalCargo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-pink-500 transition-all appearance-none cursor-pointer"
                 >
                    <option value="">Selecione o Cargo...</option>
                    {promotorias.map(p => (
                       <option key={p.label} value={p.label}>{p.label}</option>
                    ))}
                 </select>
                 <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none text-[10px]">▼</div>
              </div>
           </div>

           {currentPromotorName && (
              <div className="p-3 bg-pink-900/10 border border-pink-500/20 rounded-lg">
                 <p className="text-[9px] font-bold text-pink-500 uppercase tracking-widest mb-1">Promotor(a) em Exercício</p>
                 <p className="text-xs font-bold text-pink-100">{currentPromotorName}</p>
              </div>
           )}
        </div>

        <div className="p-4 bg-slate-900 border-b border-slate-800">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Partes do Processo</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {people.length === 0 ? (
             <div className="text-center py-8 text-slate-600">
                <User size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">Nenhuma parte cadastrada.</p>
                <p className="text-[10px] mt-1 opacity-60">Adicione partes na tela 'Pesquisa de NI'</p>
             </div>
          ) : (
             people.map(p => (
               <button
                 key={p.id}
                 onClick={() => setSelectedPersonId(p.id)}
                 className={`w-full text-left p-3 rounded-xl border transition-all group ${selectedPersonId === p.id ? 'bg-pink-600 text-white border-pink-500 shadow-lg shadow-pink-900/20' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:border-slate-600'}`}
               >
                 <p className={`font-bold text-sm truncate ${selectedPersonId === p.id ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{p.nome}</p>
                 <div className="flex justify-between mt-1">
                    <p className={`text-[10px] font-mono ${selectedPersonId === p.id ? 'text-pink-200' : 'opacity-60'}`}>Fls. {p.folha || '-'}</p>
                    <p className={`text-[10px] font-mono ${selectedPersonId === p.id ? 'text-pink-200' : 'opacity-60'}`}>{p.cpf || 'CPF N/D'}</p>
                 </div>
               </button>
             ))
          )}
        </div>
      </div>

      {/* 2. Área Principal */}
      <div className="flex-1 flex flex-col bg-slate-100 relative">
        {!selectedPerson ? (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-6">
                 <Send size={32} className="text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-600">Nenhum Destinatário Selecionado</h3>
              <p className="text-sm">Selecione uma pessoa na lista ao lado para iniciar a intimação.</p>
           </div>
        ) : (
           <>
             {/* Header da Parte */}
             <div className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shadow-sm sticky top-0 z-10">
                <div>
                   <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{selectedPerson.nome}</h2>
                   <div className="flex gap-4 mt-1">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1"><Gavel size={12}/> {localProcesso || 'Sem Processo'}</span>
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1"><User size={12}/> {currentPromotorName ? currentPromotorName.split(' ')[0] : '...'}</span>
                   </div>
                </div>
                
                {/* Seletor de Canal */}
                <div className="flex bg-slate-100 p-1.5 rounded-xl shadow-inner">
                   <button onClick={() => setChannel('WHATSAPP')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${channel === 'WHATSAPP' ? 'bg-white shadow-sm text-green-600 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}>
                      <MessageCircle size={16} /> WhatsApp
                   </button>
                   <button onClick={() => setChannel('EMAIL')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${channel === 'EMAIL' ? 'bg-white shadow-sm text-blue-600 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}>
                      <Mail size={16} /> E-mail
                   </button>
                   <button onClick={() => setChannel('CORREIOS')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${channel === 'CORREIOS' ? 'bg-white shadow-sm text-yellow-600 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}>
                      <Truck size={16} /> Correios
                   </button>
                </div>
             </div>

             {/* Conteúdo do Canal */}
             <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-slate-50/50">
                
                {/* --- WHATSAPP --- */}
                {channel === 'WHATSAPP' && (
                   <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                      <div className="bg-white border border-green-100 p-6 rounded-3xl shadow-sm relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-2 h-full bg-green-500"></div>
                         <label className={labelClass}>Destinatário (Celular)</label>
                         <input 
                           type="text" 
                           value={phone}
                           onChange={(e) => setPhone(e.target.value)}
                           placeholder="(11) 99999-9999"
                           className="w-full bg-green-50/30 border border-green-200 rounded-xl p-4 text-xl font-mono text-slate-800 outline-none focus:ring-2 focus:ring-green-400 transition-all placeholder-green-800/20"
                         />
                      </div>

                      <div className="space-y-3">
                         <div className="flex justify-between items-end px-1">
                            <label className={labelClass}>Mensagem Padronizada</label>
                            <div className="flex gap-2">
                               <button onClick={() => setMessage(getTemplateMessage(selectedPerson.nome, 'VITIMA'))} className="text-[10px] bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 font-bold text-slate-600 transition-all uppercase tracking-wider">Vítima</button>
                               <button onClick={() => setMessage(getTemplateMessage(selectedPerson.nome, 'INVESTIGADO'))} className="text-[10px] bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 font-bold text-slate-600 transition-all uppercase tracking-wider">Investigado</button>
                            </div>
                         </div>
                         <textarea 
                           value={message}
                           onChange={(e) => setMessage(e.target.value)}
                           className="w-full h-64 bg-white border border-slate-200 rounded-3xl p-6 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-green-400 resize-none shadow-sm leading-relaxed"
                         />
                      </div>

                      <button onClick={handleWhatsAppSend} className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-green-600/20 flex items-center justify-center gap-3 transition-all transform active:scale-[0.98]">
                         <MessageCircle size={22} /> Enviar via WhatsApp Web
                      </button>
                   </div>
                )}

                {/* --- EMAIL --- */}
                {channel === 'EMAIL' && (
                   <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                      <div className="bg-white border border-blue-100 p-6 rounded-3xl shadow-sm relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                         <label className={labelClass}>E-mail do Destinatário</label>
                         <input 
                           type="email" 
                           value={email}
                           onChange={(e) => setEmail(e.target.value)}
                           placeholder="exemplo@email.com"
                           className="w-full bg-blue-50/30 border border-blue-200 rounded-xl p-4 text-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-400 transition-all placeholder-blue-800/20"
                         />
                      </div>

                      <div className="space-y-3">
                         <label className={labelClass}>Texto do E-mail</label>
                         <textarea 
                           value={message}
                           onChange={(e) => setMessage(e.target.value)}
                           className="w-full h-80 bg-white border border-slate-200 rounded-3xl p-6 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 resize-none shadow-sm leading-relaxed"
                         />
                      </div>

                      <div className="flex gap-4">
                         <button onClick={() => handleCopy(message)} className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 py-4 rounded-2xl font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm">
                            {copied ? <CheckCircle size={20} className="text-green-500"/> : <Copy size={20} />} {copied ? 'Copiado' : 'Copiar Texto'}
                         </button>
                         <button onClick={handleEmailSend} className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 transition-all transform active:scale-[0.98]">
                            <Mail size={20} /> Abrir Cliente de E-mail
                         </button>
                      </div>
                   </div>
                )}

                {/* --- CORREIOS --- */}
                {channel === 'CORREIOS' && (
                   <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8 animate-in slide-in-from-bottom-4 duration-500">
                      {/* Formulario */}
                      <div className="w-full lg:w-1/3 space-y-4">
                         <div className="p-6 bg-white border border-yellow-200 rounded-3xl space-y-5 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400"></div>
                            <div>
                               <label className={labelClass}>Endereço Completo</label>
                               <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm outline-none focus:border-yellow-400 transition-colors placeholder-yellow-700/30 font-medium text-slate-700" placeholder="Rua, Nº, Bairro" />
                            </div>
                            <div>
                               <label className={labelClass}>CEP</label>
                               <input value={cep} onChange={(e) => setCep(e.target.value)} className="w-full bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm outline-none focus:border-yellow-400 transition-colors placeholder-yellow-700/30 font-medium text-slate-700" placeholder="00000-000" />
                            </div>
                         </div>

                         <div className="space-y-3">
                            <button onClick={() => setCorreiosDoc('AR')} className={`w-full text-left px-5 py-4 rounded-2xl border font-bold text-xs uppercase flex justify-between items-center transition-all ${correiosDoc === 'AR' ? 'bg-slate-800 text-white border-slate-800 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                               Aviso de Recebimento (AR) {correiosDoc === 'AR' && <CheckCircle size={18} className="text-yellow-400"/>}
                            </button>
                            <button onClick={() => setCorreiosDoc('ETIQUETA')} className={`w-full text-left px-5 py-4 rounded-2xl border font-bold text-xs uppercase flex justify-between items-center transition-all ${correiosDoc === 'ETIQUETA' ? 'bg-slate-800 text-white border-slate-800 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                               Etiqueta de Envio {correiosDoc === 'ETIQUETA' && <CheckCircle size={18} className="text-yellow-400"/>}
                            </button>
                            <button onClick={() => setCorreiosDoc('REMESSA')} className={`w-full text-left px-5 py-4 rounded-2xl border font-bold text-xs uppercase flex justify-between items-center transition-all ${correiosDoc === 'REMESSA' ? 'bg-slate-800 text-white border-slate-800 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                               Folha de Remessa {correiosDoc === 'REMESSA' && <CheckCircle size={18} className="text-yellow-400"/>}
                            </button>
                         </div>
                      </div>

                      {/* Preview */}
                      <div className="flex-1 bg-white shadow-2xl border border-slate-200 p-12 rounded-sm min-h-[600px] relative flex flex-col items-center justify-center">
                         <div className="print-area w-full max-w-[600px]">
                            {correiosDoc === 'AR' && renderAR()}
                            {correiosDoc === 'ETIQUETA' && (
                               <div className="border-4 border-dashed border-slate-200 p-12 text-center rounded-3xl bg-slate-50">
                                  <MapPin size={48} className="mx-auto text-slate-300 mb-6"/>
                                  <p className="font-black text-2xl uppercase text-slate-800 mb-2">{selectedPerson.nome}</p>
                                  <p className="text-lg text-slate-500 font-medium">{address}</p>
                                  <div className="mt-6 inline-block bg-slate-800 text-white px-6 py-2 rounded-lg font-mono text-xl tracking-widest">{cep}</div>
                               </div>
                            )}
                            {correiosDoc === 'REMESSA' && (
                               <div className="space-y-6 text-left w-full font-serif">
                                  <h3 className="text-center font-bold underline mb-8 text-lg">RELAÇÃO DE REMESSA POSTAL</h3>
                                  <div className="flex justify-between text-xs mb-4">
                                     <span><b>Unidade:</b> {localCargo}</span>
                                     <span><b>Data:</b> {new Date().toLocaleDateString()}</span>
                                  </div>
                                  <table className="w-full border-collapse border border-black text-xs">
                                     <thead className="bg-slate-100">
                                        <tr>
                                           <th className="border border-black p-2 text-left">Objeto</th>
                                           <th className="border border-black p-2 text-left">Destinatário</th>
                                           <th className="border border-black p-2 text-center">CEP</th>
                                           <th className="border border-black p-2 text-center">Registro</th>
                                        </tr>
                                     </thead>
                                     <tbody>
                                        <tr>
                                           <td className="border border-black p-2">Carta Registrada c/ AR</td>
                                           <td className="border border-black p-2"><b>{selectedPerson.nome}</b><br/>{address}</td>
                                           <td className="border border-black p-2 text-center">{cep}</td>
                                           <td className="border border-black p-2"></td>
                                        </tr>
                                     </tbody>
                                  </table>
                                  <div className="mt-12 pt-4 border-t border-black w-1/2 mx-auto text-center text-xs">
                                     Assinatura do Responsável
                                  </div>
                               </div>
                            )}
                         </div>

                         <div className="absolute bottom-6 right-6 flex gap-2 no-print">
                            <button onClick={handlePrint} className="bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold text-xs uppercase flex items-center gap-3 shadow-xl transition-all transform active:scale-95">
                               <Printer size={18} /> Imprimir Documento
                            </button>
                         </div>
                      </div>
                   </div>
                )}

             </div>
           </>
        )}
      </div>
      
      {/* Estilo para impressão para ocultar a UI */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: fixed; left: 0; top: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: start; }
          .no-print { display: none; }
        }
      `}</style>
    </div>
  );
};

export default IntimacaoTool;