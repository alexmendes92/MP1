import React, { useState } from 'react';
import { FileSearch, Upload, Send, FileText, Loader2, Sparkles, Copy, CheckCircle, Paperclip, X, Trash2, ArrowRight, PhoneOutgoing, UserCircle, MessageSquare, FolderOpen } from 'lucide-react';
import { fileToBase64Safe } from '../utils/pdfHelper';

const NoticiaFatoProcedureTool: React.FC = () => {
  // Input States
  const [procedureFiles, setProcedureFiles] = useState<File[]>([]);
  const [contactFiles, setContactFiles] = useState<File[]>([]);
  const [victimFiles, setVictimFiles] = useState<File[]>([]);
  const [additionalText, setAdditionalText] = useState('');
  const [instruction, setInstruction] = useState('');
  
  // Drag States
  const [isDraggingProcedure, setIsDraggingProcedure] = useState(false);
  const [isDraggingContact, setIsDraggingContact] = useState(false);
  const [isDraggingVictim, setIsDraggingVictim] = useState(false);

  // Output State
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Refinement State
  const [chatInput, setChatInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // Helper to handle files
  const processFiles = (newFiles: File[], target: 'PROCEDURE' | 'CONTACT' | 'VICTIM') => {
    if (target === 'PROCEDURE') {
        setProcedureFiles(prev => [...prev, ...newFiles]);
    } else if (target === 'CONTACT') {
      setContactFiles(prev => [...prev, ...newFiles]);
    } else {
      setVictimFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'PROCEDURE' | 'CONTACT' | 'VICTIM') => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files), target);
    }
  };

  // Drag Handlers for Procedure
  const handleDragOverProcedure = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingProcedure(true);
  };
  const handleDragLeaveProcedure = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingProcedure(false);
  };
  const handleDropProcedure = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingProcedure(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files), 'PROCEDURE');
    }
  };

  // Drag Handlers for Contact
  const handleDragOverContact = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingContact(true);
  };
  const handleDragLeaveContact = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingContact(false);
  };
  const handleDropContact = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingContact(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files), 'CONTACT');
    }
  };

  // Drag Handlers for Victim Data
  const handleDragOverVictim = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingVictim(true);
  };
  const handleDragLeaveVictim = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingVictim(false);
  };
  const handleDropVictim = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingVictim(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files), 'VICTIM');
    }
  };

  const removeFile = (index: number, target: 'PROCEDURE' | 'CONTACT' | 'VICTIM') => {
    if (target === 'PROCEDURE') {
        setProcedureFiles(prev => prev.filter((_, i) => i !== index));
    } else if (target === 'CONTACT') {
      setContactFiles(prev => prev.filter((_, i) => i !== index));
    } else {
      setVictimFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleGenerate = async (refinementInstruction?: string) => {
    const isRefinement = !!refinementInstruction;

    if (!isRefinement) {
        if (procedureFiles.length === 0 && contactFiles.length === 0 && victimFiles.length === 0 && !additionalText.trim()) {
            alert("Por favor, forneça o procedimento inicial ou outros documentos para análise.");
            return;
        }
        setIsGenerating(true);
        setGeneratedText('');
    } else {
        setIsRefining(true);
    }

    try {
      const filesPayload: Array<{ mimeType: string; data: string; name: string }> = [];

      for (const file of procedureFiles) {
        const { data, mimeType } = await fileToBase64Safe(file);
        filesPayload.push({ data, mimeType, name: `[PECA_INICIAL] ${file.name}` });
      }

      for (const file of contactFiles) {
        const { data, mimeType } = await fileToBase64Safe(file);
        filesPayload.push({ data, mimeType, name: `[CONTATO] ${file.name}` });
      }

      for (const file of victimFiles) {
        const { data, mimeType } = await fileToBase64Safe(file);
        filesPayload.push({ data, mimeType, name: `[VITIMA] ${file.name}` });
      }

      let prompt = `
      Você é um Oficial de Promotoria do Ministério Público.
      
      SUA TAREFA:
      ${isRefinement ? 'Revisar e ajustar o relatório/certidão procedural.' : 'Redigir uma CERTIDÃO ou RELATÓRIO DE DILIGÊNCIA para uma Notícia de Fato.'}
      
      OBJETIVO:
      Documentar o resultado das tentativas de contato com as partes e resumir as informações colhidas (ou a falta delas) para fundamentar a próxima decisão do promotor (arquivamento, instauração de inquérito, etc).
      
      ESTRUTURA DA ANÁLISE:
      1. ANALISE o "PROCEDIMENTO / PEÇA INICIAL" para entender do que se trata o caso (fato, partes, crime em tese).
      2. ANALISE os arquivos de "TENTATIVA DE CONTATO" para certificar se houve contato, se o número existe, se houve resposta.
      3. ANALISE os arquivos de "DADOS DA VÍTIMA" para extrair o relato, novas provas ou manifestação de vontade (representação/renúncia).
      4. Use o "CONTEXTO ADICIONAL" para detalhes manuais.
      
      INSTRUÇÃO ESPECÍFICA:
      "${instruction || "Relate formalmente as diligências e sugira o encaminhamento lógico com base nos documentos."}"
      
      CONTEXTO ADICIONAL (TEXTO):
      "${additionalText}"
      `;

      if (isRefinement) {
          prompt += `
          ---------------------------------------------------
          CONTEXTO DE REVISÃO:
          
          DOCUMENTO ATUAL:
          ${generatedText}
          
          PEDIDO DE CORREÇÃO:
          "${refinementInstruction}"
          
          Retorne o documento corrigido mantendo o tom formal.
          ---------------------------------------------------
          `;
      } else {
          prompt += `
          FORMATO DE SAÍDA:
          - Título: CERTIDÃO ou RELATÓRIO DE DILIGÊNCIA.
          - Texto formal, impessoal, detalhando datas e meios de contato.
          - Breve resumo do fato (extraído da peça inicial).
          - Conclusão: "Diante do exposto..." (resumindo a situação).
          `;
      }

      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: filesPayload,
          prompt
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Erro HTTP ${res.status}`);
      }

      const resData = await res.json();
      setGeneratedText(resData.text || "Erro ao gerar documento.");
      if (isRefinement) setChatInput('');

    } catch (error) {
      console.error(error);
      alert("Erro ao processar. Verifique os arquivos ou sua conexão.");
    } finally {
      setIsGenerating(false);
      setIsRefining(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const FileList = ({ files, target }: { files: File[], target: 'PROCEDURE' | 'CONTACT' | 'VICTIM' }) => (
    <div className="mt-2 space-y-1">
        {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-slate-800 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2 overflow-hidden">
                    <Paperclip size={14} className="text-orange-500" />
                    <span className="text-xs font-bold text-slate-300 truncate">{f.name}</span>
                </div>
                <button onClick={() => removeFile(i, target)} className="p-1 hover:text-red-500"><Trash2 size={14}/></button>
            </div>
        ))}
    </div>
  );

  const inputClass = "w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all placeholder-slate-600 text-slate-100";
  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      {/* Sidebar - Inputs */}
      <div className="w-full md:w-[480px] bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6 shadow-2xl z-10 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-600 rounded-lg text-white">
            <FileSearch size={20} />
          </div>
          <div>
            <h2 className="font-bold uppercase tracking-tight text-white">Procedimento N.F.</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Relatório de Diligências</p>
          </div>
        </div>

        <div className="space-y-6 flex-1">
            
            {/* Input 1: Procedure */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className={labelClass}>
                        1. Procedimento / Peça Inicial
                    </label>
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">Contexto</span>
                </div>
                <label 
                    onDragOver={handleDragOverProcedure}
                    onDragLeave={handleDragLeaveProcedure}
                    onDrop={handleDropProcedure}
                    className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-xl cursor-pointer transition-all group ${isDraggingProcedure ? 'border-orange-500 bg-orange-900/20' : 'border-slate-700 bg-slate-950 hover:bg-slate-800 hover:border-orange-500/50'}`}
                >
                    <div className="flex flex-col items-center justify-center pointer-events-none">
                        <FolderOpen size={18} className={`mb-1 transition-colors ${isDraggingProcedure ? 'text-orange-400' : 'text-slate-500 group-hover:text-orange-500'}`} />
                        <p className={`text-[10px] font-bold ${isDraggingProcedure ? 'text-orange-400' : 'text-slate-500 group-hover:text-orange-400'}`}>
                            {isDraggingProcedure ? 'Solte para anexar' : 'Anexar PDF/IMG'}
                        </p>
                    </div>
                    <input type="file" multiple accept="application/pdf,image/*" className="hidden" onChange={(e) => handleFileChange(e, 'PROCEDURE')} />
                </label>
                {procedureFiles.length > 0 && <FileList files={procedureFiles} target="PROCEDURE" />}
            </div>

            {/* Input 2: Contacts */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className={labelClass}>
                        2. Tentativas de Contato
                    </label>
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">Prints/Emails</span>
                </div>
                <label 
                    onDragOver={handleDragOverContact}
                    onDragLeave={handleDragLeaveContact}
                    onDrop={handleDropContact}
                    className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-xl cursor-pointer transition-all group ${isDraggingContact ? 'border-green-500 bg-green-900/20' : 'border-slate-700 bg-slate-950 hover:bg-slate-800 hover:border-green-500/50'}`}
                >
                    <div className="flex flex-col items-center justify-center pointer-events-none">
                        <PhoneOutgoing size={18} className={`mb-1 transition-colors ${isDraggingContact ? 'text-green-400' : 'text-slate-500 group-hover:text-green-500'}`} />
                        <p className={`text-[10px] font-bold ${isDraggingContact ? 'text-green-400' : 'text-slate-500 group-hover:text-green-400'}`}>
                            {isDraggingContact ? 'Solte para anexar' : 'Anexar Comprovantes'}
                        </p>
                    </div>
                    <input type="file" multiple accept="application/pdf,image/*" className="hidden" onChange={(e) => handleFileChange(e, 'CONTACT')} />
                </label>
                {contactFiles.length > 0 && <FileList files={contactFiles} target="CONTACT" />}
            </div>

            {/* Input 3: Victim */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className={labelClass}>
                        3. Dados da Vítima (Opcional)
                    </label>
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">Declarações</span>
                </div>
                <label 
                    onDragOver={handleDragOverVictim}
                    onDragLeave={handleDragLeaveVictim}
                    onDrop={handleDropVictim}
                    className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-xl cursor-pointer transition-all group ${isDraggingVictim ? 'border-blue-500 bg-blue-900/20' : 'border-slate-700 bg-slate-950 hover:bg-slate-800 hover:border-blue-500/50'}`}
                >
                    <div className="flex flex-col items-center justify-center pointer-events-none">
                        <UserCircle size={18} className={`mb-1 transition-colors ${isDraggingVictim ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-500'}`} />
                        <p className={`text-[10px] font-bold ${isDraggingVictim ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'}`}>
                            {isDraggingVictim ? 'Solte para anexar' : 'Anexar Docs'}
                        </p>
                    </div>
                    <input type="file" multiple accept="application/pdf,image/*" className="hidden" onChange={(e) => handleFileChange(e, 'VICTIM')} />
                </label>
                {victimFiles.length > 0 && <FileList files={victimFiles} target="VICTIM" />}
            </div>

            {/* Text Inputs */}
            <div className="space-y-2">
                <label className={labelClass}>
                    4. Contexto Adicional
                </label>
                <textarea
                    value={additionalText}
                    onChange={(e) => setAdditionalText(e.target.value)}
                    placeholder="Ex: Consegui contato telefônico com a mãe da vítima que informou novo endereço..."
                    className={`${inputClass} h-20 resize-none`}
                />
            </div>
            
             <div className="space-y-2">
                <label className={labelClass}>
                    5. Instrução Especial
                </label>
                <textarea
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="Ex: Sugira o arquivamento por falta de interesse da vítima..."
                    className={`${inputClass} h-16 resize-none`}
                />
            </div>

            <button 
                onClick={() => handleGenerate()}
                disabled={isGenerating}
                className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white py-3.5 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-orange-900/20 transition-all flex items-center justify-center gap-2 mt-2"
            >
                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {isGenerating ? 'Analisando Diligências...' : 'Gerar Relatório'}
            </button>
        </div>
      </div>

      {/* Main Content - Preview & Refine */}
      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col items-center bg-slate-950 relative">
        
        {!generatedText && !isGenerating && (
             <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-60">
                <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center shadow-xl border border-slate-800">
                    <FileSearch size={40} className="text-orange-600" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-300">Certidão de Diligências</h3>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">Documente suas tentativas de contato e análise de procedimentos NF com auxílio da IA.</p>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-slate-600 mt-4">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 bg-slate-700 rounded-full"></div> Anexar Procedimento</div>
                    <ArrowRight size={12} />
                    <div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div> Anexar Prints</div>
                    <ArrowRight size={12} />
                    <div className="flex items-center gap-2"><div className="w-2 h-2 bg-orange-500 rounded-full"></div> Relatório Pronto</div>
                </div>
             </div>
        )}

        {isGenerating && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 size={48} className="text-orange-500 animate-spin" />
                <p className="text-sm font-bold text-orange-500 animate-pulse">Cruzando dados do procedimento e contatos...</p>
            </div>
        )}

        {generatedText && (
            <div className="w-full max-w-4xl flex flex-col gap-6 animate-in slide-in-from-bottom duration-500 h-full">
                
                {/* Header Actions */}
                <div className="flex justify-between items-center bg-slate-900/90 backdrop-blur border border-slate-800 p-4 rounded-2xl sticky top-0 z-20 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Relatório Gerado</span>
                    </div>
                    <button 
                        onClick={handleCopy}
                        className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${copied ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                        {copied ? <CheckCircle size={14}/> : <Copy size={14}/>} {copied ? 'Copiado!' : 'Copiar Texto'}
                    </button>
                </div>

                {/* Paper Preview */}
                <div className="bg-white text-black p-16 shadow-2xl rounded-sm min-h-[600px] font-serif text-[1.1rem] leading-relaxed whitespace-pre-wrap">
                    {generatedText}
                </div>

                {/* Refinement Chat Interface */}
                <div className="mt-auto bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <MessageSquare size={16} className="text-orange-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Revisão e Ajuste</span>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !isRefining && handleGenerate(chatInput)}
                            placeholder="Ex: 'Adicione que o telefone da vítima não existe', 'Cite a folha 15 do PDF'..."
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all placeholder-slate-600"
                        />
                        <button 
                            onClick={() => handleGenerate(chatInput)}
                            disabled={isRefining || !chatInput.trim()}
                            className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 text-white px-4 rounded-xl transition-all"
                        >
                            {isRefining ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default NoticiaFatoProcedureTool;